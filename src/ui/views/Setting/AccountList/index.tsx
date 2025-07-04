import { Box } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { type Emoji, type WalletAccount } from '@/shared/types/wallet-types';
import { isValidEthereumAddress } from '@/shared/utils/address';
import storage from '@/shared/utils/storage';
import { LLHeader } from '@/ui/components';
import { AccountListing } from '@/ui/components/account/account-listing';
import IconEnd from '@/ui/components/iconfont/IconAVector11Stroke';
import { useWallet } from '@/ui/hooks/use-wallet';
import { useProfiles } from '@/ui/hooks/useProfileHook';

const tempEmoji: Emoji[] = [
  {
    emoji: '🥥',
    name: 'Coconut',
    bgcolor: '#FFE4C4',
  },
  {
    emoji: '🥑',
    name: 'Avocado',
    bgcolor: '#98FB98',
  },
];

const AccountList = () => {
  const usewallet = useWallet();
  const { currentWallet, walletList, network } = useProfiles();
  const [emojis, setEmojis] = useState<Emoji[]>(tempEmoji);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();

  const handleAccountClick = (clickedAccount: WalletAccount, parentAccount?: WalletAccount) => {
    // Find the emoji by name (clickedAccount.name should match emoji.name)
    const emojiIndex = emojis.findIndex((emoji) => emoji.name === clickedAccount.name);

    if (emojiIndex !== -1) {
      const selectedEmoji = emojis[emojiIndex];
      const walletDetailInfo = { wallet: clickedAccount, selectedEmoji };
      storage.set('walletDetail', JSON.stringify(walletDetailInfo));
    }

    if (parentAccount && clickedAccount.address !== parentAccount.address) {
      // Check if this is an EVM account or a Flow linked account
      if (isValidEthereumAddress(clickedAccount.address)) {
        navigate(`/dashboard/setting/accountlist/detail/${clickedAccount.address}`);
      } else {
        // For Flow linked accounts, navigate to linked detail page with parent address name
        const parentName = parentAccount.name || '';
        navigate(
          `/dashboard/setting/accountlist/linkeddetail/${clickedAccount.address}?parentName=${encodeURIComponent(parentName)}&parentAddress=${encodeURIComponent(parentAccount.address)}`
        );
      }
    } else {
      // For main accounts, navigate to account detail page
      navigate(`/dashboard/setting/accountlist/detail/${clickedAccount.address}`);
    }
  };

  const setUserWallet = useCallback(async () => {
    await usewallet.setDashIndex(3);
    const emojires = await usewallet.getEmoji();
    setEmojis(emojires);
    setIsInitialized(true);
  }, [usewallet]);

  useEffect(() => {
    setUserWallet();
  }, [setUserWallet]);

  return (
    <div className="page">
      <LLHeader
        title={chrome.i18n.getMessage('Acc__list')}
        help={false}
        goBackLink="/dashboard/setting"
      />
      <Box
        sx={{
          gap: '0px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AccountListing
          network={network}
          accountList={walletList}
          activeAccount={currentWallet}
          onAccountClick={handleAccountClick}
          onAccountClickSecondary={handleAccountClick}
          showActiveAccount={false}
          itemSx={{
            display: 'flex',
            padding: '10px',
            flexDirection: 'column',
            gap: '18px',
            alignSelf: 'stretch',
            borderRadius: '16px',
            border: '1px solid #1A1A1A',
            background: 'rgba(255, 255, 255, 0.10)',
          }}
          secondaryIcon={<IconEnd size={12} color="#bababa" />}
          ignoreHidden={true}
        />
      </Box>
    </div>
  );
};

export default AccountList;
