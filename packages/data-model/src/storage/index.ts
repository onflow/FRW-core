import { memoryStorage } from './memory-storage';
import { type Storage, type StorageConfig } from './storage-types';

/**
 * Global storage manager
 */
class StorageManager {
  private static instance: StorageManager;
  private storageImplementation: Storage;
  private initialized = false;

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
    this.initialized = true;
  }

  /**
   * Auto-initialize storage (uses memory storage by default)
   * Only switches to Chrome storage if explicitly configured via initialize()
   */
  autoInitialize(): void {
    if (this.initialized) {
      return;
    }
    // Use memory storage by default - no automatic Chrome detection
    this.storageImplementation = memoryStorage;
  }

  /**
   * Get the current storage implementation
   */
  getStorage(): Storage {
    // Auto-initialize if not already done
    if (!this.initialized) {
      this.autoInitialize();
    }
    return this.storageImplementation;
  }
}

// Manual initialization with custom implementation
export function initializeStorage(config: StorageConfig): void {
  StorageManager.getInstance().initialize(config);
}

// Default storage instance
export const storage: Storage = new Proxy({} as Storage, {
  get(_, prop) {
    return StorageManager.getInstance().getStorage()[prop as keyof Storage];
  },
});

// Re-export main types that are part of the public API
export type { Storage, StorageConfig };
