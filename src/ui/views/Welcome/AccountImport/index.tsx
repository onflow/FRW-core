import { Snackbar, Alert, Box } from '@mui/material';
import React, { useCallback, useEffect, useReducer } from 'react';
import { useHistory } from 'react-router-dom';

import { consoleError } from '@/shared/utils/console-log';
import AllSet from '@/ui/components/LandingPages/AllSet';
import GoogleBackup from '@/ui/components/LandingPages/GoogleBackup';
import LandingComponents from '@/ui/components/LandingPages/LandingComponents';
import PickUsername from '@/ui/components/LandingPages/PickUsername';
import SetPassword from '@/ui/components/LandingPages/SetPassword';
import {
  importProfileReducer,
  INITIAL_IMPORT_STATE,
  IMPORT_STEPS,
} from '@/ui/reducers/import-profile-reducer';
import { useWallet } from '@/ui/utils/WalletContext';

import Google from './Google';
import ImportTabs from './ImportTabs';

const AccountImport = () => {
  const history = useHistory();
  const usewallet = useWallet();

  const [state, dispatch] = useReducer(importProfileReducer, INITIAL_IMPORT_STATE);
  const {
    activeTab,
    mnemonic,
    pk,
    username,
    password,
    errMessage,
    showError,
    showGoogleImport,
    googleAccounts,
    path,
    phrase,
  } = state;
  const loadView = useCallback(async () => {
    usewallet
      .getCurrentAccount()
      .then((res) => {
        if (res) {
          history.push('/');
        }
      })
      .catch(() => {
        return;
      });
  }, [usewallet, history]);

  useEffect(() => {
    loadView();
  }, [loadView]);

  const handleErrorClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    dispatch({ type: 'SET_ERROR', payload: { message: '', show: false } });
  };

  const submitPassword = async (newPassword: string) => {
    dispatch({ type: 'SET_PASSWORD', payload: newPassword });
    try {
      if (pk) {
        await usewallet.importProfileUsingPrivateKey(username, newPassword, pk);
        dispatch({ type: 'SET_ACTIVE_TAB', payload: IMPORT_STEPS.ALL_SET });
      } else if (mnemonic) {
        await usewallet.importProfileUsingMnemonic(username, newPassword, mnemonic, path, phrase);
        dispatch({ type: 'SET_ACTIVE_TAB', payload: IMPORT_STEPS.GOOGLE_BACKUP });
      } else {
        throw new Error('No mnemonic or private key provided');
      }
    } catch (error) {
      consoleError(error);
      dispatch({
        type: 'SET_ERROR',
        payload: {
          message: 'An error occured importing your account. Please contact support.',
          show: true,
        },
      });
    }
  };

  const goBack = () => {
    if (activeTab === IMPORT_STEPS.GOOGLE_BACKUP || activeTab === IMPORT_STEPS.ALL_SET) {
      history.goBack();
      return;
    }
    dispatch({ type: 'GO_BACK' });
  };

  const handleGoogleAccountsFound = (accounts: string[]) => {
    dispatch({ type: 'SET_GOOGLE_IMPORT', payload: { show: true, accounts } });
  };

  if (showGoogleImport) {
    return (
      <Google
        accounts={googleAccounts}
        onBack={() =>
          dispatch({
            type: 'SET_GOOGLE_IMPORT',
            payload: { show: false, accounts: [] },
          })
        }
      />
    );
  }
  return (
    <LandingComponents
      activeIndex={Object.values(IMPORT_STEPS).indexOf(activeTab)}
      direction="right"
      showBackButton={activeTab !== IMPORT_STEPS.ALL_SET}
      onBack={goBack}
      showConfetti={activeTab === IMPORT_STEPS.ALL_SET}
      showRegisterHeader={true}
    >
      <Box>
        <>
          {activeTab === IMPORT_STEPS.IMPORT && (
            <ImportTabs
              setMnemonic={(m) => dispatch({ type: 'SET_MNEMONIC', payload: m })}
              setPk={(k) => dispatch({ type: 'SET_PK', payload: k })}
              setAccounts={(a) => dispatch({ type: 'SET_ACCOUNTS', payload: a })}
              goPassword={() =>
                dispatch({
                  type: 'SET_ACTIVE_TAB',
                  payload: IMPORT_STEPS.RECOVER_PASSWORD,
                })
              }
              handleSwitchTab={() =>
                dispatch({
                  type: 'SET_ACTIVE_TAB',
                  payload: IMPORT_STEPS.PICK_USERNAME,
                })
              }
              setErrorMessage={(msg) =>
                dispatch({
                  type: 'SET_ERROR',
                  payload: { message: msg, show: true },
                })
              }
              setShowError={(show) =>
                dispatch({ type: 'SET_ERROR', payload: { message: '', show } })
              }
              handleGoogleAccountsFound={handleGoogleAccountsFound}
              path={path}
              setPath={(p) => dispatch({ type: 'SET_DERIVATION_PATH', payload: p })}
              phrase={phrase}
              setPhrase={(p) => dispatch({ type: 'SET_PASSPHRASE', payload: p })}
            />
          )}

          {activeTab === IMPORT_STEPS.PICK_USERNAME && (
            <PickUsername
              handleSwitchTab={() =>
                dispatch({
                  type: 'SET_ACTIVE_TAB',
                  payload: IMPORT_STEPS.SET_PASSWORD,
                })
              }
              username={username}
              setUsername={(u) => dispatch({ type: 'SET_USERNAME', payload: u })}
            />
          )}

          {(activeTab === IMPORT_STEPS.SET_PASSWORD ||
            activeTab === IMPORT_STEPS.RECOVER_PASSWORD) && (
            <SetPassword
              handleSwitchTab={() => {}}
              onSubmit={submitPassword}
              isLogin={activeTab === IMPORT_STEPS.RECOVER_PASSWORD}
            />
          )}
          {activeTab === IMPORT_STEPS.GOOGLE_BACKUP && (
            <GoogleBackup
              handleSwitchTab={() =>
                dispatch({
                  type: 'SET_ACTIVE_TAB',
                  payload: IMPORT_STEPS.ALL_SET,
                })
              }
              mnemonic={mnemonic}
              username={username}
              password={password || ''}
            />
          )}

          {activeTab === IMPORT_STEPS.ALL_SET && <AllSet handleSwitchTab={() => window.close()} />}
        </>
      </Box>

      <Snackbar
        open={showError}
        onClose={handleErrorClose}
        autoHideDuration={5_000}
        data-testid="snackbar"
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleErrorClose} variant="filled" severity="error" sx={{ width: '100%' }}>
          {errMessage}
        </Alert>
      </Snackbar>
    </LandingComponents>
  );
};

export default AccountImport;
