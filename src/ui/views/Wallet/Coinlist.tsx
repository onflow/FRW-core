import {
  Typography,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemIcon,
  Skeleton,
  ListItemButton,
  List,
  IconButton,
} from '@mui/material';
import { Box } from '@mui/system';
import React, { type ReactNode, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { type CoinItem } from '@/shared/types/coin-types';
import { type ActiveAccountType } from '@/shared/types/wallet-types';
import { formatLargeNumber } from '@/shared/utils/number';
import { useCoins } from '@/ui/hooks/useCoinHook';
import { useProfiles } from '@/ui/hooks/useProfileHook';

import IconCreate from '../../../components/iconfont/IconCreate';
import { TokenValue } from '../TokenDetail/TokenValue';

const CoinList = ({
  tokenList,
  ableFt,
  isActive,
  childType,
}: {
  tokenList: CoinItem[];
  ableFt: any[];
  isActive: boolean;
  childType: ActiveAccountType;
}) => {
  // const wallet = useWallet();
  const { coins } = useCoins();
  const { noAddress } = useProfiles();
  const [isLoading, setLoading] = useState(true);
  const history = useHistory();

  useEffect(() => {
    setLoading(tokenList.length === 0);
    if (tokenList.length) {
      setLoading(false);
    }
  }, [tokenList]);

  const EndListItemText = (props: {
    primary: ReactNode;
    secondary: ReactNode;
    unit: string;
    change: number;
  }) => {
    return (
      <ListItemText
        disableTypography={true}
        primary={
          !isLoading ? (
            <Typography
              variant="body1"
              sx={{ fontSize: 14, fontWeight: '550', textAlign: 'end', color: 'text.title' }}
              data-testid={`coin-balance-${props.unit.toLowerCase()}`}
            >
              {formatLargeNumber(props.primary)} {props.unit.toUpperCase()}
            </Typography>
          ) : (
            <Skeleton variant="text" width={35} height={15} />
          )
        }
        secondary={
          !isLoading ? (
            <Typography
              variant="body1"
              sx={{ fontSize: 12, fontWeight: '500', textAlign: 'end', color: 'text.secondary' }}
            >
              {props.secondary === null || props.secondary === 0 ? '' : props.secondary}
            </Typography>
          ) : (
            <Skeleton variant="text" width={35} height={15} />
          )
        }
      />
    );
  };

  const StartListItemText = (props: { primary: string | null; price: number; change: number }) => {
    return (
      <ListItemText
        disableTypography={true}
        primary={
          !isLoading ? (
            <Typography
              variant="body1"
              sx={{
                fontSize: 14,
                fontWeight: '550',
                textAlign: 'start',
                color: 'text.title',
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {props.primary}
            </Typography>
          ) : (
            <Skeleton variant="text" width={45} height={15} />
          )
        }
        secondary={
          !isLoading ? (
            <Box sx={{ display: 'flex', gap: '3px' }}>
              {ableFt.some((item) => {
                const parts = item.id.split('.');
                return parts[2] && parts[2].includes(props.primary);
              }) ||
              isActive ||
              props.primary?.toLowerCase() === 'flow' ? (
                <Box sx={{ display: 'flex' }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: 12,
                      fontWeight: '500',
                      textAlign: 'start',
                      color: 'text.secondary',
                      marginRight: '6px',
                    }}
                  >
                    {props.change === null ? '-' : ''}
                    <TokenValue value={String(props.price)} prefix="$" />
                  </Typography>
                  {props.change !== 0 && (
                    <Typography
                      variant="body1"
                      sx={{
                        fontSize: 12,
                        fontWeight: '500',
                        textAlign: 'start',
                        color: props.change >= 0 ? 'text.increase' : 'text.decrease',
                      }}
                    >
                      {props.change === null ? '' : props.change >= 0 ? '+' : ''}
                      {props.change}
                      {props.change !== null ? '%' : ''}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    color: 'neutral.text',
                    marginTop: '2px',
                    fontSize: '10px',
                    fontFamily: 'Inter, sans-serif',
                    backgroundColor: 'neutral1.light',
                  }}
                >
                  {chrome.i18n.getMessage('Inaccessible')}
                </Box>
              )}
            </Box>
          ) : (
            <Skeleton variant="text" width={75} height={15} />
          )
        }
      />
    );
  };

  return (
    <>
      {childType === 'main' && (
        <Box sx={{ display: 'flex', px: '12px', pt: '4px' }}>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={() => history.push('dashboard/tokenList')}>
            <IconCreate size={16} color="#787878" />
          </IconButton>
        </Box>
      )}
      {childType === 'evm' && (
        <Box sx={{ display: 'flex', px: '12px', pt: '4px' }}>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={() => history.push('dashboard/addcustomevm')}>
            <IconCreate size={16} color="#787878" />
          </IconButton>
        </Box>
      )}

      <List sx={{ paddingTop: '0px', paddingBottom: '0px' }}>
        {noAddress ? (
          <ListItem sx={{ justifyContent: 'center', minHeight: '62px' }}>
            <Typography variant="body1" color="text.secondary">
              {chrome.i18n.getMessage('No_address_found')}
            </Typography>
          </ListItem>
        ) : !isLoading ? (
          (coins || []).map((coin: CoinItem) => {
            if (
              childType === 'evm' &&
              coin.id !== 'A.1654653399040a61.FlowToken' &&
              parseFloat(coin.balance) === 0 &&
              !coin.custom
            ) {
              return null;
            }
            return (
              <ListItem
                sx={{ minHeight: '62px' }}
                key={coin.id}
                data-testid={`token-${coin.unit.toLowerCase()}`}
                secondaryAction={
                  <EndListItemText
                    primary={parseFloat(coin.balance).toFixed(3)}
                    secondary={String(coin.total)}
                    unit={coin.unit}
                    change={parseFloat(coin.change24h?.toFixed(2) || '0')}
                  />
                }
                disablePadding
                onClick={() =>
                  history.push(`dashboard/tokendetail/${coin.unit.toLowerCase()}/${coin.id}`)
                }
              >
                <ListItemButton sx={{ paddingRight: '0px' }} dense={true}>
                  <ListItemIcon>
                    {!isLoading ? (
                      <img
                        src={coin.icon}
                        style={{
                          height: '36px',
                          width: '36px',
                          backgroundColor: '#282828',
                          borderRadius: '18px',
                        }}
                      />
                    ) : (
                      <Skeleton variant="circular" width={36} height={36} />
                    )}
                  </ListItemIcon>
                  <StartListItemText
                    primary={coin.coin}
                    price={coin.price}
                    change={parseFloat(coin.change24h?.toFixed(2) || '0')}
                  />
                </ListItemButton>
              </ListItem>
            );
          })
        ) : (
          [1, 2].map((index) => {
            return (
              <ListItem
                key={index}
                secondaryAction={
                  <EndListItemText primary="..." secondary="..." unit="..." change={0} />
                }
              >
                <ListItemAvatar>
                  <Skeleton variant="circular" width={36} height={36} />
                </ListItemAvatar>
                <StartListItemText primary="..." price={0} change={0} />
              </ListItem>
            );
          })
        )}
      </List>
    </>
  );
};

export default CoinList;
