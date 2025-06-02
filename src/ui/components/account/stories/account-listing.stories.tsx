import { type Meta, type StoryObj } from '@storybook/react-webpack5';
import React from 'react';

import emojisJson from '@/background/utils/emoji.json';
const { emojis } = emojisJson as { emojis: Emoji[] };
import { MAINNET_CHAIN_ID } from '@/shared/types/network-types';
import { type Emoji, type WalletAccount } from '@/shared/types/wallet-types';
import {
  useChildAccounts as importedMockUseChildAccounts, // Aliased import from the mock file
  useEvmAccount as importedMockUseEvmAccount, // Aliased import from the mock file
} from '@/ui/components/account/stories/use-account-hooks.mock';
// eslint-disable-next-line import/order
import { AccountListing } from '@/ui/components/account/account-listing';

const mainWalletAccount: WalletAccount = {
  name: emojis[2].name,
  icon: emojis[2].emoji,
  color: emojis[2].bgcolor,
  address: '0x0c666c888d8fb259',
  chain: MAINNET_CHAIN_ID,
  id: 1,
  balance: '550.66005012',
  nfts: 12,
};
const mainWalletAccount2: WalletAccount = {
  name: emojis[3].name,
  icon: emojis[3].emoji,
  color: emojis[3].bgcolor,
  address: '0x0c555c888d8fb259', // Note: Same address as mainWalletAccount for some stories, differentiate if needed
  chain: MAINNET_CHAIN_ID,
  id: 1, // Differentiate ID if it matters for keying or logic
  balance: '0.00000077',
  nfts: 4,
};

const evmWalletAccount: WalletAccount = {
  name: emojis[6].name,
  icon: emojis[6].emoji,
  color: emojis[6].bgcolor,
  address: '0x00000000000000000000000279356d1221d883F5',
  chain: MAINNET_CHAIN_ID,
  id: 1,
  balance: '550.66005012',
  nfts: 12,
};
const evmWalletAccount2: WalletAccount = {
  name: emojis[7].name,
  icon: emojis[7].emoji,
  color: emojis[7].bgcolor,
  address: '0x00000000000000000000000279356d1221d883F6',
  chain: MAINNET_CHAIN_ID,
  id: 1,
  balance: '201.66005012',
  nfts: 0,
};

const childWallet1: WalletAccount = {
  name: 'Dapper Wallet ',
  icon: 'https://accounts.meetdapper.com/static/img/dapper/dapper.png',
  color: emojis[6].bgcolor,
  address: '0x863ac53e3aa7b411',
  chain: MAINNET_CHAIN_ID,
  id: 1,
  balance: '550.66005012',
  nfts: 12,
};

const childWallet2: WalletAccount = {
  name: 'Dapper Wallet 2',
  icon: 'https://accounts.meetdapper.com/static/img/dapper/dapper.png',
  color: emojis[6].bgcolor,
  address: '0x863ac53e33a7b411', // Note: Same address as childWallet1, differentiate if they need to be unique linked accounts for the same parent
  chain: MAINNET_CHAIN_ID,
  id: 1, // Differentiate ID if it matters
  balance: '550.66005012',
  nfts: 12,
};

// Helper to create mock data for stories
const createMockData = (config: {
  [address: string]: { evm?: WalletAccount; children?: WalletAccount[] };
}) => {
  const evmAccounts: Record<string, WalletAccount | undefined> = {};
  const childAccounts: Record<string, WalletAccount[] | undefined> = {};
  for (const addr in config) {
    if (Object.prototype.hasOwnProperty.call(config, addr)) {
      evmAccounts[addr] = config[addr].evm;
      childAccounts[addr] = config[addr].children;
    }
  }
  return { evmAccounts, childAccounts };
};

const meta: Meta<typeof AccountListing> = {
  title: 'Components/AccountListing',
  component: AccountListing,
  argTypes: {
    accountList: {
      control: 'object',
    },
    activeAddress: {
      control: 'text',
    },
    network: { control: 'text' },
  },
  decorators: [
    (Story, context) => {
      importedMockUseChildAccounts.mockReset();
      importedMockUseEvmAccount.mockReset();

      const { mockData } = context.parameters;
      if (mockData) {
        importedMockUseEvmAccount.mockImplementation((_network, address) => {
          if (typeof address === 'string' && mockData.evmAccounts) {
            return mockData.evmAccounts[address];
          }
          return undefined;
        });
        importedMockUseChildAccounts.mockImplementation((_network, address) => {
          if (typeof address === 'string' && mockData.childAccounts) {
            return mockData.childAccounts[address] || [];
          }
          return [];
        });
      }
      return <Story />;
    },
  ],
};

export default meta;

type Story = StoryObj<typeof AccountListing>;

export const Default: Story = {
  args: {
    network: 'mainnet',
    accountList: [mainWalletAccount, mainWalletAccount2],
    activeAddress: undefined,
  },
  parameters: {
    mockData: createMockData({
      [mainWalletAccount.address]: {
        evm: evmWalletAccount,
        children: [childWallet1, childWallet2],
      },
      // Assuming mainWalletAccount2 might have a different address if it's a distinct primary account.
      // If its address is the same as mainWalletAccount, the mockData for that address will be overwritten
      // or used for both depending on map iteration order, which is not guaranteed.
      // For clarity, ensure distinct primary accounts have distinct addresses.
      [mainWalletAccount2.address]: {
        // Ensure this address is unique if mainWalletAccount2 is a separate entity
        evm: evmWalletAccount2,
        children: [], // Example: mainWalletAccount2 has no children in this story
      },
    }),
  },
};

export const Active: Story = {
  args: {
    network: 'mainnet',
    accountList: [mainWalletAccount],
    activeAddress: mainWalletAccount.address,
  },
  parameters: {
    mockData: createMockData({
      [mainWalletAccount.address]: {
        children: [childWallet1, childWallet2],
      },
    }),
  },
};

export const EVMActive: Story = {
  args: {
    network: 'mainnet',
    accountList: [mainWalletAccount],
    activeAddress: evmWalletAccount.address,
  },
  parameters: {
    mockData: createMockData({
      [mainWalletAccount.address]: {
        evm: evmWalletAccount,
        children: [childWallet2], // ChildWallet1 is omitted as per original story logic
      },
    }),
  },
};

export const Loading: Story = {
  args: {
    network: 'mainnet',
    accountList: undefined,
    activeAddress: undefined,
  },
};
