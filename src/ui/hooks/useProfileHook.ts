import { useCallback, useEffect, useRef } from 'react';

import storage from '@/background/webapi/storage';
import type {
  ChildAccount,
  BlockchainResponse,
  WalletResponse,
} from '@/shared/types/network-types';
import { UserWalletStore, type FlowAddress, type PubKeyAccount } from '@/shared/types/wallet-types';
import { ensureEvmAddressPrefix, withPrefix } from '@/shared/utils/address';
import { retryOperation } from '@/shared/utils/retryOperation';
import { useNetwork } from '@/ui/hooks/useNetworkHook';
import { useProfileStore } from '@/ui/stores/profileStore';
import { useWallet, useWalletLoaded } from '@/ui/utils/WalletContext';

export const useProfiles = () => {
  const profilesRef = useRef({
    initialized: false,
    loading: false,
  });

  const usewallet = useWallet();
  const walletLoaded = useWalletLoaded();
  const { network } = useNetwork();

  // Action selectors
  const setMainAddress = useProfileStore((state) => state.setMainAddress);
  const setEvmAddress = useProfileStore((state) => state.setEvmAddress);
  const setInitial = useProfileStore((state) => state.setInitial);
  const setChildAccount = useProfileStore((state) => state.setChildAccount);
  const setCurrent = useProfileStore((state) => state.setCurrent);
  const setEvmWallet = useProfileStore((state) => state.setEvmWallet);
  const setMainLoading = useProfileStore((state) => state.setMainLoading);
  const setEvmLoading = useProfileStore((state) => state.setEvmLoading);
  const setUserInfo = useProfileStore((state) => state.setUserInfo);
  const setOtherAccounts = useProfileStore((state) => state.setOtherAccounts);
  const setLoggedInAccounts = useProfileStore((state) => state.setLoggedInAccounts);
  const setWalletList = useProfileStore((state) => state.setWalletList);
  const setParentWallet = useProfileStore((state) => state.setParentWallet);
  const clearProfileData = useProfileStore((state) => state.clearProfileData);

  // State selectors
  const initialStart = useProfileStore((state) => state.initialStart);
  const currentWallet = useProfileStore((state) => state.currentWallet);
  const mainAddress = useProfileStore((state) => state.mainAddress);
  const evmAddress = useProfileStore((state) => state.evmAddress);
  const childAccounts = useProfileStore((state) => state.childAccounts);
  const evmWallet = useProfileStore((state) => state.evmWallet);
  const userInfo = useProfileStore((state) => state.userInfo);
  const otherAccounts = useProfileStore((state) => state.otherAccounts);
  const loggedInAccounts = useProfileStore((state) => state.loggedInAccounts);
  const walletList = useProfileStore((state) => state.walletList);
  const parentWallet = useProfileStore((state) => state.parentWallet);
  const currentWalletIndex = useProfileStore((state) => state.currentWalletIndex);
  const evmLoading = useProfileStore((state) => state.evmLoading);
  const mainAddressLoading = useProfileStore((state) => state.mainAddressLoading);

  /**
   * Formats wallet data for UI display
   * @param data Raw wallet data from blockchain
   * @returns Array of formatted wallet objects with UI-friendly properties
   * Used by freshUserWallet to standardize wallet display format
   */
  const formatWallets = useCallback((data: PubKeyAccount[]) => {
    if (!Array.isArray(data)) {
      return [];
    }

    const result = data.map((wallet, index) => ({
      id: index,
      name: wallet.name || 'Wallet',
      address: withPrefix(wallet.address),
      key: index,
      icon: wallet.icon || '',
      color: wallet.color || '',
    }));
    return result;
  }, []);

  /**
   * Sets up Ethereum Virtual Machine (EVM) wallet
   * @param mainAddress The main wallet address to associate with EVM wallet
   * @returns EVM wallet data object
   * Called during initial profile setup and wallet creation
   */
  const setupEvmWallet = useCallback(
    async (mainAddress: FlowAddress) => {
      try {
        const [evmRes, emoji] = await Promise.all([
          usewallet.queryEvmAddress(mainAddress),
          usewallet.getEmoji(),
        ]);

        const evmAddress = ensureEvmAddressPrefix(evmRes!);

        const evmWalletData: PubKeyAccount = {
          name: emoji[9].name,
          icon: emoji[9].emoji,
          address: evmAddress,
          chain: network === 'testnet' ? 545 : 747,
          id: 1,
          color: emoji[9].bgcolor,
          keyIndex: 0,
          weight: 1,
          pubK: '',
          sigAlgo: 'ECDSA_P256',
          hashAlgo: 'SHA3_256',
        };

        await Promise.all([setEvmWallet(evmWalletData), setEvmAddress(evmAddress)]);
        setEvmLoading(false);

        return evmWalletData;
      } catch (error) {
        throw error;
      }
    },
    [usewallet, network, setEvmWallet, setEvmAddress, setEvmLoading]
  );

  const fetchProfileData = useCallback(async () => {
    if (profilesRef.current.loading || !usewallet || !walletLoaded) {
      return;
    }

    try {
      profilesRef.current.loading = true;
      const mainAddress = await usewallet.getMainAddress();
      if (mainAddress) {
        setMainAddress(mainAddress);
        await setupEvmWallet(mainAddress);

        const childresp: ChildAccount = await usewallet.checkUserChildAccount();
        setChildAccount(childresp);

        const parentAddress = await usewallet.getParentAddress();
        if (parentAddress) {
          const [currentWallet, isChild] = await Promise.all([
            usewallet.getCurrentWallet(),
            usewallet.getActiveWallet(),
          ]);

          if (currentWallet) {
            const mainwallet = await usewallet.returnParentWallet();
            setParentWallet(mainwallet!);
            await setCurrent(currentWallet);

            const [keys, pubKTuple] = await Promise.all([
              usewallet.getAccount(),
              usewallet.getPubKey(),
            ]);

            const walletData = await retryOperation(() => usewallet.getUserInfo(true), 3, 1000);

            const { otherAccounts, wallet, loggedInAccounts } =
              await usewallet.openapi.freshUserInfo(
                parentAddress,
                keys,
                pubKTuple,
                walletData,
                isChild
              );

            await Promise.all([
              setOtherAccounts(otherAccounts),
              setUserInfo(wallet),
              setLoggedInAccounts(loggedInAccounts),
            ]);
          }
        }
      }

      const wallets = await usewallet.getUserWallets();
      if (!wallets) {
        throw new Error('No wallets found');
      }

      if (initialStart) {
        await usewallet.openapi.putDeviceInfo(wallets);
        setInitial(false);
      }

      const formattedWallets = formatWallets(wallets);
      setWalletList(formattedWallets);
    } catch (error) {
      console.error('Error in fetchProfileData:', error);
    } finally {
      setMainLoading(false);
      profilesRef.current.loading = false;
    }
  }, [
    usewallet,
    walletLoaded,
    setMainAddress,
    setupEvmWallet,
    initialStart,
    setInitial,
    formatWallets,
    setWalletList,
    setChildAccount,
    setCurrent,
    setMainLoading,
    setOtherAccounts,
    setParentWallet,
    setUserInfo,
    setLoggedInAccounts,
  ]);

  return {
    fetchProfileData,
    clearProfileData,
    initialStart,
    currentWallet,
    mainAddress,
    evmAddress,
    childAccounts,
    evmWallet,
    userInfo,
    otherAccounts,
    loggedInAccounts,
    walletList,
    parentWallet,
    currentWalletIndex,
    evmLoading,
    mainAddressLoading,
  };
};
