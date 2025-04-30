import { storage } from '@/background/webapi';

export type VaultEntryV2 = {
  id: string;
  encryptedData: string;
};

export type KeyringStateV2 = {
  booted: string;
  vault: VaultEntryV2[];
  vaultVersion: 1 | 2;
};

export type VaultEntryV3 = {
  id: string;
  pubKey: string;
  signAlgo: number;
  hashAlgo: number;
  encryptedData: string;
};

export type KeyringStateV3 = {
  booted: string;
  vault: VaultEntryV3[];
  vaultVersion: 3;
};

export type KeyringState = KeyringStateV2 | KeyringStateV3;

export const KEYRING_STATE_V2_KEY = 'keyringStateV2';
export const KEYRING_STATE_V1_KEY = 'keyringState';
export const KEYRING_STATE_V3_KEY = 'keyringStateV3';
export const KEYRING_DEEP_VAULT_KEY = 'deepVault';

export const KEYRING_STATE_CURRENT_KEY = KEYRING_STATE_V3_KEY;
export const KEYRING_STATE_VAULT_V1 = 1;
export const KEYRING_STATE_VAULT_V2 = 2;
export const KEYRING_STATE_VAULT_V3 = 3;

export const CURRENT_ID_KEY = 'currentId';

const CURRENT_PUBKEY_KEY = 'currentPubKey';

export const returnCurrentPublicKey = async (): Promise<string | null> => {
  return await storage.get(CURRENT_PUBKEY_KEY);
};

export const getCurrentPublicKey = async (): Promise<string> => {
  const currentPubKey = await returnCurrentPublicKey();
  if (!currentPubKey) {
    throw new Error('Current public key is not set.');
  }
  return currentPubKey;
};

export const setCurrentPublicKey = async (pubKey: string) => {
  await storage.set(CURRENT_PUBKEY_KEY, pubKey);
};
