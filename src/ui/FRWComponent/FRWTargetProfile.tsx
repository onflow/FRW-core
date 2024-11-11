import React, { useState, useEffect } from 'react';
import { Box, Typography, Avatar, Skeleton } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../style/LLTheme';
import { makeStyles } from '@mui/styles';
import { useWallet, formatAddress, isEmoji } from 'ui/utils';

const tempEmoji = {
  emoji: '🥥',
  name: '',
  bgcolor: '',
};

export const FRWTargetProfile = ({ contact, isLoading = false, isEvm = false, fromEvm = '1' }) => {
  const usewallet = useWallet();
  const [emoji, setEmoji] = useState(tempEmoji);
  const [isload, setLoad] = useState(true);

  const getEmoji = async () => {
    setLoad(true);
    console.log('FRWTargetProfile ', isEvm, contact, emoji, fromEvm);
    if (isEvm) {
      const currentWallet = await usewallet.getEvmWallet();
      console.log('getEvmWallet ', currentWallet);
      const emojiObject = tempEmoji;
      emojiObject.emoji = currentWallet.icon;
      emojiObject.name = currentWallet.name;
      emojiObject.bgcolor = currentWallet.color;
      emojiObject['type'] = 'evm';
      setEmoji(emojiObject);
      setLoad(false);
    } else {
      const currentWallet = await usewallet.getCurrentWallet();
      const emojiObject = tempEmoji;
      emojiObject.emoji = currentWallet.icon;
      emojiObject.name = currentWallet.name;
      emojiObject.bgcolor = currentWallet.color;
      emojiObject['type'] = 'parent';
      setEmoji(emojiObject);
      setLoad(false);
    }

    console.log('emoji ', emoji);
  };

  useEffect(() => {
    getEmoji();
  }, [contact]);

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          px: '0',
          py: '8px',
          alignItems: 'center',
        }}
      >
        {!isLoading && !isload ? (
          <Box
            sx={{
              display: 'flex',
              height: '40px',
              width: '40px',
              borderRadius: '32px',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: emoji['bgcolor'],
            }}
          >
            <Typography sx={{ fontSize: '28px', fontWeight: '600' }}>
              {isEmoji(contact.avatar) ? contact.avatar : emoji.emoji}
            </Typography>
          </Box>
        ) : (
          <Skeleton variant="circular" width={40} height={40} />
        )}
        {!isLoading && !isload ? (
          <Typography sx={{ textAlign: 'start', color: '#FFFFFF', fontSize: '12px' }}>
            {isEmoji(contact.avatar) ? contact.contact_name : emoji.name}
          </Typography>
        ) : (
          <Skeleton variant="text" width={45} height={15} />
        )}

        {!isLoading && !isload ? (
          <Typography
            sx={{ lineHeight: '1', textAlign: 'start', fontSize: '12px', fontWeight: '400' }}
            color="#FFFFFFCC"
          >
            {`${formatAddress(contact.address)}`}
          </Typography>
        ) : (
          <Skeleton variant="text" width={45} height={15} />
        )}
        <Box sx={{ flexGrow: 1 }} />
      </Box>
    </ThemeProvider>
  );
};
