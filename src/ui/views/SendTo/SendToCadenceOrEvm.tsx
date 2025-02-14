import { Box, Button, Typography, CardMedia } from '@mui/material';
import BN from 'bignumber.js';
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';

import { type TransactionState } from '@/shared/types/transaction-types';
import { isValidAddress, isValidEthereumAddress } from '@/shared/utils/address';
import { LLHeader } from '@/ui/FRWComponent';
import { ContactCard } from '@/ui/FRWComponent/Send/ContactCard';
import SlideRelative from '@/ui/FRWComponent/SlideRelative';
import { useContacts } from '@/ui/hooks/useContactHook';
import { useNetworks } from '@/ui/hooks/useNetworkHook';
import { useWallet } from 'ui/utils';

import CancelIcon from '../../../components/iconfont/IconClose';
import { TokenValue } from '../TokenDetail/TokenValue';

import TransferAmount from './TransferAmount';
import TransferConfirmation from './TransferConfirmation';

const SendToCadenceOrEvm = ({
  transactionState,
  handleAmountChange,
  handleTokenChange,
  handleSwitchFiatOrCoin,
  handleMaxClick,
}: {
  transactionState: TransactionState;
  handleAmountChange: (amountString: string) => void;
  handleTokenChange: (tokenAddress: string) => void;
  handleSwitchFiatOrCoin: () => void;
  handleMaxClick: () => void;
}) => {
  const history = useHistory();
  const wallet = useWallet();
  const { currentNetwork: network } = useNetworks();
  const { useContact } = useContacts();
  const contactData =
    useContact(transactionState.toContact?.address || '') || transactionState.toContact || null;
  const [isConfirmationOpen, setConfirmationOpen] = useState(false);
  const [validated, setValidated] = useState<boolean | null>(null);

  useEffect(() => {
    // validate the address when the to address changes
    let mounted = true;
    const checkAddress = async () => {
      //wallet controller api
      try {
        if (transactionState.toNetwork === 'Evm') {
          // We're sending to an EVM network. Check the address format
          setValidated(!!isValidEthereumAddress(transactionState.toAddress));
        } else {
          // We're sending to a Flow network. Check the network itself
          const isValidFlowAddress = await wallet.checkAddress(transactionState.toAddress);
          if (mounted) {
            setValidated(!!isValidFlowAddress);
          }
        }
      } catch (err) {
        console.error('checkAddress error', err);
        setValidated(false);
      }
    };
    if (isValidAddress(transactionState.toAddress)) {
      checkAddress();
    }
    return () => {
      mounted = false;
    };
  }, [transactionState.toAddress, transactionState.toNetwork, wallet]);

  return (
    <div className="page">
      <>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <LLHeader title={chrome.i18n.getMessage('Send_to')} help={true} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', px: '16px' }}>
            <Box>
              <Box sx={{ zIndex: 999, backgroundColor: '#121212' }}>
                {transactionState.toContact && (
                  <ContactCard contact={contactData} coinInfo={transactionState.coinInfo} />
                )}
              </Box>

              <SlideRelative show={validated !== null && !validated} direction="down">
                <Box
                  sx={{
                    width: '95%',
                    backgroundColor: 'error.light',
                    mx: 'auto',
                    borderRadius: '0 0 12px 12px',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <CancelIcon size={24} color={'#E54040'} style={{ margin: '8px' }} />
                    <Typography variant="body1" color="text.secondary">
                      {chrome.i18n.getMessage('Invalid_address_in')}
                      {` ${network}`}
                    </Typography>
                  </Box>
                </Box>
              </SlideRelative>
            </Box>

            <Typography
              variant="body1"
              sx={{
                alignSelf: 'start',
                fontSize: '14px',
              }}
            >
              {chrome.i18n.getMessage('Transfer__Amount')}
            </Typography>
            {transactionState.coinInfo.unit && (
              <TransferAmount
                transactionState={transactionState}
                handleAmountChange={handleAmountChange}
                handleTokenChange={handleTokenChange}
                handleSwitchFiatOrCoin={handleSwitchFiatOrCoin}
                handleMaxClick={handleMaxClick}
              />
            )}

            {transactionState.coinInfo.unit && (
              <>
                <Typography
                  variant="body1"
                  sx={{
                    alignSelf: 'start',
                    fontSize: '14px',
                  }}
                >
                  {chrome.i18n.getMessage('Available__Balance')}
                </Typography>

                <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <CardMedia
                    sx={{ width: '18px', height: '18px' }}
                    image={transactionState.coinInfo.icon}
                  />
                  <Typography
                    variant="body1"
                    sx={{
                      alignSelf: 'start',
                      fontSize: '15px',
                    }}
                  >
                    <TokenValue
                      value={transactionState.coinInfo.balance}
                      postFix={transactionState.coinInfo.unit.toUpperCase()}
                    />
                    {' ≈ '}
                    <TokenValue value={transactionState.coinInfo.total} prefix={'$'} />
                  </Typography>
                </Box>
              </>
            )}
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', gap: '8px', mx: '18px', mb: '35px', mt: '10px' }}>
            <Button
              onClick={history.goBack}
              variant="contained"
              // @ts-expect-error custom color
              color="neutral"
              size="large"
              sx={{
                height: '48px',
                borderRadius: '8px',
                flexGrow: 1,
                textTransform: 'capitalize',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} color="text.primary">
                {chrome.i18n.getMessage('Cancel')}
              </Typography>
            </Button>

            <Button
              onClick={() => {
                setConfirmationOpen(true);
              }}
              variant="contained"
              color="success"
              size="large"
              sx={{
                height: '48px',
                flexGrow: 1,
                borderRadius: '8px',
                textTransform: 'capitalize',
              }}
              disabled={
                validated === null ||
                transactionState.balanceExceeded === true ||
                transactionState.amount === null ||
                new BN(transactionState.amount || '-1').isLessThanOrEqualTo(0)
              }
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} color="text.primary">
                {chrome.i18n.getMessage('Next')}
              </Typography>
            </Button>
          </Box>
          {validated !== null && validated && (
            <TransferConfirmation
              isConfirmationOpen={isConfirmationOpen}
              transactionState={transactionState}
              handleCloseIconClicked={() => setConfirmationOpen(false)}
            />
          )}
        </Box>
      </>
    </div>
  );
};

export default SendToCadenceOrEvm;
