/**
 * Offline Sync Queue
 * Queues operations when offline and syncs when back online
 * Implements reliable offline-first architecture
 */

const SYNC_QUEUE_KEY = 'circular_sync_queue';
const SYNC_METADATA_KEY = 'circular_sync_metadata';

/**
 * Operation types
 */
export const OPERATION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  ACKNOWLEDGE: 'ACKNOWLEDGE',
  BOOKMARK: 'BOOKMARK',
};

/**
 * Add operation to sync queue
 * @param {Object} operation - Operation to queue
 * @param {string} operation.type - Operation type (CREATE, UPDATE, DELETE, etc.)
 * @param {string} operation.collection - Firestore collection name
 * @param {string} operation.docId - Document ID
 * @param {Object} operation.data - Operation data
 * @param {Function} operation.handler - Function to execute when syncing
 * @returns {string} Operation ID
 */
export const addToSyncQueue = (operation) => {
  try {
    const queue = getSyncQueue();
    const operationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedOperation = {
      id: operationId,
      ...operation,
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: 3,
      status: 'pending',
    };

    queue.push(queuedOperation);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

    // Update metadata
    const metadata = getSyncMetadata();
    metadata.lastQueued = new Date().toISOString();
    metadata.queueSize = queue.length;
    localStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata));

    console.log(`📋 Operation queued: ${operationId}`, queuedOperation);
    return operationId;
  } catch (error) {
    console.error('Error adding to sync queue:', error);
    throw error;
  }
};

/**
 * Get all queued operations
 * @returns {Array} Array of queued operations
 */
export const getSyncQueue = () => {
  try {
    const queue = localStorage.getItem(SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error('Error reading sync queue:', error);
    return [];
  }
};

/**
 * Get sync metadata
 * @returns {Object} Sync metadata
 */
export const getSyncMetadata = () => {
  try {
    const metadata = localStorage.getItem(SYNC_METADATA_KEY);
    return metadata ? JSON.parse(metadata) : {
      lastSynced: null,
      lastQueued: null,
      queueSize: 0,
      syncInProgress: false,
    };
  } catch (error) {
    console.error('Error reading sync metadata:', error);
    return {
      lastSynced: null,
      lastQueued: null,
      queueSize: 0,
      syncInProgress: false,
    };
  }
};

/**
 * Sync all queued operations
 * @param {Function} onProgress - Progress callback
 * @returns {Object} Sync result
 */
export const syncQueue = async (onProgress = () => {}) => {
  const metadata = getSyncMetadata();
  
  // Prevent concurrent syncs
  if (metadata.syncInProgress) {
    console.warn('Sync already in progress');
    return { success: false, message: 'Sync already in progress' };
  }

  try {
    // Mark sync as in progress
    metadata.syncInProgress = true;
    localStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata));

    const queue = getSyncQueue();
    if (queue.length === 0) {
      console.log('✅ Sync queue is empty');
      return { success: true, synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;
    const failedOperations = [];

    for (let i = 0; i < queue.length; i++) {
      const operation = queue[i];
      
      try {
        onProgress({
          current: i + 1,
          total: queue.length,
          operation,
        });

        // Execute the handler
        if (operation.handler && typeof operation.handler === 'function') {
          await operation.handler(operation);
        }

        // Remove from queue
        queue.splice(i, 1);
        i--; // Adjust index after removal
        synced++;

        console.log(`✅ Synced: ${operation.id}`);
      } catch (error) {
        console.error(`❌ Failed to sync ${operation.id}:`, error);
        
        // Increment retry count
        operation.retries = (operation.retries || 0) + 1;
        
        // Keep in queue if retries available
        if (operation.retries >= operation.maxRetries) {
          operation.status = 'failed';
          failedOperations.push(operation);
          queue.splice(i, 1);
          i--;
        }
        
        failed++;
      }
    }

    // Update queue
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

    // Update metadata
    metadata.syncInProgress = false;
    metadata.lastSynced = new Date().toISOString();
    metadata.queueSize = queue.length;
    localStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata));

    const result = {
      success: failed === 0,
      synced,
      failed,
      failedOperations,
      queueRemaining: queue.length,
    };

    console.log('🔄 Sync complete:', result);
    return result;
  } catch (error) {
    console.error('Sync error:', error);
    
    // Reset sync flag
    metadata.syncInProgress = false;
    localStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata));

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Clear sync queue
 */
export const clearSyncQueue = () => {
  try {
    localStorage.removeItem(SYNC_QUEUE_KEY);
    const metadata = getSyncMetadata();
    metadata.queueSize = 0;
    localStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata));
    console.log('🗑️ Sync queue cleared');
  } catch (error) {
    console.error('Error clearing sync queue:', error);
  }
};

/**
 * Remove operation from queue
 * @param {string} operationId - Operation ID to remove
 */
export const removeFromSyncQueue = (operationId) => {
  try {
    const queue = getSyncQueue();
    const index = queue.findIndex(op => op.id === operationId);
    
    if (index !== -1) {
      queue.splice(index, 1);
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      
      const metadata = getSyncMetadata();
      metadata.queueSize = queue.length;
      localStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata));
      
      console.log(`Removed from queue: ${operationId}`);
    }
  } catch (error) {
    console.error('Error removing from sync queue:', error);
  }
};

/**
 * Get queue size
 * @returns {number} Number of queued operations
 */
export const getQueueSize = () => {
  return getSyncQueue().length;
};

/**
 * Check if sync is in progress
 * @returns {boolean} True if sync is in progress
 */
export const isSyncInProgress = () => {
  return getSyncMetadata().syncInProgress;
};

export default {
  OPERATION_TYPES,
  addToSyncQueue,
  getSyncQueue,
  getSyncMetadata,
  syncQueue,
  clearSyncQueue,
  removeFromSyncQueue,
  getQueueSize,
  isSyncInProgress,
};
