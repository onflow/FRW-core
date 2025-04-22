import { type ExtendedTokenInfo } from '@/shared/types/coin-types';
import { coinListKey } from '@/shared/utils/cache-data-keys';

import { useCachedData } from './use-data';

export const useCoinList = (
  network: string | undefined | null,
  address: string | undefined | null,
  currency: string | undefined | null
) => {
  return useCachedData<ExtendedTokenInfo[]>(
    network && address && currency ? coinListKey(network, address, currency) : null
  );
};
