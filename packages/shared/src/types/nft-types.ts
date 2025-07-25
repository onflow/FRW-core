/**
 * Cadence Nft Traits and Royalties
 * Returned by - fetchCadenceCollectionNfts - /api/v2/nft/collectionList
 * These are the traits and royalties of an nft
 */

type NftTrait = {
  name: string;
  value: string;
  displayType: string | null;
  rarity: string | null;
};

type NftRoyaltyCutInfo = {
  receiver: {
    address: string;
    borrowType: string;
  };
  cut: string;
  description: string;
};

type NftRoyalties = {
  cutInfos: NftRoyaltyCutInfo[];
};
/**
 * PostMedia is a type that represents the media associated with an NFT.
 */

export type NftPostMedia = {
  image?: string;
  video?: string;
  music?: string;
  isSvg: boolean;
  description: string;
  title: string;
};
/**
 * Nft Data from Cadence
 * Returned by - fetchCadenceCollectionNfts - /api/v2/nft/collectionList
 * These are the nfts owned by an account from a specific collection
 *
 */
export type CadenceNft = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  externalURL: string;
  collectionName: string;
  collectionContractName: string;
  contractAddress: string;
  collectionDescription: string;
  collectionSquareImage: string;
  collectionBannerImage: string;
  collectionExternalURL: string;
  traits: NftTrait[];
  royalties: NftRoyalties;
  postMedia: NftPostMedia;
  flowIdentifier: string;
};

/**
 * An Nft Collection on Cadence
 * Returned by - get all nft collections, get nft collection list
 */

export type CadenceNftCollection = {
  id: string;
  address: string;
  contractName: string; // alternative name
  evmAddress: string;
  name: string;
  logo: string;
  banner: string;
  description: string;
  flowIdentifier?: string;
  officialWebsite?: string;
  socials?: Record<string, string>;
  path?: {
    storagePath: string;
    publicPath: string;
  };
  externalURL?: string;
};
/**
 * Cadence Collection Nfts
 * Returned by - fetchCadenceCollectionNfts - /api/v2/nft/collectionList
 * These are the nfts owned by an account from a specific collection
 */
export type CadenceCollectionNfts = {
  nfts: CadenceNft[];
  collection: CadenceNftCollection;
  nftCount: number;
};

/**
 * Cadence Nft Collections and Ids
 * This is the list of collections with the ids of the nfts owned in each collection
 * Useful to render the list of colletions and the nft count in each collection
 * Returned by - fetchCadenceNftCollectionsAndIds - /api/v2/nft/id
 * These are the collections and ids of the nfts owned by an account
 */
export type CadenceNftCollectionsAndIds = {
  collection: CadenceNftCollection;
  ids: string[];
  count: number;
};

export interface NFTModelV2 {
  chainId: number;
  address: string;
  contractName: string;
  path: NFTPathV2;
  evmAddress?: string;
  flowAddress: string;
  name: string;
  description: string | null;
  logoURI: string | null;
  bannerURI: string | null;
  tags: string[];
  extensions: {
    discord?: string;
    instagram?: string;
    twitter?: string;
    website?: string;
  };
}
export interface NFTPathV2 {
  storage: string;
  public: string;
}

/***
 * EVM ******
 *
 */

type EvmNFTCollection = {
  id: string;
  address: string;
  contractName: string;
  contract_name: string;
  evmAddress: string;
  name: string;
  logo: string | null;
  banner: string | null;
  description: string | null;
  flowIdentifier: string;
};

export type EvmNFTIds = {
  collection: EvmNFTCollection;
  ids: string[];
  count: number;
};

type EvmNFTItem = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  externalURL: string;
  collectionName: string;
  contractAddress: string;
  postMedia: {
    image: string;
    isSvg: boolean;
    description: string;
    title: string;
  };
};

export type EvmNFTCollectionList = {
  nfts: EvmNFTItem[];
  nftCount: number;
  collection: EvmNFTCollection;
};
