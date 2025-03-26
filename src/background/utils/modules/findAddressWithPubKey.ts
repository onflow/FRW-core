import * as fcl from '@onflow/fcl';
import { type AccountKey } from '@onflow/typedefs';

import { userWalletService } from '@/background/service';
import { type SignAlgoString, type HashAlgoString } from '@/shared/types/algo-types';
import type { PublicKeyTuple } from '@/shared/types/key-types';
import { type PublicKeyAccount } from '@/shared/types/wallet-types';

/**
 * Get accounts with public key tuple
 * This is the main function to look up the account with the public key. Called when loading the wallet.
 * This allows for the use of two different public keys for the same address.
 * We look first for the account with the P256 key. If that is not found, we look for the SECP256K1 key.
 * This calls the indexer to get the accounts with the public key.
 *
 * @param {PublicKeyTuple} pubKTuple - The public key tuple containing both key types
 * @returns {Array<Object>} An array of account information objects with keys, weights, and algorithms
 */

export const getAccountsByPublicKeyTuple = async (
  pubKTuple: PublicKeyTuple,
  network: string
): Promise<PublicKeyAccount[]> => {
  const { P256, SECP256K1 } = pubKTuple;

  // Check for P256 accounts first
  const p256Accounts = await getAccountsByPublicKey(P256.pubK, network);
  // Otherwise, check for SECP256K1 accounts
  const sepc256k1Accounts = await getAccountsByPublicKey(SECP256K1.pubK, network);
  // Combine the accounts
  const accounts = [...p256Accounts, ...sepc256k1Accounts];

  // Check that at least one account has weight of 1000 or more
  const hasWeight = accounts.some((account) => account.weight >= 1000);
  if (!hasWeight || accounts.length === 0) {
    throw new Error('No accounts found with the given public key');
  }
  // Otherwise, return the accounts
  return accounts;
};

type KeyIndexerAccountResponse = {
  address: string;
  keyId: number;
  weight: number;
  sigAlgo: number;
  hashAlgo: number;
  signing: SignAlgoString;
  hashing: HashAlgoString;
};

type KeyIndexerProfileResponse = {
  publicKey: string;
  accounts: KeyIndexerAccountResponse[];
};

/*
 * Connect to the indexer to get all accounts associated with a public key
 * This is used to get the accounts for the current user
 * @param {string} publicKey - The public key to search for
 * @param {string} network - The network to search on
 * @returns {Promise<KeyIndexerProfile>} The accounts associated with the public key
 */

async function getAccountsByPublicKey(
  publicKey: string,
  network: string
): Promise<PublicKeyAccount[]> {
  const url =
    network === 'testnet'
      ? `https://staging.key-indexer.flow.com/key/${publicKey}`
      : `https://production.key-indexer.flow.com/key/${publicKey}`;
  const result = await fetch(url);
  const json: KeyIndexerProfileResponse = await result.json();

  // Now massage the data to match the type we want
  const accounts: PublicKeyAccount[] = json.accounts.map((account) => ({
    address: account.address,
    publicKey: json.publicKey,
    keyIndex: account.keyId,
    weight: account.weight,
    signAlgo: account.sigAlgo,
    signAlgoString: account.signing,
    hashAlgo: account.hashAlgo,
    hashAlgoString: account.hashing,
  }));

  return accounts;
}

const checkAddressAgainstKey = async (
  address: string,
  pubKeyHex: string
): Promise<PublicKeyAccount[] | null> => {
  // Verfify that the address is associated with the public key

  // I'm not sure this is needed. I'm updating what was here
  await userWalletService.setupFcl();

  // This is the account object from the Flow blockchain
  const account = await fcl.account(address);

  // Filter the keys to only include the ones that are associated with the public key,
  // have a weight of 1000 or more, and are not revoked
  const keys: AccountKey[] = account.keys
    .filter((key) => key.publicKey === pubKeyHex && !key.revoked)
    .filter((key) => key.weight >= 1000);

  // If there a valid matching key is not found, return null
  if (keys.length === 0) {
    return null;
  }
  // Return the keys that match the criteria
  return keys.map((key) => {
    return {
      ...key,
      address: address,
      keyIndex: key.index,
    };
  });
};

export const findAddressWithKey = async (
  pubKeyHex: string,
  address: string | null = null
): Promise<PublicKeyAccount[] | null> => {
  // If the address is not provided, get the accounts from the indexer
  return address
    ? await checkAddressAgainstKey(address, pubKeyHex)
    : await getAccountsByPublicKey(pubKeyHex, 'mainnet');
};

export const getOrCheckAddressByPublicKeyTuple = async (
  pubKTuple: PublicKeyTuple,
  address: string | null = null
) => {
  const { P256, SECP256K1 } = pubKTuple;
  const p256Accounts = (await findAddressWithKey(P256.pubK, address)) || [];
  const sepc256k1Accounts = (await findAddressWithKey(SECP256K1.pubK, address)) || [];
  // Combine the accounts
  const accounts = [...p256Accounts, ...sepc256k1Accounts];

  // Check that at least one account has weight of 1000 or more
  const hasWeight = accounts.some((account) => account.weight >= 1000);
  if (!hasWeight || accounts.length === 0) {
    throw new Error('No accounts found with the given public key');
  }
  // Otherwise, return the accounts
  return accounts;
};
