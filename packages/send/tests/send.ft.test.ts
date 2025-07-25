import dotenv from 'dotenv';
import { describe, it, expect, beforeEach } from 'vitest';

import { configureFCL, SendTransaction } from '../src';
// import { getTrx } from '../src/utils';
import { accounts } from '../src/utils/accounts';

dotenv.config();

const mainAccount = accounts.main;
// const child1Account = accounts.child1;
// const child2Account = accounts.child2;

describe('Test send strategies', () => {
  beforeEach(() => {
    configureFCL('mainnet');
  });

  // it('Test send FLow from main account to main account', async () => {
  //   const payload = {
  //     type: 'token', // Asset type: token or NFT
  //     assetType: 'flow', // Network type: Flow blockchain or EVM chain
  //     proposer: mainAccount.address, // Flow address of the transaction proposer/signer
  //     receiver: mainAccount.address, // Recipient address (Flow or EVM format)
  //     flowIdentifier: 'A.1654653399040a61.FlowToken.Vault', // Flow resource identifier (e.g., vault
  //     sender: mainAccount.address,
  //     amount: '0.001',
  //     childAddrs: [],
  //     ids: [],
  //     decimal: 8,
  //     coaAddr: mainAccount.evmAddr,
  //     tokenContractAddr: '',
  //   };

  //   const txid = await SendTransaction(payload);

  //   expect(txid.length).toBe(64);

  //   const transaction = await getTrx(txid);
  //   console.log(transaction);
  // });

  it('Test send USDC from main account to main account', async () => {
    const payload = {
      type: 'token', // Asset type: token or NFT
      assetType: 'flow', // Network type: Flow blockchain or EVM chain
      proposer: mainAccount.address, // Flow address of the transaction proposer/signer
      receiver: mainAccount.address, // Recipient address (Flow or EVM format)
      flowIdentifier: 'A.f1ab99c82dee3526.USDCFlow.Vault', // Flow resource identifier (e.g., vault
      sender: mainAccount.address,
      amount: '0.001',
      childAddrs: [],
      ids: [],
      decimal: 8,
      coaAddr: mainAccount.evmAddr,
      tokenContractAddr: '',
    };

    const txid = await SendTransaction(payload);

    expect(txid.length).toBe(64);

    // const transaction = await getTrx(txid);
  });
});
