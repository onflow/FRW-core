import { chromeStorage } from './chrome-storage';

// Have a sotrage instance exported from here to avoid errors in extension
// Extension should update the storage instance from @onflow/frw-extension-shared/storage to @onflow/frw-data-model if needed
export type { Storage, StorageConfig, StorageChange, AreaName } from '@onflow/frw-data-model';

// Export for manual initialization
export { initializeStorage, memoryStorage } from '@onflow/frw-data-model';
export { chromeStorage };

// Default export for backward compatibility
export { storage as default } from '@onflow/frw-data-model';
