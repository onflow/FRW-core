import { storage } from '@/background/webapi';
import { type NFTModelV2 } from '@/shared/types/network-types';

import openapi from '../service/openapi';

import defaultConfig from './defaultConfig.json';
import defaultTokenList from './defaultTokenList.json';

interface CacheState {
  result: any;
  expireTime: number;
}
type NFTNetworkCacheState = {
  result: NFTModelV2[];
  expireTime: number;
};
type NFTCacheState = {
  mainnet: NFTNetworkCacheState;
  testnet: NFTNetworkCacheState;
};

const BASE_FUNCTIONS_URL = process.env.FB_FUNCTIONS;

class fetchRemoteConfig {
  coinState: CacheState = { result: {}, expireTime: 0 };
  nftState: NFTCacheState = {
    mainnet: {
      result: [],
      expireTime: 0,
    },
    testnet: {
      result: [],
      expireTime: 0,
    },
  };
  configState: CacheState = { result: {}, expireTime: 0 };

  async flowCoins() {
    const expire = this.coinState.expireTime;
    const now = new Date();
    // one hour expire time
    const exp = 1000 * 60 * 60 * 1 + now.getTime();
    if (expire < now.getTime()) {
      try {
        const result = await openapi.sendRequest('GET', '/fetchFTList', {}, {}, BASE_FUNCTIONS_URL);

        this.coinState.result = result;
        this.coinState.expireTime = exp;
        return result;
      } catch (err) {
        console.error(err);
        return defaultTokenList;
      }
    } else {
      return this.coinState.result;
    }
  }

  async remoteConfig() {
    const expire = this.configState.expireTime;
    const now = new Date();
    const exp = 1000 * 60 * 60 * 1 + now.getTime();
    if (expire < now.getTime()) {
      try {
        const result = await openapi.sendRequest(
          'GET',
          process.env.API_CONFIG_PATH,
          {},
          {},
          process.env.API_BASE_URL
        );
        // fetch(`${baseURL}/config`);
        // const result = await config.json();
        const config = result.config;

        this.configState.result = config;
        this.configState.expireTime = exp;
        await storage.set('freeGas', config.features.free_gas);
        await storage.set('alchemyAPI', config.features.alchemy_api);
        return config;
      } catch (err) {
        console.error(err);
        await storage.set('freeGas', defaultConfig.features.free_gas);
        return defaultConfig;
      }
    } else {
      return this.configState.result;
    }
  }
}

export default new fetchRemoteConfig();
