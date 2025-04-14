import type { TokenInfo } from 'flow-native-token-registry';

export type CoinItem = {
  id: string;
  coin: string;
  unit: string;
  balance: string;
  availableBalance?: string;
  price: number;
  change24h: number | null;
  total: number;
  icon: string;
  custom?: boolean;
  chainId?: number;
  address?: string;
  contractName?: string;
  path?: {
    vault: string;
    receiver: string;
    balance: string;
  };
  symbol?: string;
  name?: string;
  description?: string;
  decimals?: number;
  logoURI?: string;
  tags?: string[];
  evmAddress?: string;
  evm_address?: string;
  flowAddress?: string;
};

export type BalanceMap = {
  [tokenId: string]: string;
};

// ExtendedTokenInfo is a intermediate type that combines Token information and pricing data.
export type ExtendedTokenInfo = TokenInfo & CoinItem;
