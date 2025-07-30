import { ethers, parseUnits } from 'ethers';

import type { SendPayload } from './types';

/**
 * Encodes EVM contract call data for token and NFT transfers
 * Supports ERC20, ERC721, and ERC1155 standards
 * @param payload - SendPayload containing transfer details
 * @returns Array of bytes representing the encoded function call
 * @throws Error if receiver address is invalid
 */
export const encodeEvmContractCallData = (payload: SendPayload): number[] => {
  const { type, amount = '', receiver, decimal, ids, sender } = payload;
  // const to = receiver.toLowerCase().replace(/^0x/, '');
  if (receiver.length !== 42) throw new Error('Invalid Ethereum address');
  let callData = '0x';

  if (type === 'token') {
    // ERC20 token transfer
    const value = Number(amount);
    // Convert value with proper decimal handling
    const valueBig = parseUnits(value.toString(), decimal);
    // ERC20 transfer function ABI
    const abi = ['function transfer(address to, uint256 value)'];
    const iface = new ethers.Interface(abi);

    // Encode function call data
    callData = iface.encodeFunctionData('transfer', [receiver, valueBig]);
  } else {
    // NFT transfer (ERC721 or ERC1155)
    if (ids.length === 1) {
      if (amount === '') {
        // ERC721 NFT transfer (no amount parameter)
        const tokenId = ids[0];

        // ERC721 transferFrom function ABI
        const abi = ['function safeTransferFrom(address from, address to, uint256 tokenId)'];
        const iface = new ethers.Interface(abi);

        // Encode function call data
        callData = iface.encodeFunctionData('safeTransferFrom', [sender, receiver, tokenId]);
      } else {
        // ERC1155 NFT transfer (with amount parameter)
        const tokenId = ids[0];

        // ERC1155 safeTransferFrom function ABI
        const abi = [
          'function safeTransferFrom(address from, address to, uint256 tokenId, uint256 amount, bytes data)',
        ];
        const iface = new ethers.Interface(abi);
        callData = iface.encodeFunctionData('safeTransferFrom', [
          sender,
          receiver,
          tokenId,
          amount,
          '0x', // Empty data parameter
        ]);
      }
    }
  }

  // Convert hex string to byte array
  const dataBuffer = Buffer.from(callData.slice(2), 'hex');
  const dataArray = Uint8Array.from(dataBuffer);
  const regularArray = Array.from(dataArray);

  return regularArray;
};
