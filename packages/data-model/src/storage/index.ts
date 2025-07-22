import { memoryStorage } from './memory-storage';
import { type Storage, type StorageConfig } from './storage-types';

/**
 * Global storage manager
 */
class StorageManager {
  private static instance: StorageManager;
  private storageImplementation: Storage;

  private constructor() {
    // Default to in-memory storage for platform independence
    this.storageImplementation = memoryStorage;
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * Initialize the storage system with a custom implementation
   */
  initialize(config: StorageConfig): void {
    this.storageImplementation = config.implementation;
  }

  /**
   * Get the current storage implementation
   */
  getStorage(): Storage {
    return this.storageImplementation;
  }
}

// Initialize storage system
export function initializeStorage(config: StorageConfig): void {
  StorageManager.getInstance().initialize(config);
}

// Get the current storage instance
export function getStorage(): Storage {
  return StorageManager.getInstance().getStorage();
}

// Default storage instance
export const storage: Storage = new Proxy({} as Storage, {
  get(_, prop) {
    return getStorage()[prop as keyof Storage];
  },
});

// Re-export main types that are part of the public API
export type { Storage, StorageConfig };
