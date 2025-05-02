import { Typography, Button, Skeleton, Drawer, CardMedia, Tabs, Tab } from '@mui/material';
import { Box } from '@mui/system';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { IconActivity, IconNfts } from '@/components/iconfont';
import eventBus from '@/eventBus';
import {
  type ActiveAccountType,
  type ActiveChildType_depreciated,
} from '@/shared/types/wallet-types';
import { formatLargeNumber } from '@/shared/utils/number';
import { ButtonRow } from '@/ui/FRWComponent/ButtonRow';
import CoinsIcon from '@/ui/FRWComponent/CoinsIcon';
import LLComingSoon from '@/ui/FRWComponent/LLComingSoonWarning';
import { NumberTransition } from '@/ui/FRWComponent/NumberTransition';
import { useInitHook } from '@/ui/hooks';
import { useCoins } from '@/ui/hooks/useCoinHook';
import { useProfiles } from '@/ui/hooks/useProfileHook';
import { useWallet } from '@/ui/utils';

import { withPrefix } from '../../../shared/utils/address';
import theme from '../../style/LLTheme';
import MoveBoard from '../MoveBoard';
import NFTTab from '../NFT';
import NftEvm from '../NftEvm';

import CoinList from './Coinlist';
import OnRampList from './OnRampList';
import TransferList from './TransferList';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      style={{ height: '100%', display: value === index ? 'block' : 'none' }}
      {...other}
    >
      {children}
    </div>
  );
}
const WalletTab = ({ network }) => {
  const wallet = useWallet();
  const history = useHistory();
  const location = useLocation();
  const { initializeStore } = useInitHook();
  const { coins, balance, coinsLoaded } = useCoins();
  const { childAccounts, evmWallet, currentWallet, noAddress, registerStatus } = useProfiles();
  const [value, setValue] = React.useState(0);

  const [address, setAddress] = useState<string>('');
  const [accessible, setAccessible] = useState<any>([]);
  const [childType, setChildType] = useState<ActiveAccountType>('main');
  const [alertOpen, setAlertOpen] = useState<boolean>(false);
  const [, setChildAccount] = useState<any>({});
  const [isOnRamp, setOnRamp] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showMoveBoard, setMoveBoard] = useState(false);
  const [buyHover, setBuyHover] = useState(false);
  const [sendHover, setSendHover] = useState(false);
  const [swapHover, setSwapHover] = useState(false);
  const [canMoveChild, setCanMoveChild] = useState(true);
  const [receiveHover, setReceiveHover] = useState(false);
  const [childStateLoading, setChildStateLoading] = useState<boolean>(false);

  const incLink =
    network === 'mainnet' ? 'https://app.increment.fi/swap' : 'https://demo.increment.fi/swap';

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleChangeIndex = (index) => {
    setValue(index);
  };

  const setUserAddress = useCallback(async () => {
    let data = '';
    try {
      if (childType === 'evm') {
        data = evmWallet?.address ?? '';
      } else {
        data = currentWallet?.address ?? '';
      }
    } catch (error) {
      console.error('Error getting address:', error);
      data = '';
    }
    if (data) {
      setAddress(withPrefix(data) || '');
    }
    return data;
  }, [childType, evmWallet, currentWallet]);

  //todo: move to util
  const pollingFunction = (func, time = 1000, endTime, immediate = false) => {
    if (immediate) {
      func();
    }
    const startTime = new Date().getTime();
    const pollTimer = setInterval(async () => {
      const nowTime = new Date().getTime();
      const data = await func();
      if ((data && data.length > 2) || nowTime - startTime >= endTime) {
        if (pollTimer) {
          clearInterval(pollTimer);
        }
        eventBus.emit('addressDone');
      }
    }, time);
    return pollTimer;
  };

  const fetchWallet = useCallback(async () => {
    // If childType is 'evm', handle it first
    const activeAccountType = await wallet.getActiveAccountType();
    if (activeAccountType === 'evm') {
      return;
      // If not 'evm', check if it's not active
    } else if (activeAccountType === 'child') {
      // Child wallet
      const ftResult = await wallet.checkAccessibleFt(address);
      if (ftResult) {
        setAccessible(ftResult);
      }
    }

    // Handle all non-evm and non-active cases here
  }, [address, wallet]);

  const fetchChildState = useCallback(async () => {
    setChildStateLoading(true);
    const accountType = await wallet.getActiveAccountType();
    setChildAccount(childAccounts);
    setChildType(accountType);
    if (accountType !== 'main' && accountType !== 'evm') {
      setIsActive(false);
    } else {
      setIsActive(true);
    }
    setChildStateLoading(false);
    return accountType;
  }, [wallet, childAccounts]);

  useEffect(() => {
    fetchChildState();
    const pollTimer = pollingFunction(setUserAddress, 5000, 300000, true);

    if (location.search.includes('activity')) {
      setValue(2);
    }

    return function cleanup() {
      clearInterval(pollTimer);
    };
  }, [fetchChildState, location.search, setUserAddress, setValue]);

  useEffect(() => {
    // First call after 40 seconds
    const initialTimer = setTimeout(() => {
      const pollTimer = setInterval(() => {
        if (!address) {
          // Only call if address is empty
          initializeStore();
        }
      }, 10000); // Then call every 10 seconds

      // Cleanup interval when component unmounts
      return () => clearInterval(pollTimer);
    }, 40000);

    // Cleanup timeout when component unmounts
    return () => clearTimeout(initialTimer);
  }, [initializeStore, address]);

  const goMoveBoard = async () => {
    setMoveBoard(true);
  };

  const filteredCoinData = coins.filter((coin) => {
    if (childType === 'evm' && coin.unit !== 'flow' && Number(coin.balance) === 0 && !coin.custom) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (address && coinsLoaded) {
      fetchWallet();
    }
  }, [address, coinsLoaded, fetchWallet]);

  useEffect(() => {
    setUserAddress();
  }, [childType, setUserAddress]);

  useEffect(() => {
    const checkPermission = async () => {
      if (!(await wallet.isUnlocked())) {
        console.log('Wallet is locked');
        return;
      }
      if (!(await wallet.getParentAddress())) {
        console.log('Wallet Tab - No main wallet yet');
        return;
      }
      const result = await wallet.checkCanMoveChild();
      setCanMoveChild(result);
    };

    checkPermission();
  }, [wallet]);

  useEffect(() => {
    // Add event listener for opening onramp
    const onRampHandler = () => setOnRamp(true);
    eventBus.addEventListener('openOnRamp', onRampHandler);

    // Clean up listener
    return () => {
      eventBus.removeEventListener('openOnRamp', onRampHandler);
    };
  }, []);

  const handleAddAddress = () => {
    wallet.createManualAddress();
  };

  return (
    <Box
      test-id="wallet-tab"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'black',
        width: '100%',
        height: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          // Fix the height to prevent small pixel scrolling issue
          height: '151px',
          backgroundColor: 'background.default',
        }}
      >
        <Typography
          variant="body1"
          sx={{
            py: '8px',
            alignSelf: 'center',
            fontSize: '32px',
            fontWeight: 'semi-bold',
          }}
        >
          {noAddress ? (
            registerStatus ? (
              <Typography
                variant="body1"
                sx={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#777E90',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {chrome.i18n.getMessage('Address_creation_in_progress')}
              </Typography>
            ) : (
              <Button variant="contained" onClick={handleAddAddress}>
                {chrome.i18n.getMessage('Add_address')}
              </Button>
            )
          ) : coinsLoaded ? (
            `$${formatLargeNumber(balance)}`
          ) : (
            <Skeleton variant="text" width={100} />
          )}
        </Typography>

        <ButtonRow
          isActive={isActive}
          onSendClick={() => history.push('/dashboard/token/flow/send')}
          onReceiveClick={() => history.push('/dashboard/wallet/deposit')}
          onSwapClick={() => window.open(incLink, '_blank', 'noopener,noreferrer')}
          onBuyClick={() => setOnRamp(true)}
          onMoveClick={() => goMoveBoard()}
          canMoveChild={canMoveChild}
        />
      </Box>
      <Tabs
        value={value}
        sx={{
          width: '100%',
          position: 'sticky',
          top: '0',
          zIndex: 1100,
          backgroundColor: 'black',
          '& .MuiTab-root': {
            minHeight: '48px',
            color: '#777E90',
            opacity: 1,
            position: 'relative',
            gap: '8px',
            '&.Mui-selected': {
              color: '#FFFFFF',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '2px',
                backgroundColor: '#FFFFFF',
              },
            },
          },
        }}
        onChange={handleChange}
        TabIndicatorProps={{
          style: {
            display: 'none',
          },
        }}
        variant="fullWidth"
        aria-label="full width tabs example"
      >
        <Tab
          icon={
            <CoinsIcon width="20px" height="20px" color={value === 0 ? '#FFFFFF' : '#777E90'} />
          }
          iconPosition="start"
          label={
            <Typography
              variant="body1"
              sx={{
                textTransform: 'capitalize',
                fontSize: '14px',
                fontWeight: 500,
                color: value === 0 ? '#FFFFFF' : '#777E90',
              }}
            >
              {chrome.i18n.getMessage('coins')}
            </Typography>
          }
        />
        <Tab
          icon={
            <IconNfts
              sx={{
                width: '20px',
                height: '20px',
              }}
              color={value === 1 ? '#FFFFFF' : '#777E90'}
            />
          }
          iconPosition="start"
          label={
            <Typography
              variant="body1"
              sx={{
                textTransform: 'capitalize',
                fontSize: '14px',
                fontWeight: 500,
                color: value === 1 ? '#FFFFFF' : '#777E90',
              }}
            >
              {chrome.i18n.getMessage('NFTs')}
            </Typography>
          }
        />
        <Tab
          icon={
            <IconActivity
              sx={{
                width: '20px',
                height: '20px',
              }}
              color={value === 2 ? '#FFFFFF' : '#777E90'}
            />
          }
          iconPosition="start"
          label={
            <Typography
              variant="body1"
              sx={{
                textTransform: 'capitalize',
                fontSize: '14px',
                fontWeight: 500,
                color: value === 2 ? '#FFFFFF' : '#777E90',
              }}
            >
              {chrome.i18n.getMessage('Activity')}
            </Typography>
          }
        />
      </Tabs>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TabPanel value={value} index={0}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            {value === 0 && (
              <CoinList
                tokenList={coins}
                ableFt={accessible}
                isActive={isActive}
                childType={childType}
              />
            )}
          </Box>
        </TabPanel>
        <TabPanel value={value} index={1}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            {value === 1 && (childType === 'evm' ? <NftEvm /> : <NFTTab />)}
          </Box>
        </TabPanel>
        <TabPanel value={value} index={2}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>{value === 2 && <TransferList />}</Box>
        </TabPanel>
      </Box>
      <LLComingSoon alertOpen={alertOpen} handleCloseIconClicked={() => setAlertOpen(false)} />

      <Drawer
        anchor="bottom"
        open={isOnRamp}
        transitionDuration={300}
        PaperProps={{
          sx: {
            width: '100%',
            height: '65%',
            bgcolor: 'background.default',
            borderRadius: '18px 18px 0px 0px',
          },
        }}
      >
        <OnRampList close={() => setOnRamp(false)} />
      </Drawer>
      {showMoveBoard && (
        <MoveBoard
          showMoveBoard={showMoveBoard}
          handleCloseIconClicked={() => setMoveBoard(false)}
          handleCancelBtnClicked={() => setMoveBoard(false)}
          handleAddBtnClicked={() => {
            setMoveBoard(false);
          }}
        />
      )}
    </Box>
  );
};

export default WalletTab;
