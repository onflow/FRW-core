import { type TokenInfo } from 'flow-native-token-registry';

import { isValidFlowAddress } from '../utils/address';

import { type HashAlgoString, type SignAlgoString } from './algo-types';
import { type CoinItem } from './coin-types';

// Matches exactly 16 hex characters, with optional 0x prefix
export type FlowAddress = `0x${string & { length: 16 }}` | `${string & { length: 16 }}`;

// Matches exactly 40 hex characters, with optional 0x prefix
export type EvmAddress = `0x${string & { length: 40 }}` | `${string & { length: 40 }}`;

// WalletAddress is the type of the address of the wallet. It can be an EvmAddress or a FlowAddress.
export type WalletAddress = EvmAddress | FlowAddress;

// ActiveChildType is the type of the active child in the wallet. It can be 'evm', a FlowAddress, or null.
export type ActiveChildType = 'evm' | FlowAddress | null;

export const isEvmAccountType = (type: ActiveChildType): type is 'evm' => {
  return type === 'evm';
};

export const isChildAccountType = (type: ActiveChildType): type is FlowAddress => {
  return isValidFlowAddress(type);
};

export const isMainAccountType = (type: ActiveChildType): type is null => {
  return type === null;
};

export type LoggedInAccount = {
  // The globally unique id of the account
  id: string;
  // The root address of the account is always a FlowAddress
  address: FlowAddress;
  // The nickname of the account
  nickname: string;
  // The globally unique username of the account. This is usually the nickname with a numeric suffix
  username: string;
  // The avatar of the account
  avatar: string;
  // The creation date of the account
  created: string;
  // The hash algorithm of the account
  hashAlgo: HashAlgoString;
  // Anonymous mode of the account.
  // If 1, the account is NOT anonymous. If 2, the account is anonymous.
  private: number;
  // The public key of the account
  pubKey: string;
  // The signature algorithm of the account
  signAlgo: SignAlgoString;
  // The weight of the account. Usually 1000
  weight: number;
};

export type LoggedInAccountWithIndex = LoggedInAccount & {
  indexInLoggedInAccounts: number;
};

// ExtendedTokenInfo is a intermediate type that combines Token information and pricing data.
export type ExtendedTokenInfo = TokenInfo & CoinItem;
export type PublicKeyAccount = {
  // The address of the account
  address: string;
  // The public key of the account
  publicKey: string;
  // The index of the key in the account
  keyIndex: number;
  // The weight of the key
  weight: number;
  // The signature algorithm of the key
  signAlgo: number;
  // The signature algorithm of the key
  signAlgoString: SignAlgoString;
  // The hash algorithm of the key
  hashAlgo: number;
  // The hash algorithm of the key
  hashAlgoString: HashAlgoString;
};

export type WalletAccount = {
  address: string;
  chain: number; // testnet: 545, mainnet: 747
  id: number;
  name: string;
  icon: string;
  color: string;
};

export type MainAccount = WalletAccount & PublicKeyAccount;

export type WalletProfile = {
  publicKey: string;
  currentId?: string;
  accounts: MainAccount[];
};

export type Emoji = {
  emoji: string;
  name: string;
  bgcolor: string;
};

type Thumbnail = {
  url: string;
};

export type AccountDetails = {
  name: string;
  description: string;
  thumbnail: Thumbnail;
};

export type ChildAccountMap = {
  [key: string]: AccountDetails;
};

// Stored in local storage
// key: `userWallets`
export type UserWalletStore = {
  monitor: string;
  activeChild: ActiveChildType;
  evmEnabled: boolean;
  emulatorMode: boolean;
  // The currently selected network
  network: string;
  // The public key of the currently active profile
  currentPubkey: string;
  // The address of the active main account
  parentAddress: string;
  // Either null - meaning main account is active, the evm account address, or the child account address
  currentAddress: string;
};

// Stored in the session store
// key: `profile-accounts-${network}-${pubKey}`
export type ProfileAccountStore = {
  accounts: MainAccount[];
  publicKey: string;
};

// Stored in the session store
// key: `child-accounts-${network}-${address}`
export type ChildAccountStore = {
  parentAddress: FlowAddress;
  accounts: ChildAccountMap;
};

// Stored in the session store
// key: `evm-account-${network}-${address}`
export type EvmAccountStore = {
  parentAddress: FlowAddress;
  evmAddress: EvmAddress | null;
};
