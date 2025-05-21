// Testing imports
import * as bip39 from 'bip39';
import encryptor from 'browser-passworder';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Internal imports
import { CURRENT_ID_KEY } from '@/shared/types/keyring-types';
import { FLOW_BIP44_PATH } from '@/shared/utils/algo-constants';

// Mock dependencies
vi.mock('../../../shared/utils/storage', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../../service/openapi', () => ({
  default: {
    getAccountsWithPublicKey: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../service/userWallet', () => ({
  default: {
    setupFcl: vi.fn(),
  },
}));

vi.mock('../../service/i18n', () => ({
  default: {
    t: (key) => key,
  },
}));

vi.mock('../../service/preference', () => ({
  default: {
    getHiddenAddresses: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('@/shared/utils/current-id', () => ({
  returnCurrentProfileId: vi.fn().mockResolvedValue('testId1'),
}));

// Use real BIP39 for fixed mnemonic
vi.mock('bip39', () => ({
  validateMnemonic: vi.fn((mnemonic) => {
    // Simple validation for testing purposes
    return mnemonic && mnemonic.split(' ').length === 12;
  }),
  generateMnemonic: vi.fn(() => 'test test test test test test test test test test test junk'),
}));

// Import the mocked modules after all mocks are defined
import storage from '../../../shared/utils/storage';
import keyringService from '../keyring';

import { MOCK_KEYS, MOCK_MNEMONIC, MOCK_PASSWORD } from './keyring-mock-data';

describe('Keyring Boot and Mnemonics Test', () => {
  // Create in-memory storage
  const memoryStore = new Map<string, any>();

  beforeEach(() => {
    // Reset mocks and storage
    vi.clearAllMocks();
    memoryStore.clear();

    // Set currentId in storage
    memoryStore.set(CURRENT_ID_KEY, 'testId1');

    // Mock storage
    vi.mocked(storage.get).mockImplementation((key) => memoryStore.get(key));
    vi.mocked(storage.set).mockImplementation((key, value) => {
      memoryStore.set(key, value);
      return Promise.resolve();
    });

    // Reset KeyringService state
    keyringService.clearKeyrings();
    keyringService.clearKeyringList();
    keyringService.clearVault();
  });

  it('generates mock data with real encryption', async () => {
    // Create encrypted booted data manually for testing
    const encryptedBooted = await encryptor.encrypt(MOCK_PASSWORD, 'true');

    // Verify we can decrypt it
    const decryptedBooted = await encryptor.decrypt(MOCK_PASSWORD, encryptedBooted);
    expect(decryptedBooted).toBe('true');

    // Create a simple vault data structure
    const mockVaultData = [
      {
        type: 'HD Key Tree',
        data: {
          mnemonic: MOCK_MNEMONIC,
          activeIndexes: [0],
          derivationPath: FLOW_BIP44_PATH,
          passphrase: '',
        },
      },
    ];

    // Encrypt the vault data
    const encryptedVaultData = await encryptor.encrypt(MOCK_PASSWORD, mockVaultData);

    // Verify we can decrypt the vault data
    const decryptedVaultData = await encryptor.decrypt(MOCK_PASSWORD, encryptedVaultData);
    expect(decryptedVaultData).toMatchObject(mockVaultData);

    // Create a mock keyring state with encrypted data
    const keyringStateV2 = {
      booted: encryptedBooted,
      vault: [
        {
          id: 'testId1',
          encryptedData: encryptedVaultData,
        },
      ],
      vaultVersion: 2,
    };

    // Store this for future tests
    memoryStore.set('keyringStateV2', keyringStateV2);

    // Log the mock data for future use
    const mockData = {
      password: MOCK_PASSWORD,
      keyringStateV2: keyringStateV2,
      decryptedVaultData: mockVaultData,
      mnemonic: MOCK_MNEMONIC,
    };

    const mockPublicKeyTuple = MOCK_KEYS.publicKeys;
    const mockPrivateKey = MOCK_KEYS.privateKey;

    // Now let's verify we can actually use this to unlock a KeyringService

    // Initialize the KeyringService with our mocked data
    await keyringService.loadKeyringStore();

    // Test unlocking with the password
    await keyringService.submitPassword(MOCK_PASSWORD);

    // Verify it's unlocked
    expect(keyringService.isUnlocked()).toBe(true);

    // Verify we have the keyring in memory
    expect((await keyringService.getKeyring()).length).toBeGreaterThan(0);

    // Check that we can access keys
    const publicKeyTuple = await keyringService.getCurrentPublicKeyTuple();
    expect(publicKeyTuple).toEqual(mockPublicKeyTuple);

    const privateKeyTuple = await keyringService.getCurrentPrivateKeyTuple();
    expect(privateKeyTuple.SECP256K1.pk).toEqual(mockPrivateKey);
  });
});
