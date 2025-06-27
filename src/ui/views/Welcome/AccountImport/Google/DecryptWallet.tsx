import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Button, Typography, IconButton, Input, InputAdornment, FormGroup } from '@mui/material';
import { Box } from '@mui/system';
import React, { useEffect, useState } from 'react';

import { DEFAULT_PASSWORD } from '@/shared/utils/default';
import CancelIcon from '@/ui/components/iconfont/IconClose';
import { PasswordInput } from '@/ui/components/PasswordComponents';
import SlideRelative from '@/ui/components/SlideRelative';
import { useWallet } from 'ui/utils';

const DecryptWallet = ({ handleSwitchTab, setMnemonic, username }) => {
  const usewallet = useWallet();

  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [isCharacters, setCharacters] = useState(false);
  // const [isCheck, setCheck] = useState(false);
  const [isLoading, setLoading] = useState(false);

  const errorInfo = (message) => {
    return (
      <Box
        sx={{
          width: '95%',
          backgroundColor: 'error.light',
          mx: 'auto',
          borderRadius: '0 0 12px 12px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <CancelIcon size={24} color={'#E54040'} style={{ margin: '8px' }} />
        <Typography variant="body1" color="error.main">
          {message}
        </Typography>
      </Box>
    );
  };

  const [helperText, setHelperText] = useState(<div />);

  const decryptWallet = async () => {
    setLoading(true);

    try {
      const mnemonic = await usewallet.restoreAccount(username, password);
      setLoading(false);
      setMnemonic(mnemonic);
      handleSwitchTab();
    } catch (e) {
      setLoading(false);
      setHelperText(
        errorInfo(chrome.i18n.getMessage('Incorrect__decrypt__password__please__try__again'))
      );
    }
  };

  useEffect(() => {
    if (password.length < 8) {
      setHelperText(
        errorInfo(chrome.i18n.getMessage('The__decrypt__password__should__be__8__characters__long'))
      );
      setCharacters(false);
    } else {
      setHelperText(<div />);
      setCharacters(true);
    }
  }, [password]);

  return (
    <>
      <Box className="registerBox">
        <Typography variant="h4">
          {chrome.i18n.getMessage('Welcome__Back')}
          <Box display="inline" color="primary.main">
            {username}
          </Box>{' '}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {chrome.i18n.getMessage('Please__enter__your__password__to__decrypt')}
        </Typography>

        <Box
          sx={{
            flexGrow: 1,
            width: 640,
            maxWidth: '100%',
            my: '32px',
            display: 'flex',
          }}
        >
          <FormGroup sx={{ width: '100%' }}>
            <PasswordInput
              value={password}
              onChange={setPassword}
              isVisible={isPasswordVisible}
              setVisible={setPasswordVisible}
              autoFocus={true}
              placeholder={chrome.i18n.getMessage('Enter__Your__Password')}
            />
            <SlideRelative direction="down" show={!!password}>
              {helperText}
            </SlideRelative>
          </FormGroup>
        </Box>

        <Box sx={{ flexGrow: 1 }} />
        <Button
          className="registerButton"
          onClick={decryptWallet}
          disabled={!isCharacters}
          variant="contained"
          color="secondary"
          size="large"
          sx={{
            height: '56px',
            borderRadius: '12px',
            width: '640px',
            textTransform: 'capitalize',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} color="background.paper">
            {chrome.i18n.getMessage('Restore__My__Wallet')}
          </Typography>
        </Button>
      </Box>
    </>
  );
};

export default DecryptWallet;
