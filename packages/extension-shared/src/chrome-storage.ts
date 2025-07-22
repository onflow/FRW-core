import { consoleError } from '@onflow/frw-shared/utils';

import { type Storage, type StorageChange, type AreaName } from './storage-types';

/**
 * Chrome Extension Storage Implementation
 * These functions directly interact with chrome.storage API
 */

// Local storage operations (persistent data)
const get = async (prop: string) => {
  const result = await chrome.storage.local.get(prop);
  return prop ? result[prop] : result;
};

const set = (prop: string, value: unknown): Promise<void> => {
  return chrome.storage.local.set({ [prop]: value });
};

const remove = async (prop: string) => {
  await chrome.storage.local.remove(prop);
};

const clear = async () => {
  await chrome.storage.local.clear();
};

// Session storage operations
const getSession = async (prop: string) => {
  const result = await chrome.storage.session?.get(prop);
  return prop ? result[prop] : result;
};

const setSession = (prop: string, value: unknown): Promise<void> => {
  return chrome.storage.session?.set({ [prop]: value });
};

const removeSession = async (prop: string) => {
  await chrome.storage.session?.remove(prop);
};

const clearSession = async () => {
  await chrome.storage.session.clear();
};

// TTL storage operations (with expiration)
const getExpiry = async (prop: string) => {
  const data = await get(prop);
  const storageData = checkExpiry(data, prop);
  return storageData;
};

const setExpiry = async (prop: string, value: unknown, ttl: number): Promise<void> => {
  const now = new Date();
  const item = {
    value: value,
    expiry: now.getTime() + ttl,
  };
  const newValue = JSON.stringify(item);
  return await set(prop, newValue);
};

const checkExpiry = async (value: string, prop: string) => {
  if (!value) {
    return null;
  }
  try {
    const item = JSON.parse(value);
    const now = new Date();
    if (now.getTime() > item.expiry) {
      await remove(prop);
      return null;
    }
    return item.value;
  } catch (error) {
    consoleError('Error parsing storage data', error);
    try {
      await remove(prop);
    } catch (error) {
      consoleError('Error removing expired storage data', error);
    }
    return null;
  }
};

// Storage change listeners
const addStorageListener = (
  callback: (changes: { [key: string]: StorageChange }, namespace: AreaName) => void
) => {
  chrome.storage.onChanged.addListener(callback);
};

const removeStorageListener = (
  callback: (changes: { [key: string]: StorageChange }, namespace: AreaName) => void
) => {
  chrome.storage.onChanged.removeListener(callback);
};

/**
 * Chrome storage implementation for extensions
 */
export const chromeStorage: Storage = {
  getSession,
  setSession,
  removeSession,
  clearSession,
  get,
  set,
  remove,
  clear,
  getExpiry,
  setExpiry,
  addStorageListener,
  removeStorageListener,
};
