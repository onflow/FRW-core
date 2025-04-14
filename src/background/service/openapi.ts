import * as fcl from '@onflow/fcl';
import type { Account as FclAccount } from '@onflow/typedefs';
import dayjs from 'dayjs';
import { initializeApp, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken,
  setPersistence,
  indexedDBLocalPersistence,
  signInAnonymously,
  onAuthStateChanged,
  type Unsubscribe,
  type User,
} from 'firebase/auth/web-extension';
import { getInstallations, getId } from 'firebase/installations';
import type { TokenInfo } from 'flow-native-token-registry';
import log from 'loglevel';

import { createPersistStore, findKeyAndInfo } from '@/background/utils';
import {
  getValidData,
  registerRefreshListener,
  setCachedData,
} from '@/background/utils/data-cache';
import { getFirbaseConfig, getFirbaseFunctionUrl } from '@/background/utils/firebaseConfig';
import fetchConfig from '@/background/utils/remoteConfig';
import { storage } from '@/background/webapi';
import type { ExtendedTokenInfo, BalanceMap } from '@/shared/types/coin-types';
import { type FeatureFlagKey, type FeatureFlags } from '@/shared/types/feature-types';
import { CURRENT_ID_KEY } from '@/shared/types/keyring-types';
import { type NFTCollections } from '@/shared/types/nft-types';
import {
  type LoggedInAccountWithIndex,
  type LoggedInAccount,
  type FlowAddress,
  type PublicKeyAccount,
  type ActiveAccountType,
  type Currency,
} from '@/shared/types/wallet-types';
import { isValidFlowAddress, isValidEthereumAddress } from '@/shared/utils/address';
import { getStringFromHashAlgo, getStringFromSignAlgo } from '@/shared/utils/algo';
import { cadenceScriptsKey, cadenceScriptsRefreshRegex } from '@/shared/utils/cache-data-keys';
import { getPeriodFrequency } from '@/shared/utils/getPeriodFrequency';
import { type NetworkScripts } from '@/shared/utils/script-types';
import { INITIAL_OPENAPI_URL, WEB_NEXT_URL } from 'consts';

import packageJson from '../../../package.json';
import {
  type AccountKeyRequest,
  type CheckResponse,
  type SignInResponse,
  type UserInfoResponse,
  type TokenModel,
  type NFTModel_depreciated,
  type StorageInfo,
  type NewsItem,
  type NewsConditionType,
  Period,
  PriceProvider,
  type AccountBalanceInfo,
  type Contact,
  type NFTModelV2,
  type DeviceInfoRequest,
  MAINNET_CHAIN_ID,
} from '../../shared/types/network-types';

import {
  userWalletService,
  coinListService,
  addressBookService,
  userInfoService,
  transactionService,
  nftService,
  googleSafeHostService,
  mixpanelTrack,
} from './index';
const { version } = packageJson;

// New type definitions for API response for /v4/cadence/tokens/ft/{address}
interface FlowTokenResponse {
  name: string;
  symbol: string;
  description: string;
  logos: {
    items: Array<{
      file: {
        url: string;
      };
      mediaType: string;
    }>;
  };
  socials: {
    x?: {
      url: string;
    };
  };
  balance: string;
  contractAddress: string;
  contractName: string;
  storagePath: {
    domain: string;
    identifier: string;
  };
  receiverPath: {
    domain: string;
    identifier: string;
  };
  identifier: string;
  isVerified: boolean;
  priceInUSD: string;
  balanceInUSD: string;
  priceInFLOW: string;
  balanceInFLOW: string;
  priceInCurrency: string;
  balanceInCurrency: string;
  currency: string;
  logoURI: string;
}

// New type definitions for API response for /v4/evm/tokens/ft/{address}
interface EvmTokenResponse {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  flowIdentifier: string;
  priceInUSD: string;
  balanceInUSD: string;
  priceInFLOW: string;
  balanceInFLOW: string;
  displayBalance: string;
  rawBalance: string;
  currency: string;
  priceInCurrency: string;
  balanceInCurrency: string;
}

interface EvmApiResponse {
  data: EvmTokenResponse[];
}

interface CurrencyResponse {
  data: {
    currencies: Currency[];
  };
}

type FlowApiResponse = { data: { result: FlowTokenResponse[]; storage: StorageResponse } };

type StorageResponse = {
  storageUsedInMB: string;
  storageAvailableInMB: string;
  storageCapacityInMB: string;
  lockedFLOWforStorage: string;
  availableBalanceToUse: string;
};

// New type definitions for API response for /v1/account/transaction

type TransactionResponseItem = {
  additional_message: string;
  status: string;
  error: boolean;
  token: string;
  title: string;
  time: string;
  receiver: string;
  sender: string;
  amount: string;
  type: number;
  transfer_type: number;
  image: string;
  txid: string;
};
export type FlowTransactionResponse = {
  total: number;
  transactions: TransactionResponseItem[];
};

type EvmTransactionResponse = {
  trxs: TransactionResponseItem[];
  next_page_params?: {
    items_count: number;
    value: '0';
  };
};

export interface OpenApiConfigValue {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'get' | 'post' | 'put' | 'delete';
  params?: string[];
}

export interface OpenApiStore {
  host: string;
  config: Record<string, OpenApiConfigValue>;
}

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = getFirbaseConfig();
const app = initializeApp(firebaseConfig, process.env.NODE_ENV);
const auth = getAuth(app);
// const remoteConfig = getRemoteConfig(app);

const remoteFetch = fetchConfig;

const waitForAuthInit = async () => {
  let unsubscribe: Unsubscribe;
  await new Promise<void>((resolve) => {
    unsubscribe = auth.onAuthStateChanged((_user) => resolve());
  });
  (await unsubscribe!)();
};

onAuthStateChanged(auth, (user: User | null) => {
  if (user) {
    // User is signed in, see docs for a list of available properties
    // https://firebase.google.com/docs/reference/js/firebase.User
    // const uid = user.uid;
    if (user.isAnonymous) {
      console.log('User is anonymous');
    } else {
      if (mixpanelTrack) {
        mixpanelTrack.identify(user.uid, user.displayName ?? user.uid);
      }
      console.log('User is signed in');
    }
  } else {
    // User is signed out
    console.log('User is signed out');
  }
  // note fcl setup is async
  userWalletService.setupFcl();
});

const dataConfig: Record<string, OpenApiConfigValue> = {
  check_username: {
    path: '/v1/user/check',
    method: 'get',
    params: ['username'],
  },
  search_user: {
    path: '/v1/user/search',
    method: 'get',
    params: ['keyword'],
  },
  register: {
    path: '/v1/register',
    method: 'post',
    params: ['username', 'account_key'],
  },
  create_flow_address: {
    path: '/v1/user/address',
    method: 'post',
    params: [],
  },
  create_flow_address_v2: {
    path: '/v2/user/address',
    method: 'post',
    params: [],
  },
  loginv3: {
    path: '/v3/login',
    method: 'post',
    params: ['signature', 'account_key', 'device_info'],
  },
  importKey: {
    path: '/v3/import',
    method: 'post',
    params: ['username', 'account_key', 'device_info', 'backup_info', 'address'],
  },
  coin_map: {
    path: '/v1/coin/map',
    method: 'get',
    params: [],
  },
  user_info: {
    path: '/v1/user/info',
    method: 'get',
    params: [],
  },
  fetch_address_book: {
    path: '/v1/addressbook/contact',
    method: 'get',
    params: [],
  },
  add_address_book: {
    path: '/v1/addressbook/contact',
    method: 'put',
    params: ['contact_name', 'username', 'address', 'domain', 'domain_type'],
  },
  edit_address_book: {
    path: '/v1/addressbook/contact',
    method: 'post',
    params: ['id', 'contact_name', 'address', 'domain', 'domain_type'],
  },
  delete_address_book: {
    path: '/v1/addressbook/contact',
    method: 'delete',
    params: ['id'],
  },
  add_external_address_book: {
    path: '/v1/addressbook/external',
    method: 'put',
    params: ['contact_name', 'address', 'domain', 'domain_type'],
  },
  account_transaction: {
    path: '/v1/account/transaction',
    method: 'get',
    params: ['address', 'limit', 'offset'],
  },
  validate_recaptcha: {
    path: '/v1/user/recaptcha',
    method: 'get',
    params: ['token'],
  },
  crypto_map: {
    path: '/v1/crypto/map',
    method: 'get',
    params: ['provider', 'pair'],
  },
  crypto_flow: {
    path: '/v1/crypto/summary',
    method: 'get',
    params: ['provider', 'pair'],
  },
  crypto_history: {
    path: '/v1/crypto/history',
    method: 'get',
    params: ['provider', 'pair', 'after', 'history'],
  },
  account_query: {
    path: '/v1/account/query',
    method: 'post',
    params: ['query', 'operation_name'],
  },
  profile_preference: {
    path: '/v1/profile/preference',
    method: 'post',
    params: ['private'],
  },
  profile_update: {
    path: '/v1/profile',
    method: 'post',
    params: ['nickname', 'avatar'],
  },
  get_transfers: {
    path: '/api/v1/account/transfers',
    method: 'get',
    params: ['address', 'after', 'limit'],
  },
  manual_address: {
    path: '/v1/user/manualaddress',
    method: 'get',
    params: [],
  },
  device_list: {
    path: '/v1/user/device',
    method: 'get',
    params: [],
  },
  key_list: {
    path: '/v1/user/keys',
    method: 'get',
    params: [],
  },
  add_device: {
    path: '/v1/user/device',
    method: 'put',
    params: ['device_info', 'wallet_id', 'wallettest_id '],
  },
  add_device_v3: {
    path: '/v3/user/device',
    method: 'put',
    params: ['device_info', 'wallet_id', 'wallettest_id '],
  },
  get_location: {
    path: '/v1/user/location',
    method: 'get',
    params: [],
  },
  sync_device: {
    path: '/v3/sync',
    method: 'post',
    params: ['account_key', 'device_info '],
  },
  check_import: {
    path: '/v3/checkimport',
    method: 'get',
    params: ['key'],
  },
  get_version: {
    path: '/version',
    method: 'get',
    params: [],
  },
  get_ft_list: {
    path: '/api/v3/fts',
    method: 'get',
    params: ['network', 'chain_type'],
  },
  get_nft_list: {
    path: '/api/v3/nfts',
    method: 'get',
    params: ['network', 'chain_type'],
  },
};

const defaultFlowToken = {
  name: 'Flow',
  address: '0x4445e7ad11568276',
  contractName: 'FlowToken',
  path: {
    balance: '/public/flowTokenBalance',
    receiver: '/public/flowTokenReceiver',
    vault: '/storage/flowTokenVault',
  },
  logoURI:
    'https://cdn.jsdelivr.net/gh/FlowFans/flow-token-list@main/token-registry/A.1654653399040a61.FlowToken/logo.svg',
  // On Evm networks we can use up to 18 decimals
  decimals: 18,
  symbol: 'flow',
};

const recordFetch = async (response, responseData, ...args: Parameters<typeof fetch>) => {
  try {
    // Extract URL parameters from the first argument if it's a URL with query params
    const url = args[0].toString();
    const urlObj = new URL(url);
    const urlParams = Object.fromEntries(urlObj.searchParams.entries());

    // Send message to UI with request/response details

    const messageData = {
      method: args[1]?.method,
      url: args[0],
      params: urlParams, // URL parameters extracted from the URL
      requestInit: args[1],
      responseData, // Raw response from fetch
      timestamp: Date.now(),
      status: response.status,
      statusText: response.statusText,
      // Note: functionParams and functionResponse will be added by the calling function
    };
    console.log('fetchCallRecorder - response & messageData', response, messageData);

    chrome.runtime.sendMessage({
      type: 'API_CALL_RECORDED',
      data: messageData,
    });
  } catch (err) {
    console.error('Error sending message to UI:', err);
  }
  return response;
};

class OpenApiService {
  store: OpenApiStore = {
    host: INITIAL_OPENAPI_URL,
    config: dataConfig,
  };

  private supportedCurrenciesCache: Currency[] | null = null;

  getNetwork = () => {
    return userWalletService.getNetwork();
  };

  init = async () => {
    await userWalletService.setupFcl();
  };

  checkAuthStatus = async () => {
    await waitForAuthInit();
    const app = getApp(process.env.NODE_ENV!);
    const user = await getAuth(app).currentUser;
    if (user && user.isAnonymous) {
      userWalletService.loginWithKeyring();
    }
  };

  sendRequest = async (
    method = 'GET',
    url = '',
    params = {},
    data = {},
    host = this.store.host
  ) => {
    // Default options are marked with *
    let requestUrl = '';

    if (Object.keys(params).length) {
      requestUrl = host + url + '?' + new URLSearchParams(params).toString();
    } else {
      requestUrl = host + url;
    }
    const network = await userWalletService.getNetwork();

    const app = getApp(process.env.NODE_ENV!);
    const user = await getAuth(app).currentUser;
    const init = {
      method,
      headers: {
        Network: network,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };

    if (method.toUpperCase() !== 'GET') {
      init['body'] = JSON.stringify(data);
    }

    // Wait for firebase auth to complete
    await waitForAuthInit();

    if (user !== null) {
      const idToken = await user.getIdToken();
      init.headers['Authorization'] = 'Bearer ' + idToken;
    } else {
      // If no user, then sign in as anonymous first
      await signInAnonymously(auth);
      const anonymousUser = await getAuth(app).currentUser;
      const idToken = await anonymousUser?.getIdToken();
      init.headers['Authorization'] = 'Bearer ' + idToken;
    }

    const response = await fetch(requestUrl, init);
    const responseData = await response.json(); // parses JSON response into native JavaScript objects

    // recordFetch(response, responseData, requestUrl, init);
    return responseData;
    // Record the response
  };

  /**
   * @deprecated This method is not used in the codebase.
   * Use getUserTokens has price information.
   */
  private getUSDCPricePair = (provider: PriceProvider): string | null => {
    switch (provider) {
      case PriceProvider.binance:
        return 'usdcusdt';
      case PriceProvider.kakren:
        return 'usdcusd';
      case PriceProvider.huobi:
        return 'usdcusdt';
      default:
        return null;
    }
  };

  /**
   * @deprecated This method is not used in the codebase.
   * Use getUserTokens has price information.
   */
  getPriceProvider = (token: string): PriceProvider[] => {
    switch (token) {
      case 'usdc':
        return [PriceProvider.binance, PriceProvider.kakren, PriceProvider.huobi];
      case 'flow':
        return [
          PriceProvider.binance,
          PriceProvider.kakren,
          PriceProvider.coinbase,
          PriceProvider.kucoin,
          PriceProvider.huobi,
        ];
      default:
        return [];
    }
  };

  /**
   * @deprecated This method is not used in the codebase.
   * Use getUserTokens has price information.
   */
  getUSDCPrice = async (provider = PriceProvider.binance): Promise<CheckResponse> => {
    const config = this.store.config.crypto_map;
    const data = await this.sendRequest(config.method, config.path, {
      provider,
      pair: this.getUSDCPricePair(provider),
    });
    return data.data.result;
  };

  /**
   * @deprecated This method is not used in the codebase.
   * Use getUserTokens has price information.
   */
  private getFlowPricePair = (provider: PriceProvider): string => {
    switch (provider) {
      case PriceProvider.binance:
        return 'flowusdt';
      case PriceProvider.kakren:
        return 'flowusd';
      case PriceProvider.huobi:
        return 'flowusdt';
      case PriceProvider.coinbase:
        return 'flowusd';
      case PriceProvider.kucoin:
        return 'flowusdt';
      default:
        return '';
    }
  };

  /**
   * @deprecated This method is not used in the codebase.
   * Use getUserTokens instead. It will have token info and price.
   */
  getTokenPrices = async (storageKey: string) => {
    // TODO: move to new data cache service
    const cachedPrices = await storage.getExpiry(storageKey);
    if (cachedPrices) {
      return cachedPrices;
    }

    const pricesMap: Record<string, string> = {};

    try {
      const response = await this.sendRequest('GET', '/api/prices', {}, {}, WEB_NEXT_URL);
      const data = response?.data || [];

      data.forEach((token) => {
        if (token.evmAddress) {
          const { rateToUSD, evmAddress, symbol } = token;
          const key = evmAddress.toLowerCase();
          pricesMap[key] = Number(rateToUSD).toFixed(8);
          const symbolKey = symbol.toUpperCase();
          if (symbolKey) {
            pricesMap[symbolKey] = Number(rateToUSD).toFixed(8);
          }
        }
        if (token.contractName && token.contractAddress) {
          // Flow chain price
          const { rateToUSD, contractName, contractAddress } = token;
          const key = `${contractName.toLowerCase()}${contractAddress.toLowerCase()}`;
          pricesMap[key] = Number(rateToUSD).toFixed(8);
        }
      });
    } catch (error) {
      console.error('Error fetching prices:', error);
    }

    await storage.setExpiry(storageKey, pricesMap, 300000);
    return pricesMap;
  };

  /**
   * @deprecated This method is not used in the codebase.
   * Use getUserTokens instead. It will have token info and price.
   */
  getPricesBySymbol = async (symbol: string, data) => {
    const key = symbol.toUpperCase();
    return data[key];
  };

  /**
   * @deprecated This method is not used in the codebase.
   * Use getUserTokens instead. It will have token info and price.
   */
  getPricesByAddress = async (symbol: string, data) => {
    const key = symbol.toLowerCase();
    return data[key];
  };

  /**
   * @deprecated This method is not used in the codebase.
   * Use getUserTokens instead. It will have token info and price.
   */
  getPricesByKey = async (symbol: string, data) => {
    const key = symbol.toLowerCase();
    return data[key];
  };

  /**
   * @deprecated This method is not used in the codebase.
   * Use getUserTokens instead. It will have token info and price.
   */
  getPricesByEvmaddress = async (address: string, data) => {
    const key = address.toLowerCase();
    return data[key];
  };

  getTokenPair = (token: string, provider: PriceProvider): string | null => {
    switch (token) {
      case 'usdc':
        return this.getUSDCPricePair(provider);
      case 'flow':
        return this.getFlowPricePair(provider);
      default:
        return null;
    }
  };

  /**
   * @deprecated This method is not used in the codebase.
   * Use getUserTokens instead. It will have token info and price.
   */
  getTokenPrice = async (token: string, provider = PriceProvider.binance) => {
    const config = this.store.config.crypto_flow;
    const pair = this.getTokenPair(token, provider);
    if (!pair) {
      throw new Error('no price provider found');
    }
    const data = await this.sendRequest(config.method, config.path, {
      provider,
      pair: pair,
    });
    return data.data.result;
  };

  getTokenPriceHistory = async (
    token: string,
    period = Period.oneDay,
    provider = PriceProvider.binance
  ): Promise<CheckResponse> => {
    let after = dayjs();
    const periods = getPeriodFrequency(period);

    const providers = this.getPriceProvider(token);
    if (providers.length === 0) {
      throw new Error('no price provider found');
    }

    switch (period) {
      case Period.oneDay:
        after = after.subtract(1, 'days');
        break;
      case Period.oneWeek:
        after = after.subtract(7, 'days');
        break;
      case Period.oneMonth:
        after = after.subtract(1, 'months');
        break;
      case Period.threeMonth:
        after = after.subtract(3, 'months');
        break;
      case Period.oneYear:
        after = after.subtract(1, 'years');
        break;
    }

    const config = this.store.config.crypto_history;
    const data = await this.sendRequest(config.method, config.path, {
      provider,
      pair: this.getTokenPair(token, provider),
      after: period === Period.all ? '' : after.unix(),
      periods,
    });
    return data.data.result;
  };

  /**
   * Login with a custom token
   * @param userId - The user id to login with
   * @param token - The custom token to login with
   */
  private _loginWithToken = async (userId: string, token: string) => {
    this.clearAllStorage();
    await setPersistence(auth, indexedDBLocalPersistence);
    await signInWithCustomToken(auth, token);
    await storage.set(CURRENT_ID_KEY, userId);

    // Kick off loaders that use the current user id
    userInfoService.loadUserInfoByUserId(userId);
  };

  private clearAllStorage = () => {
    nftService.clear();
    userInfoService.removeUserInfo();
    coinListService.clear();
    addressBookService.clear();
    userWalletService.clear();
    transactionService.clear();
  };

  /**
   * --------------------------------------------------------------------
   * Loaders
   * --------------------------------------------------------------------
   */
  /**
   * Load the cadence scripts for the current user
   * @param userId - The user id to load the cadence scripts for
   * @returns The cadence scripts for the current user
   */
  private _loadCadenceScripts = async (): Promise<NetworkScripts> => {
    const cadenceScripts = await getValidData<NetworkScripts>(cadenceScriptsKey());
    if (cadenceScripts) {
      return cadenceScripts;
    }
    const cadenceScriptsV2 = await this.cadenceScriptsV2();
    setCachedData(cadenceScriptsKey(), cadenceScriptsV2, 1000 * 60 * 60); // set to 1 hour
    return cadenceScriptsV2;
  };

  getCadenceScripts = async (): Promise<NetworkScripts> => {
    return await this._loadCadenceScripts();
  };
  checkUsername = async (username: string) => {
    const config = this.store.config.check_username;
    const data = await this.sendRequest(config.method, config.path, {
      username,
    });
    return data;
  };

  register = async (account_key: AccountKeyRequest, username: string) => {
    // Track the time until account_created is called
    mixpanelTrack.time('account_created');

    const config = this.store.config.register;
    const data = await this.sendRequest(
      config.method,
      config.path,
      {},
      {
        account_key,
        username,
      }
    );
    await this._loginWithToken(data.data.id, data.data.custom_token);

    // Track the registration
    mixpanelTrack.track('account_created', {
      public_key: account_key.public_key,
      sign_algo: getStringFromSignAlgo(account_key.sign_algo),
      hash_algo: getStringFromHashAlgo(account_key.hash_algo),
    });
    return data;
  };

  loginV3 = async (
    account_key: AccountKeyRequest,
    device_info: DeviceInfoRequest,
    signature: string,
    replaceUser = true
  ): Promise<SignInResponse> => {
    const config = this.store.config.loginv3;
    const result = await this.sendRequest(
      config.method,
      config.path,
      {},
      { account_key, device_info, signature }
    );
    if (!result.data) {
      throw new Error('NoUserFound');
    }
    if (replaceUser) {
      await this._loginWithToken(result.data.id, result.data.custom_token);
    }
    return result;
  };

  proxytoken = async () => {
    // Default options are marked with *

    const app = getApp(process.env.NODE_ENV!);

    // Wait for firebase auth to complete
    await waitForAuthInit();

    await signInAnonymously(auth);
    const anonymousUser = await getAuth(app).currentUser;
    const idToken = await anonymousUser?.getIdToken();
    return idToken;
  };

  importKey = async (
    account_key: AccountKeyRequest,
    device_info: DeviceInfoRequest,
    username: string,
    backup_info: any,
    address: string,
    replaceUser = true
  ): Promise<SignInResponse> => {
    const config = this.store.config.importKey;
    const result = await this.sendRequest(
      config.method,
      config.path,
      {},
      { username, address, account_key, device_info, backup_info }
    );
    if (!result.data) {
      throw new Error('NoUserFound');
    }
    if (replaceUser) {
      await this._loginWithToken(result.data.id, result.data.custom_token);
    }
    return result;
  };

  coinMap = async () => {
    const config = this.store.config.coin_map;
    const data = await this.sendRequest(config.method, config.path);
    return data;
  };

  userInfo = async (): Promise<UserInfoResponse> => {
    const config = this.store.config.user_info;
    const { data } = await this.sendRequest(config.method, config.path);
    return data;
  };

  createFlowAddress = async () => {
    const config = this.store.config.create_flow_address;
    const data = await this.sendRequest(config.method, config.path);
    return data;
  };

  createFlowAddressV2 = async () => {
    const config = this.store.config.create_flow_address_v2;
    const data = await this.sendRequest(config.method, config.path);
    return data;
  };

  getMoonpayURL = async (url) => {
    const baseURL = getFirbaseFunctionUrl();
    const response = await this.sendRequest('POST', '/moonPaySignature', {}, { url: url }, baseURL);
    return response;
  };

  signPayer = async (transaction, message: string) => {
    const messages = {
      envelope_message: message,
    };
    const baseURL = getFirbaseFunctionUrl();
    // 'http://localhost:5001/lilico-dev/us-central1'
    const data = await this.sendRequest(
      'POST',
      '/signAsPayer',
      {},
      { transaction, message: messages },
      baseURL
    );
    // (config.method, config.path, {}, { transaction, message: messages });
    return data;
  };

  signBridgeFeePayer = async (transaction, message: string) => {
    const messages = {
      envelope_message: message,
    };
    const data = await this.sendRequest(
      'POST',
      '/api/signAsBridgeFeePayer',
      {},
      { transaction, message: messages },
      WEB_NEXT_URL
    );
    // (config.method, config.path, {}, { transaction, message: messages });
    return data;
  };
  signProposer = async (transaction, message: string) => {
    const messages = {
      envelope_message: message,
    };
    const baseURL = getFirbaseFunctionUrl();
    // 'http://localhost:5001/lilico-dev/us-central1'
    const data = await this.sendRequest(
      'POST',
      '/signAsProposer',
      {},
      { transaction, message: messages },
      baseURL
    );
    // (config.method, config.path, {}, { transaction, message: messages });
    return data;
  };

  getProposer = async () => {
    const baseURL = getFirbaseFunctionUrl();
    // 'http://localhost:5001/lilico-dev/us-central1'
    const data = await this.sendRequest('GET', '/getProposer', {}, {}, baseURL);
    // (config.method, config.path, {}, { transaction, message: messages });
    return data;
  };

  getNFTList = async (network: string): Promise<NFTModelV2[]> => {
    const childType = await userWalletService.getActiveAccountType();
    let chainType = 'flow';
    if (childType === 'evm') {
      chainType = 'evm';
    }

    // TODO: move to new data cache service
    const nftList = await storage.getExpiry(`NFTList${network}${chainType}`);
    if (nftList && nftList.length > 0) {
      return nftList;
    }
    const config = this.store.config.get_nft_list;
    const { tokens }: { tokens: NFTModelV2[] } = await this.sendRequest(
      config.method,
      config.path,
      {
        network,
        chain_type: chainType,
      },
      {},
      WEB_NEXT_URL
    );

    storage.setExpiry(`NFTList${network}${chainType}`, tokens, 600000);

    return tokens;
  };

  getAddressBook = async (): Promise<{ data: { contacts: Contact[] } }> => {
    const config = this.store.config.fetch_address_book;
    const data = await this.sendRequest(config.method, config.path);
    return data;
  };

  addAddressBook = async (
    contact_name: string,
    address: string,
    username = '',
    domain = '',
    domain_type = 0
  ) => {
    const config = this.store.config.add_address_book;
    const data = await this.sendRequest(
      config.method,
      config.path,
      {},
      {
        contact_name,
        address,
        username,
        domain,
        domain_type,
      }
    );
    return data;
  };

  editAddressBook = async (
    id: number,
    contact_name: string,
    address: string,
    domain = '',
    domain_type = 0
  ) => {
    const config = this.store.config.edit_address_book;
    const data = await this.sendRequest(
      config.method,
      config.path,
      {},
      {
        id,
        contact_name,
        address,
        domain,
        domain_type,
      }
    );
    return data;
  };

  deleteAddressBook = async (id: number) => {
    const config = this.store.config.delete_address_book;
    const data = await this.sendRequest(config.method, config.path, { id });
    return data;
  };

  addExternalAddressBook = async (
    contact_name: string,
    address: string,
    domain = '',
    domain_type = 0
  ) => {
    const config = this.store.config.add_external_address_book;
    const data = await this.sendRequest(
      config.method,
      config.path,
      {},
      {
        contact_name,
        address,
        domain,
        domain_type,
      }
    );
    return data;
  };

  getFlowAccount = async (address: string) => {
    try {
      const account = await fcl.account(address);
      return account;
    } catch (error) {
      return null;
    }
  };

  checkChildAccount = async (address: string) => {
    const script = await getScripts(
      userWalletService.getNetwork(),
      'hybridCustody',
      'checkChildAccount'
    );
    const result = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(address, t.Address)],
    });
    return result;
  };

  queryAccessible = async (address: string, childAccount: string) => {
    const script = await getScripts(
      userWalletService.getNetwork(),
      'hybridCustody',
      'checkChildAccount'
    );

    const result = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(address, t.Address), arg(childAccount, t.Address)],
    });
    return result;
  };

  queryAccessibleFt = async (address: string, childAccount: string) => {
    const script = await getScripts(
      userWalletService.getNetwork(),
      'hybridCustody',
      'getAccessibleCoinInfo'
    );

    const result = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(address, t.Address), arg(childAccount, t.Address)],
    });
    return result;
  };

  checkChildAccountMeta = async (address: string) => {
    const script = await getScripts(
      userWalletService.getNetwork(),
      'hybridCustody',
      'getChildAccountMeta'
    );
    try {
      const res = await fcl.query({
        cadence: script,
        args: (arg, t) => [arg(address, t.Address)],
      });
      return res;
    } catch (err) {
      return null;
    }
  };

  getFlownsAddress = async (domain: string, root = 'fn') => {
    const script = await getScripts(userWalletService.getNetwork(), 'basic', 'getFlownsAddress');

    const address = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(domain, t.String), arg(root, t.String)],
    });
    return address;
  };

  getAccountMinFlow = async (address: string) => {
    const script = await getScripts(userWalletService.getNetwork(), 'basic', 'getAccountMinFlow');
    if (isValidFlowAddress(address)) {
      const minFlow = await fcl.query({
        cadence: script,
        args: (arg, t) => [arg(address, t.Address)],
      });
      return minFlow;
    }
  };

  getFindAddress = async (domain: string) => {
    const script = await getScripts(userWalletService.getNetwork(), 'basic', 'getFindAddress');

    const address = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(domain, t.String)],
    });
    return address;
  };

  getFindDomainByAddress = async (domain: string) => {
    const script = await getScripts(
      userWalletService.getNetwork(),
      'basic',
      'getFindDomainByAddress'
    );

    const address = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(domain, t.Address)],
    });
    return address;
  };

  getTransfers = async (
    address: string,
    offset: number,
    limit: number
  ): Promise<FlowTransactionResponse> => {
    const config = this.store.config.get_transfers;
    const { data } = await this.sendRequest(
      config.method,
      config.path,
      {
        address,
        after: offset,
        limit,
      },
      {},
      WEB_NEXT_URL
    );

    return data;
  };

  getEVMTransfers = async (
    address: string,
    offset: number,
    limit: number
  ): Promise<EvmTransactionResponse> => {
    const data = await this.sendRequest(
      'GET',
      `/api/evm/${address}/transactions`,
      {},
      {},
      WEB_NEXT_URL
    );
    return data;
  };

  getManualAddress = async () => {
    const config = this.store.config.manual_address;
    const data = await this.sendRequest(config.method, config.path, {});

    return data;
  };

  deviceList = async () => {
    const config = this.store.config.device_list;
    const data = await this.sendRequest(config.method, config.path, {});

    return data;
  };

  keyList = async () => {
    const config = this.store.config.key_list;
    const data = await this.sendRequest(config.method, config.path, {});

    return data;
  };

  getLocation = async () => {
    const config = this.store.config.get_location;
    const data = await this.sendRequest(config.method, config.path, {});

    return data;
  };

  addDevice = async (params) => {
    const config = this.store.config.add_device_v3;
    const data = await this.sendRequest(config.method, config.path, {}, params);

    return data;
  };

  synceDevice = async (params) => {
    const config = this.store.config.sync_device;
    const data = await this.sendRequest(config.method, config.path, {}, params);

    return data;
  };

  getInstallationId = async () => {
    const installations = await getInstallations(app);
    const id = await getId(installations);
    return id;
  };

  searchUser = async (
    keyword: string
  ): Promise<{
    data: { users: { address: string; username: string; avatar: string; nickname: string }[] };
  }> => {
    const config = this.store.config.search_user;
    const data = await this.sendRequest(config.method, config.path, {
      keyword,
    });

    return data?.data?.users ? data : { data: { users: [] } };
  };

  checkImport = async (key: string) => {
    const config = this.store.config.check_import;
    const data = await this.sendRequest(config.method, config.path, {
      key,
    });

    return data;
  };

  getTokenInfo = async (name: string, network = ''): Promise<TokenInfo | undefined> => {
    // FIX ME: Get defaultTokenList from firebase remote config
    if (!network) {
      network = await userWalletService.getNetwork();
    }
    const tokens = await this.getTokenList(network);
    // const coins = await remoteFetch.flowCoins();
    return tokens.find((item) => item.symbol.toLowerCase() === name.toLowerCase());
  };

  getEvmTokenInfo = async (name: string, network = ''): Promise<TokenInfo | undefined> => {
    if (!network) {
      network = await userWalletService.getNetwork();
    }

    const tokens = await this.getEvmList(network);

    const tokenInfo = tokens.find((item) => item.symbol.toLowerCase() === name.toLowerCase());

    if (tokenInfo && isValidEthereumAddress(tokenInfo.address)) {
      return tokenInfo;
    }

    const freshTokens = await this.refreshEvmToken(network);
    return freshTokens.find((item) => item.symbol.toLowerCase() === name.toLowerCase());
  };

  getTokenInfoByContract = async (contractName: string): Promise<TokenModel | undefined> => {
    // FIX ME: Get defaultTokenList from firebase remote config
    const coins = await remoteFetch.flowCoins();
    return coins.find((item) => item.contract_name.toLowerCase() === contractName.toLowerCase());
  };

  getFeatureFlags = async (): Promise<FeatureFlags> => {
    try {
      const config = await remoteFetch.remoteConfig();
      return config.features;
    } catch (err) {
      console.error(err);
    }
    // By default, all feature flags are disabled
    return {};
  };
  getFeatureFlag = async (featureFlag: FeatureFlagKey): Promise<boolean> => {
    const flags = await this.getFeatureFlags();
    return !!flags[featureFlag];
  };

  getAllTokenInfo = async (filterNetwork = true): Promise<TokenInfo[]> => {
    const network = await userWalletService.getNetwork();
    const list = await this.getTokenList(network);
    return filterNetwork ? list.filter((item) => item.address) : list;
  };

  getAllNft = async (filterNetwork = true): Promise<NFTModelV2[]> => {
    const network = await userWalletService.getNetwork();
    const list = await this.getNFTList(network);
    return list;
  };

  isWalletTokenStorageEnabled = async (tokenSymbol: string) => {
    // FIX ME: Get defaultTokenList from firebase remote config
    const address = await userWalletService.getCurrentAddress();
    const tokenInfo = await this.getTokenInfo(tokenSymbol);
    if (!tokenInfo || !address) {
      return;
    }
    return await this.isTokenStorageEnabled(address, tokenInfo);
  };

  getWalletTokenBalance = async (tokenSymbol: string) => {
    // FIX ME: Get defaultTokenList from firebase remote config
    const address = await userWalletService.getCurrentAddress();
    const tokenInfo = await this.getTokenInfo(tokenSymbol);
    if (!tokenInfo || !address) {
      return;
    }
    return await this.getTokenBalanceWithModel(address, tokenInfo);
  };

  getTokenBalance = async (address: string, tokenSymbol: string) => {
    // FIX ME: Get defaultTokenList from firebase remote config
    const tokenInfo = await this.getTokenInfo(tokenSymbol);
    if (!tokenInfo) {
      return;
    }
    return await this.getTokenBalanceWithModel(address, tokenInfo);
  };

  getStorageInfo = async (address: string): Promise<StorageInfo> => {
    const script = await getScripts(userWalletService.getNetwork(), 'basic', 'getStorageInfo');

    const result = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(address, t.Address)],
    });

    return {
      available: result['available'],
      used: result['used'],
      capacity: result['capacity'],
    };
  };

  getFlowAccountInfo = async (address: string): Promise<AccountBalanceInfo> => {
    const script = await getScripts(userWalletService.getNetwork(), 'basic', 'getAccountInfo');

    const result = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(address, t.Address)],
    });

    return {
      address: result['address'],
      balance: result['balance'],
      availableBalance: result['availableBalance'],
      storageUsed: result['storageUsed'],
      storageCapacity: result['storageCapacity'],
    };
  };
  getTokenBalanceWithModel = async (address: string, token: TokenInfo) => {
    const script = await getScripts(
      userWalletService.getNetwork(),
      'basic',
      'getTokenBalanceWithModel'
    );
    const network = await userWalletService.getNetwork();
    const cadence = script
      .replaceAll('<Token>', token.contractName)
      .replaceAll('<TokenBalancePath>', token.path.balance)
      .replaceAll('<TokenAddress>', token.address);
    const balance = await fcl.query({
      cadence: cadence,
      args: (arg, t) => [arg(address, t.Address)],
    });

    return balance;
  };

  fetchFTList = async (network: string, chainType: string) => {
    const config = this.store.config.get_ft_list;
    const data = await this.sendRequest(
      config.method,
      config.path,
      {
        network,
        chain_type: chainType,
      },
      {},
      WEB_NEXT_URL
    );

    return this.addFlowTokenIfMissing(data.tokens);
  };

  addFlowTokenIfMissing = (tokens) => {
    const hasFlowToken = tokens.some((token) => token.symbol.toLowerCase() === 'flow');
    if (!hasFlowToken) {
      return [defaultFlowToken, ...tokens];
    }
    return tokens;
  };

  mergeCustomTokens = (tokens, customTokens) => {
    customTokens.forEach((custom) => {
      const existingToken = tokens.find(
        (token) => token.address.toLowerCase() === custom.address.toLowerCase()
      );

      if (existingToken) {
        // If the custom token is found, set the custom key to true
        existingToken.custom = true;
      } else {
        // If the custom token is not found, add it to the tokens array
        tokens.push({
          chainId: MAINNET_CHAIN_ID,
          address: custom.address,
          symbol: custom.unit,
          name: custom.coin,
          decimals: custom.decimals,
          logoURI: '',
          flowIdentifier: custom.flowIdentifier,
          tags: [],
          balance: 0,
          custom: true,
        });
      }
    });
  };

  getTokenList = async (network): Promise<TokenInfo[]> => {
    const childType = await userWalletService.getActiveAccountType();
    const chainType = childType === 'evm' ? 'evm' : 'flow';

    const ftList = await storage.getExpiry(`TokenList${network}${chainType}`);
    if (ftList) return ftList;

    const tokens = await this.fetchFTList(network, chainType);

    if (chainType === 'evm') {
      const evmCustomToken = (await storage.get(`${network}evmCustomToken`)) || [];
      this.mergeCustomTokens(tokens, evmCustomToken);
    }

    storage.setExpiry(`TokenList${network}${chainType}`, tokens, 600000);
    return tokens;
  };

  getEvmList = async (network) => {
    const chainType = 'evm';

    const ftList = await storage.getExpiry(`TokenList${network}${chainType}`);
    if (ftList) return ftList;

    const tokens = await this.fetchFTList(network, chainType);

    if (chainType === 'evm') {
      const evmCustomToken = (await storage.get(`${network}evmCustomToken`)) || [];
      this.mergeCustomTokens(tokens, evmCustomToken);
    }

    storage.setExpiry(`TokenList${network}${chainType}`, tokens, 600000);
    return tokens;
  };

  refreshEvmToken = async (network) => {
    const chainType = 'evm';
    let ftList = await storage.getExpiry(`TokenList${network}${chainType}`);
    if (!ftList) ftList = await this.fetchFTList(network, chainType);

    const evmCustomToken = (await storage.get(`${network}evmCustomToken`)) || [];
    this.mergeCustomTokens(ftList, evmCustomToken);

    storage.setExpiry(`TokenList${network}${chainType}`, ftList, 600000);

    return ftList;
  };

  refreshCustomEvmToken = async (network) => {
    const chainType = 'evm';
    const ftList = await this.fetchFTList(network, chainType);

    const evmCustomToken = (await storage.get(`${network}evmCustomToken`)) || [];
    this.mergeCustomTokens(ftList, evmCustomToken);

    storage.setExpiry(`TokenList${network}${chainType}`, ftList, 600000);
  };

  getEnabledTokenList = async (network = ''): Promise<ExtendedTokenInfo[]> => {
    // const tokenList = await remoteFetch.flowCoins();
    if (!network) {
      network = await userWalletService.getNetwork();
    }
    const address = await userWalletService.getCurrentAddress();
    if (!address) {
      // If we haven't loaded an address yet, return an empty array
      return [];
    }
    const tokenList = await this.getTokenList(network);
    let values;
    const isChild = await userWalletService.getActiveAccountType();
    try {
      if (isChild && isChild !== 'evm') {
        values = await this.isLinkedAccountTokenListEnabled(address);
      } else if (!isChild) {
        values = await this.getTokenBalanceStorage(address);
        console.log('values ->', values);
      }
    } catch (error) {
      console.error('Error getting enabled token list:');
      values = {};
    }

    const tokenItems: ExtendedTokenInfo[] = [];
    const tokenMap = {};
    if (isChild !== 'evm') {
      tokenList.forEach((token) => {
        const tokenId = `A.${token.address.slice(2)}.${token.contractName}.Vault`;
        if (!!values[tokenId]) {
          tokenMap[token.name] = token;
        }
      });
    }

    Object.keys(tokenMap).map((key, idx) => {
      const item = tokenMap[key];
      tokenItems.push(item);
    });
    return tokenItems;
  };

  // todo
  isTokenStorageEnabled = async (address: string, token: TokenInfo) => {
    const network = await userWalletService.getNetwork();
    const script = await getScripts(
      userWalletService.getNetwork(),
      'basic',
      'isTokenStorageEnabled'
    );

    const cadence = script
      .replaceAll('<Token>', token.contractName)
      .replaceAll('<TokenBalancePath>', token.path.balance)
      .replaceAll('<TokenReceiverPath>', token.path.receiver)
      .replaceAll('<TokenAddress>', token.address);

    const isEnabled = await fcl.query({
      cadence: cadence,
      args: (arg, t) => [arg(address, t.Address)],
    });

    return isEnabled;
  };

  isTokenListEnabled = async (address: string) => {
    const script = await getScripts(userWalletService.getNetwork(), 'ft', 'isTokenListEnabled');
    const isEnabledList = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(address, t.Address)],
    });
    return isEnabledList;
  };

  isLinkedAccountTokenListEnabled = async (address: string) => {
    const script = await getScripts(
      userWalletService.getNetwork(),
      'ft',
      'isLinkedAccountTokenListEnabled'
    );
    const isEnabledList = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(address, t.Address)],
    });
    return isEnabledList;
  };

  getTokenListBalance = async (address: string, allTokens: TokenInfo[]): Promise<BalanceMap> => {
    const script = await getScripts(userWalletService.getNetwork(), 'ft', 'getTokenListBalance');
    const balanceList = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(address, t.Address)],
    });

    return balanceList;
  };

  getTokenBalanceStorage = async (address: string): Promise<BalanceMap> => {
    const script = await getScripts(userWalletService.getNetwork(), 'ft', 'getTokenBalanceStorage');
    const balanceList = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(address, t.Address)],
    });

    return balanceList;
  };

  getBlockList = async (hosts: string[] = [], forceCheck = false): Promise<string[]> => {
    return await googleSafeHostService.getBlockList(hosts, forceCheck);
  };

  getEnabledNFTList = async (): Promise<{ address: string; contractName: string }[]> => {
    const address = await userWalletService.getCurrentAddress();
    if (!address) return [];

    const getNftBalanceStorage = await this.getNftBalanceStorage(address);

    const resultArray = Object.entries(getNftBalanceStorage).map(([key]) => {
      // ignore the prefix
      const [, address, contractName] = key.split('.');
      return {
        address: `0x${address}`,
        contractName: contractName,
      };
    });

    return resultArray;
  };

  checkNFTListEnabled = async (address: string): Promise<Record<string, boolean>> => {
    // Returns a map of enabled NFTs for the address
    const script = await getScripts(userWalletService.getNetwork(), 'nft', 'checkNFTListEnabled');

    const isEnabledList = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(address, t.Address)],
    });
    return isEnabledList;
  };

  getNftBalanceStorage = async (address: string): Promise<Record<string, number>> => {
    // Returns a map of enabled NFTs for the address
    const script = await getScripts(
      userWalletService.getNetwork(),
      'collection',
      'getNFTBalanceStorage'
    );

    const isEnabledList = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(address, t.Address)],
    });
    return isEnabledList;
  };

  getTransactionTemplate = async (cadence: string, network: string) => {
    console.log('getTransactionTemplate ->');
    const base64 = Buffer.from(cadence, 'utf8').toString('base64');

    const data = {
      cadence_base64: base64,
      network: network.toLowerCase(),
    };
    const init = {
      method: 'POST',
      async: true,
      body: JSON.stringify(data),
      headers: {
        Network: network,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };

    console.log('getTransactionTemplate ->', init);
    const response = await fetch('https://flix.flow.com/v1/templates/search', init);

    const template = await response.json();

    console.log('template ->', template);

    const auditorsResponse = await fetch(`https://flix.flow.com/v1/auditors?network=${network}`);
    const auditors = await auditorsResponse.json();
    console.log('auditors ->', auditors);

    fcl.config().put(
      'flow.auditors',
      auditors.map((item) => item.address)
    );

    const audits = await fcl.InteractionTemplateUtils.getInteractionTemplateAudits({
      template: template,
      auditors: auditors.map((item) => item.address),
    });

    console.log('audits ->', audits);
    const addresses = Object.keys(audits).filter((address) => audits[address]);

    if (addresses.length <= 0) {
      return null;
    }

    const result = auditors.filter((item) => addresses.includes(item.address));
    console.log('result ->', result);
    if (result.length <= 0) {
      return null;
    }
    return {
      auditor: result[0],
      template,
    };
  };

  validateRecaptcha = async (token: string) => {
    const config = this.store.config.validate_recaptcha;
    const data = await this.sendRequest(config.method, config.path, {
      token,
    });

    return data;
  };

  pingNetwork = async (network: string): Promise<boolean> => {
    try {
      const response = await fetch(`https://rest-${network}.onflow.org/v1/blocks?height=sealed`);
      const result = await response.json();
      return result[0].header !== null && result[0].header !== undefined;
    } catch (err) {
      return false;
    }
  };

  updateProfilePreference = async (privacy: number) => {
    const config = this.store.config.profile_preference;
    const data = await this.sendRequest(
      config.method,
      config.path,
      {},
      {
        private: privacy,
      }
    );

    return data;
  };

  updateProfile = async (nickname: string, avatar: string) => {
    const config = this.store.config.profile_update;
    const data = await this.sendRequest(
      config.method,
      config.path,
      {},
      {
        nickname: nickname,
        avatar: avatar,
      }
    );

    return data;
  };

  nftCatalog = async () => {
    const { data } = await this.sendRequest(
      'GET',
      'api/nft/collections',
      {},
      {},
      'https://lilico.app/'
    );
    return data;
  };

  cadenceScriptsV2 = async (): Promise<NetworkScripts> => {
    const { data } = await this.sendRequest('GET', '/api/v2/scripts', {}, {}, WEB_NEXT_URL);
    return data;
  };

  nftCatalogList = async (address: string, limit: any, offset: any, network: string) => {
    const { data } = await this.sendRequest(
      'GET',
      `/api/v2/nft/list?address=${address}&limit=${limit}&offset=${offset}&network=${network}`,
      {},
      {},
      WEB_NEXT_URL
    );
    return data;
  };

  nftCatalogCollections = async (address: string, network: string): Promise<NFTCollections[]> => {
    const { data } = await this.sendRequest(
      'GET',
      `/api/v2/nft/id?address=${address}&network=${network}`,
      {},
      {},
      WEB_NEXT_URL
    );
    return data;
  };

  nftCatalogCollectionList = async (
    address: string,
    contractName: string,
    limit: any,
    offset: any,
    network: string
  ) => {
    const { data } = await this.sendRequest(
      'GET',
      `/api/v2/nft/collectionList?address=${address}&limit=${limit}&offset=${offset}&collectionIdentifier=${contractName}&network=${network}`,
      {},
      {},
      WEB_NEXT_URL
    );
    return data;
  };

  nftCollectionList = async () => {
    const { data } = await this.sendRequest('GET', '/api/nft/collections', {}, {}, WEB_NEXT_URL);
    return data;
  };

  evmFTList = async () => {
    const { data } = await this.sendRequest('GET', '/api/evm/fts', {}, {}, WEB_NEXT_URL);
    return data;
  };

  /** @deprecated
   * Use getUserTokens has price information. It returns evm tokens with price information.
   */
  getEvmFT = async (address: string, network: string) => {
    const { data } = await this.sendRequest(
      'GET',
      `/api/v3/evm/${address}/fts?network=${network}`,
      {},
      {},
      WEB_NEXT_URL
    );
    return data;
  };

  /**
   * @deprecated This method is not used in the codebase.
   * Use getUserTokens has price information.
   */
  getEvmFTPrice = async () => {
    const gitPrice = await storage.getExpiry('EVMPrice');

    if (gitPrice) {
      return gitPrice;
    } else {
      const { data } = await this.sendRequest('GET', '/api/prices', {}, {}, WEB_NEXT_URL);
      storage.setExpiry('EVMPrice', data, 6000);
      return data;
    }
  };

  evmNFTList = async () => {
    const { data } = await this.sendRequest('GET', '/api/evm/nfts', {}, {}, WEB_NEXT_URL);
    return data;
  };

  getEvmNFT = async (address: string, network: string) => {
    const { data } = await this.sendRequest(
      'GET',
      `/api/evm/${address}/nfts?network=${network}`,
      {},
      {},
      WEB_NEXT_URL
    );
    return data;
  };

  decodeEvmCall = async (data: string, address = '') => {
    const bodyData = {
      to: address, // address -- optional
      data: data, // calldata -- required
    };
    const res = await this.sendRequest('POST', `/api/evm/decodeData`, {}, bodyData, WEB_NEXT_URL);
    return res;
  };

  EvmNFTcollectionList = async (
    address: string,
    collectionIdentifier: string,
    limit = 24,
    offset = 0
  ) => {
    const network = await userWalletService.getNetwork();
    const { data } = await this.sendRequest(
      'GET',
      `/api/v3/evm/nft/collectionList?network=${network}&address=${address}&collectionIdentifier=${collectionIdentifier}&limit=${limit}&offset=${offset}`,
      {},
      {},
      WEB_NEXT_URL
    );
    return data;
  };

  EvmNFTID = async (network: string, address: string) => {
    const { data } = await this.sendRequest(
      'GET',
      `/api/v3/evm/nft/id?network=${network}&address=${address}`,
      {},
      {},
      WEB_NEXT_URL
    );
    return data;
  };

  EvmNFTList = async (address: string, limit = 24, offset = 0) => {
    const network = await userWalletService.getNetwork();
    const { data } = await this.sendRequest(
      'GET',
      `/api/v3/evm/nft/list?network=${network}&address=${address}&limit=${limit}&offset=${offset}`,
      {},
      {},
      WEB_NEXT_URL
    );
    return data;
  };

  getNFTCadenceList = async (address: string, network = 'mainnet', offset = 0, limit = 5) => {
    const { data } = await this.sendRequest(
      'GET',
      `/api/v2/nft/id?network=${network}&address=${address}`,
      {},
      {},
      WEB_NEXT_URL
    );
    return data;
  };

  getNFTV2CollectionList = async (
    address: string,
    network = 'mainnet'
  ): Promise<NFTModel_depreciated[]> => {
    const { data } = await this.sendRequest(
      'GET',
      `/api/v2/nft/collections?network=${network}&address=${address}`,
      {},
      {},
      WEB_NEXT_URL
    );
    return data;
  };

  putDeviceInfo = async (walletData: PublicKeyAccount[]) => {
    try {
      const installationId = await this.getInstallationId();
      // console.log('location ', userlocation);

      await this.addDevice({
        wallet_id: '',
        wallettest_id: '',
        device_info: {
          device_id: installationId,
          district: '',
          name: 'FRW Chrome Extension',
          type: '2',
          user_agent: 'Chrome',
        },
      });
    } catch (error) {
      console.error('Error while adding device:', error);
      return;
    }
  };

  getNews = async (): Promise<NewsItem[]> => {
    // Get news from firebase function

    const cachedNews = await storage.getExpiry('news');

    if (cachedNews) {
      return cachedNews;
    }

    const data = await this.sendRequest(
      'GET',
      process.env.API_NEWS_PATH,
      {},
      {},
      process.env.API_BASE_URL
    );

    const timeNow = new Date(Date.now());

    const news = data
      .map(
        (dataFromApi: {
          id: string;
          priority: string;
          type: string;
          title: string;
          body?: string;
          icon?: string;
          image?: string;
          url?: string;
          expiry_time: string;
          display_type: string;
          conditions?: string[]; // Add conditions field
        }) => {
          const newsItem = {
            ...dataFromApi,
            expiryTime: new Date(dataFromApi.expiry_time),
            displayType: dataFromApi.display_type,
            conditions: dataFromApi.conditions as NewsConditionType[], // Map conditions
          };
          return newsItem;
        }
      )
      .filter((n: { expiryTime: Date }) => {
        return n.expiryTime > timeNow;
      });

    await storage.setExpiry('news', news, 300000); // 5 minutes in milliseconds

    return news;
  };

  freshUserInfo = async (
    mainAddress: FlowAddress,
    keys: FclAccount,
    pubKTuple,
    wallet,
    isChild: ActiveAccountType
  ) => {
    const loggedInAccounts: LoggedInAccount[] = (await storage.get('loggedInAccounts')) || [];

    if (!isChild) {
      await storage.set('keyIndex', '');
      await storage.set('hashAlgoString', '');
      await storage.set('signAlgoString', '');
      await storage.set('pubKey', '');

      const { P256, SECP256K1 } = pubKTuple;

      const keyInfoA = findKeyAndInfo(keys, P256.pubK);
      const keyInfoB = findKeyAndInfo(keys, SECP256K1.pubK);
      const keyInfo = keyInfoA ||
        keyInfoB || {
          index: 0,
          signAlgoString: keys.keys[0].signAlgoString,
          hashAlgoString: keys.keys[0].hashAlgoString,
          publicKey: keys.keys[0].publicKey,
        };
      await storage.set('keyIndex', keyInfo.index);
      await storage.set('signAlgoString', keyInfo.signAlgoString);
      await storage.set('hashAlgoString', keyInfo.hashAlgoString);
      await storage.set('pubKey', keyInfo.publicKey);
      // Make sure the address is a FlowAddress

      if (!isValidFlowAddress(mainAddress)) {
        throw new Error('Invalid Flow address');
      }
      const flowAddress: FlowAddress = mainAddress;
      const updatedWallet: LoggedInAccount = {
        ...wallet,
        address: flowAddress,
        pubKey: keyInfo.publicKey,
        hashAlgoString: keyInfo.hashAlgoString,
        signAlgoString: keyInfo.signAlgoString,
        weight: keys.keys[0].weight,
      };

      log.log('wallet is this:', updatedWallet);

      const accountIndex = loggedInAccounts.findIndex(
        // Check both pubKey and username. Older versions allowed the pubKey to be imported twice with different usernames
        (account) =>
          account.pubKey === updatedWallet.pubKey && account.username === updatedWallet.username
      );

      if (accountIndex === -1) {
        loggedInAccounts.push(updatedWallet);
      } else {
        loggedInAccounts[accountIndex] = updatedWallet;
      }
      await storage.set('loggedInAccounts', loggedInAccounts);
    }

    log.log('Updated loggedInAccounts:', loggedInAccounts);
    const otherAccounts: LoggedInAccountWithIndex[] = loggedInAccounts
      .filter((account) => account.username !== wallet.username)
      .map((account) => {
        const indexInLoggedInAccounts = loggedInAccounts.findIndex(
          (loggedInAccount) => loggedInAccount.username === account.username
        );
        return { ...account, indexInLoggedInAccounts };
      })
      .slice(0, 2);

    log.log('otherAccounts with index:', otherAccounts);
    return { otherAccounts, wallet, loggedInAccounts };
  };

  // ** Get supported currencies **
  getSupportedCurrencies = async (): Promise<Currency[]> => {
    if (this.supportedCurrenciesCache !== null) {
      return this.supportedCurrenciesCache;
    }

    try {
      const supportedCurrencies: CurrencyResponse = await this.sendRequest(
        'GET',
        `/api/v4/currencies`,
        {},
        {},
        WEB_NEXT_URL
      );

      // Cache the currencies
      this.supportedCurrenciesCache = supportedCurrencies?.data?.currencies || [];
      return this.supportedCurrenciesCache;
    } catch (error) {
      console.warn('Error fetching supported currencies:', error);
      // Return default USD if API fails
      const defaultCurrency = [
        {
          code: 'USD',
          symbol: '$',
          name: 'United States Dollar',
          country: 'United States',
        },
      ];
      this.supportedCurrenciesCache = defaultCurrency;
      return defaultCurrency;
    }
  };

  getAccountsWithPublicKey = async (
    publicKey: string,
    network: string
  ): Promise<PublicKeyAccount[]> => {
    const url =
      network === 'testnet'
        ? `https://staging.key-indexer.flow.com/key/${publicKey}`
        : `https://production.key-indexer.flow.com/key/${publicKey}`;
    const result = await fetch(url);
    const json = await result.json();

    // Now massage the data to match the type we want
    const accounts: PublicKeyAccount[] = json.accounts.map((account) => ({
      address: account.address,
      publicKey: json.publicKey,
      keyIndex: account.keyId,
      weight: account.weight,
      signAlgo: account.sigAlgo,
      signAlgoString: account.signing,
      hashAlgo: account.hashAlgo,
      hashAlgoString: account.hashing,
    }));

    return accounts;
  };
  /**
   * Get user tokens, handle both EVM and Flow tokens. Include price information.
   * @param address - The address of the user
   * @param network - The network of the user
   * @param currencyCode - The currency code of the user
   * @returns The tokens of the user
   */
  async getUserTokens(
    address: string,
    network?: string,
    currencyCode: string = 'USD'
  ): Promise<ExtendedTokenInfo[]> {
    if (!address) {
      throw new Error('Address is required');
    }

    // If network not provided, get current network
    if (!network) {
      network = await userWalletService.getNetwork();
    }

    // Determine if address is EVM or Flow based on format
    const isEvmAddress = isValidEthereumAddress(address);
    const isFlowAddress = isValidFlowAddress(address);

    if (!isEvmAddress && !isFlowAddress) {
      throw new Error('Invalid address format');
    }

    try {
      if (isEvmAddress) {
        return await this.fetchUserEvmTokens(address, network, currencyCode);
      } else {
        return await this.fetchUserFlowTokens(address, network, currencyCode);
      }
    } catch (error) {
      console.error('Error fetching user tokens:', error);
      throw error;
    }
  }

  private async fetchUserFlowTokens(
    address: string,
    network: string,
    currencyCode: string = 'USD'
  ): Promise<ExtendedTokenInfo[]> {
    const cacheKey = `flow_tokens_${address}_${network}_${currencyCode}`;
    const cachedFlowData = await storage.getExpiry(cacheKey);

    if (cachedFlowData !== null) {
      return cachedFlowData;
    }

    const response: FlowApiResponse = await this.sendRequest(
      'GET',
      `/api/v4/cadence/tokens/ft/${address}`,
      { network, currency: currencyCode },
      {},
      WEB_NEXT_URL
    );
    if (!response!.data?.result?.length) {
      return [];
    }

    const tokens = (response?.data?.result || []).map(
      (token): ExtendedTokenInfo => ({
        id: token.identifier,
        name: token.name,
        address: token.contractAddress,
        contractName: token.contractName,
        symbol: token.symbol,
        decimals: 8, // Default to 8 decimals for Flow tokens if not specified
        path: {
          vault: `/${token.storagePath.domain}/${token.storagePath.identifier}`,
          receiver: `/${token.receiverPath.domain}/${token.receiverPath.identifier}`,
          balance: ``, // todo: not sure what this property is used for
        },
        logoURI: token.logoURI || token.logos?.items?.[0]?.file?.url || '',
        extensions: {
          description: token.description,
          twitter: token.socials?.x?.url,
        },
        custom: false,
        price: Number(token.priceInCurrency || token.priceInUSD || '0'), // todo: future will be a string
        total: Number(token.balanceInCurrency || token.balanceInUSD || '0'), // todo: future will be a string
        change24h: 0,
        balance: token.balance || '0',
        // Add CoinItem properties
        coin: token.name, // redundant for compatibility
        unit: token.symbol ?? token.contractName, // redundant for compatibility
        icon: token.logoURI || token.logos?.items?.[0]?.file?.url || '',
      })
    );
    return tokens;
  }

  private async fetchUserEvmTokens(
    address: string,
    network: string,
    currencyCode: string = 'USD'
  ): Promise<ExtendedTokenInfo[]> {
    const cacheKey = `evm_tokens_${address}_${network}_${currencyCode}`;
    const cachedEvmData = await storage.getExpiry(cacheKey);

    if (cachedEvmData !== null) {
      console.log('fetchUserEvmTokens - cachedEvmData', cachedEvmData);
      return cachedEvmData;
    }

    const formattedEvmAddress = address.startsWith('0x') ? address : `0x${address}`;

    const userEvmTokenList: EvmApiResponse = await this.sendRequest(
      'GET',
      `/api/v4/evm/tokens/ft/${formattedEvmAddress}`,
      { network, currency: currencyCode },
      {},
      WEB_NEXT_URL
    );
    console.log('fetchUserEvmTokens - userEvmTokenList', userEvmTokenList);
    if (!userEvmTokenList?.data?.length) {
      return [];
    }

    // Convert EvmTokenResponse to ExtendedTokenInfo
    const tokens = userEvmTokenList.data.map(
      (token): ExtendedTokenInfo => ({
        id: token.flowIdentifier || token.address,
        name: token.name,
        address: token.address,
        contractName: token.name, // Use name as contractName for EVM tokens
        symbol: token.symbol,
        decimals: token.decimals,
        path: {
          vault: '', // EVM tokens don't use Flow paths
          receiver: '',
          balance: '',
        },
        logoURI: token.logoURI || '',
        extensions: {},
        custom: false,
        price: Number(token.priceInUSD || '0'),
        total: Number(token.balanceInUSD || '0'),
        change24h: 0,
        balance: token.displayBalance || '0',
        // Add CoinItem properties
        coin: token.name, // redundant for compatibility
        unit: token.symbol, // redundant for compatibility
        icon: token.logoURI || '', // redundant for compatibility
      })
    );
    return tokens;
  }

  getLatestVersion = async (): Promise<string> => {
    // Get latest version from storage cache first
    const cached = await storage.getExpiry('latestVersion');
    if (cached) {
      return cached;
    }

    try {
      const result = await this.sendRequest(
        'GET',
        process.env.API_CONFIG_PATH,
        {},
        {},
        process.env.API_BASE_URL
      );

      const version = result.version;

      // Cache for 1 hour
      await storage.setExpiry('latestVersion', version, 3600000);
      return version;
    } catch (error) {
      console.error('Error fetching latest version:', error);
      return chrome.runtime.getManifest().version; // Fallback to current version
    }
  };
}

const openApiService = new OpenApiService();

if (process.env.NODE_ENV === 'development') {
  // Log all functions and their signatures
  const functions = Object.entries(openApiService)
    .filter(
      ([name, value]) =>
        typeof value === 'function' &&
        name !== 'constructor' &&
        typeof name === 'string' &&
        name !== 'get'
    )
    .map(([name]) => {
      const func = openApiService[name];
      // Use a safer way to get function info
      const funcStr = func.toString();
      const isAsync = funcStr.startsWith('async');
      const basicSignature = funcStr.split('{')[0].trim();

      return {
        name,
        isAsync,
        fullBody: funcStr,
        usesSendRequest: funcStr.includes('this.sendRequest'),
        usesFetchDirectly: funcStr.includes('fetch('),
        basicSignature,
        // Simple regex to extract parameter names without accessing arguments
        params: basicSignature
          .slice(basicSignature.indexOf('(') + 1, basicSignature.lastIndexOf(')'))
          .split(',')
          .map((param) => param.trim())
          .map((param) => {
            if (param.startsWith('PriceProvider.')) {
              return param.replace('PriceProvider.', '');
            }
            return param;
          })
          .filter(Boolean),
      };
    });

  console.log('OpenApiService Functions:', functions);
}

export const getScripts = async (network: string, category: string, scriptName: string) => {
  try {
    // Force a proper load of the cadence scripts
    const cadenceScripts = await openApiService.getCadenceScripts();
    if (!cadenceScripts) {
      throw new Error('Cadence scripts not loaded');
    }
    const networkScripts =
      network === 'mainnet' ? cadenceScripts.scripts.mainnet : cadenceScripts.scripts.testnet;
    if (!networkScripts) {
      throw new Error('Network scripts not found');
    }
    const categoryScripts = networkScripts[category];
    if (!categoryScripts) {
      throw new Error('Category scripts not found');
    }
    const script = categoryScripts[scriptName];
    if (!script) {
      throw new Error('Script not found');
    }
    const scriptString = Buffer.from(script, 'base64').toString('utf-8');
    const modifiedScriptString = scriptString.replaceAll('<platform_info>', `Extension-${version}`);
    return modifiedScriptString;
  } catch (error) {
    if (error instanceof Error) {
      mixpanelTrack.track('script_error', {
        script_id: scriptName,
        error: error.message,
      });
    }
    throw error;
  }
};

export default openApiService;
