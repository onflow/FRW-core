import * as fcl from '@onflow/fcl';
import {
  childAccountAllowTypesKey,
  childAccountAllowTypesRefreshRegex,
  childAccountNftsKey,
  childAccountNFTsRefreshRegex,
  nftCatalogCollectionsKey,
  nftCatalogCollectionsRefreshRegex,
  nftCollectionKey,
  nftCollectionListKey,
  nftCollectionListRefreshRegex,
  nftCollectionRefreshRegex,
  nftListKey,
  nftListRefreshRegex,
  getValidData,
  registerRefreshListener,
  setCachedData,
  type EvmNftCollectionListStore,
  evmNftCollectionListKey,
  type EvmNftIdsStore,
  evmNftIdsKey,
  evmNftIdsRefreshRegex,
  evmNftCollectionListRefreshRegex,
} from '@onflow/frw-data-model';

import {
  type CadenceNftCollection,
  type NFTModelV2,
  type CadenceCollectionNfts,
  type CadenceNftCollectionsAndIds,
} from '@onflow/frw-shared/types';
import { isValidEthereumAddress } from '@onflow/frw-shared/utils';

import openapiService, { getScripts } from './openapi';
import { fclConfirmNetwork } from '../utils/fclConfig';

class NFT {
  init = async () => {
    registerRefreshListener(nftCatalogCollectionsRefreshRegex, this.loadNftCatalogCollections);
    registerRefreshListener(nftCollectionRefreshRegex, this.loadCadenceCollectionNfts);
    registerRefreshListener(childAccountAllowTypesRefreshRegex, this.loadChildAccountAllowTypes);
    registerRefreshListener(childAccountNFTsRefreshRegex, this.loadChildAccountNFTs);
    registerRefreshListener(nftCollectionListRefreshRegex, this.loadNftCollectionList);
    registerRefreshListener(nftListRefreshRegex, this.loadNftList);

    // EVM NFTs
    registerRefreshListener(evmNftCollectionListRefreshRegex, this.loadEvmCollectionList);
    registerRefreshListener(evmNftIdsRefreshRegex, this.loadEvmNftIds);
  };

  loadChildAccountNFTs = async (network: string, parentAddress: string) => {
    if (!(await fclConfirmNetwork(network))) {
      // Do nothing if the network is switched
      // Don't update the cache
      return undefined;
    }
    const script = await getScripts(network, 'hybridCustody', 'getAccessibleChildAccountNFTs');

    const result = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(parentAddress, t.Address)],
    });

    setCachedData(childAccountNftsKey(network, parentAddress), result);

    return result;
  };

  loadChildAccountAllowTypes = async (
    network: string,
    parentAddress: string,
    childAddress: string
  ) => {
    if (!(await fclConfirmNetwork(network))) {
      // Do nothing if the network is switched
      // Don't update the cache
      return undefined;
    }
    const script = await getScripts(network, 'hybridCustody', 'getChildAccountAllowTypes');
    const result = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(parentAddress, t.Address), arg(childAddress, t.Address)],
    });
    setCachedData(childAccountAllowTypesKey(network, parentAddress, childAddress), result);
    return result;
  };

  loadNftCatalogCollections = async (
    network: string,
    address: string
  ): Promise<CadenceNftCollectionsAndIds[]> => {
    if (!(await fclConfirmNetwork(network))) {
      // Do nothing if the network is switched
      // Don't update the cache
      return [];
    }
    const data = await openapiService.fetchCadenceNftCollectionsAndIds(network, address!);
    if (!data || !Array.isArray(data)) {
      return [];
    }
    // Sort by count, maintaining the new collection structure
    const sortedList = [...data].sort((a, b) => b.count - a.count);

    setCachedData(nftCatalogCollectionsKey(network, address), sortedList);
    return sortedList;
  };

  loadCadenceCollectionNfts = async (
    network: string,
    address: string,
    collectionId: string,
    offset: string
  ): Promise<CadenceCollectionNfts | undefined> => {
    if (!(await fclConfirmNetwork(network))) {
      // Do nothing if the network is switched
      // Don't update the cache
      return undefined;
    }
    const offsetNumber = parseInt(offset) || 0;
    const data = await openapiService.fetchCadenceCollectionNfts(
      network,
      address!,
      collectionId,
      50,
      offsetNumber
    );

    setCachedData(nftCollectionKey(network, address, collectionId, `${offset}`), data);

    return data;
  };

  loadNftCollectionList = async (network: string): Promise<CadenceNftCollection[]> => {
    const data = await openapiService.fetchFullCadenceNftCollectionList(network);
    if (!data || !Array.isArray(data)) {
      throw new Error('Could not load nft collection list');
    }
    setCachedData(nftCollectionListKey(network), data);
    return data;
  };

  getSingleCollection = async (
    network: string,
    address: string,
    collectionId: string,
    offset: number
  ): Promise<CadenceCollectionNfts | undefined> => {
    const cachedData = await getValidData<CadenceCollectionNfts>(
      nftCollectionKey(network, address, collectionId, `${offset}`)
    );
    if (!cachedData) {
      return this.loadCadenceCollectionNfts(network, address, collectionId, `${offset}`);
    }
    return cachedData;
  };

  getNftCatalogCollections = async (
    network: string,
    address: string
  ): Promise<CadenceNftCollectionsAndIds[] | undefined> => {
    const collections = await getValidData<CadenceNftCollectionsAndIds[]>(
      nftCatalogCollectionsKey(network, address)
    );
    if (!collections) {
      return this.loadNftCatalogCollections(network, address);
    }
    return collections;
  };

  getNftCollectionList = async (network: string): Promise<CadenceNftCollection[] | undefined> => {
    const collections = await getValidData<CadenceNftCollection[]>(nftCollectionListKey(network));
    if (!collections) {
      return this.loadNftCollectionList(network);
    }
    return collections;
  };

  /**
   * Get the list of NFTs for a given network
   * @param network - The network to get the NFTs for
   * @returns The list of NFTs
   */
  getNftList = async (network: string, chainType: string): Promise<NFTModelV2[]> => {
    const nftList = await getValidData<NFTModelV2[]>(nftListKey(network, chainType));
    if (!nftList) {
      return this.loadNftList(network, chainType);
    }
    return nftList;
  };

  /**
   * Load the list of NFTs for a given network
   * @param network - The network to get the NFTs for
   * @param chainType - The chain type to get the NFTs for
   * @returns The list of NFTs
   */
  loadNftList = async (network: string, chainType: string): Promise<NFTModelV2[]> => {
    if (chainType !== 'evm' && chainType !== 'flow') {
      throw new Error('Invalid chain type');
    }
    const data = await openapiService.getNFTList(network, chainType);

    if (!data || !Array.isArray(data)) {
      throw new Error('Could not load nft collection list');
    }
    setCachedData(nftListKey(network, chainType), data);
    return data;
  };

  loadEvmNftIds = async (network: string, address: string) => {
    if (!(await fclConfirmNetwork(network))) {
      // Do nothing if the network is switched
      // Don't update the cache
      return [];
    }
    const result = await openapiService.EvmNFTID(network, address);

    setCachedData(evmNftIdsKey(network, address), result);
    return result;
  };

  loadEvmCollectionList = async (
    network: string,
    address: string,
    collectionIdentifier: string,
    offset: string
  ) => {
    if (!isValidEthereumAddress(address)) {
      throw new Error('Invalid Ethereum address');
    }

    if (!(await fclConfirmNetwork(network))) {
      // Do nothing if the network is switched
      // Don't update the cache
      return [];
    }

    // For EVM, offset can be a JWT token string
    // Don't convert to integer if it's a JWT token
    const offsetParam = offset && !isNaN(Number(offset)) ? parseInt(offset) : offset;

    const result = await openapiService.EvmNFTcollectionList(
      address,
      collectionIdentifier,
      50,
      offsetParam as string | number
    );

    setCachedData(evmNftCollectionListKey(network, address, collectionIdentifier, offset), result);
    return result;
  };

  clearEvmNfts = async () => {};

  /**
   * Get EVM NFT IDs for a given address
   * @param network - The network to get the NFTs for
   * @param address - The address to get the NFTs for
   * @returns The list of EVM NFT IDs
   */
  getEvmNftId = async (network: string, address: string) => {
    if (!isValidEthereumAddress(address)) {
      throw new Error('Invalid Ethereum address');
    }
    const cacheData = await getValidData<EvmNftIdsStore>(evmNftIdsKey(network, address));
    if (cacheData) {
      return cacheData;
    }
    return this.loadEvmNftIds(network, address);
  };

  /**
   * Get EVM NFT collection list for a given address and collection
   * @param network - The network to get the collection for
   * @param address - The address to get the collection for
   * @param collectionIdentifier - The collection identifier
   * @param limit - The limit of items to return
   * @param offset - The offset for pagination
   * @returns The list of EVM NFT collections
   */
  getEvmNftCollectionList = async (
    network: string,
    address: string,
    collectionIdentifier: string,
    limit = 50,
    offset = '0'
  ) => {
    if (!isValidEthereumAddress(address)) {
      throw new Error('Invalid Ethereum address');
    }
    const cacheData = await getValidData<EvmNftCollectionListStore>(
      evmNftCollectionListKey(network, address, collectionIdentifier, `${offset}`)
    );
    if (cacheData) {
      return cacheData;
    }
    return this.loadEvmCollectionList(network, address, collectionIdentifier, `${offset}`);
  };
  clear = async () => {
    // Just gonna ingore this for now
  };

  clearNFTCollection = () => {
    // Just gonna ingore this for now
  };
}

export default new NFT();
