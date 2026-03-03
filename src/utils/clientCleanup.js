/**
 * Client-Side Cleanup Utility
 * Runs cleanup tasks when admins visit the Audit Logs page
 * Free alternative to Cloud Functions
 */

import { getDocuments, deleteDocument, createDocument } from '../lib/firebase-db';

const CLEANUP_KEY = 'last_cleanup_check';
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if cleanup is needed (once per day)
 */
export function shouldRunCleanup() {
  const lastCleanup = localStorage.getItem(CLEANUP_KEY);
  if (!lastCleanup) return true;
  
  const timeSinceLastCleanup = Date.now() - parseInt(lastCleanup);
  return timeSinceLastCleanup > CLEANUP_INTERVAL;
}

/**
 * Mark cleanup as completed
 */
function markCleanupComplete() {
  localStorage.setItem(CLEANUP_KEY, Date.now().toString());
}

/**
 * Clean up audit logs older than 30 days
 * Creates summary and deletes old logs
 */
export async function cleanupOldAuditLogs() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    // Get logs older than 30 days
    const oldLogs = await getDocuments('audit_logs');
    const logsToDelete = oldLogs.filter(log => 
      new Date(log.created_at) < thirtyDaysAgo
    );

    if (logsToDelete.length === 0) {
      console.log('No old audit logs to clean up');
      return { deleted: 0 };
    }

    // Create summary statistics
    const summary = {
      total_deleted: logsToDelete.length,
      date_range: {
        from: null,
        to: null
      },
      actions: {},
      unique_actors: new Set(),
      cleanup_date: new Date().toISOString()
    };

    // Collect statistics
    logsToDelete.forEach(log => {
      // Track date range
      if (!summary.date_range.from || log.created_at < summary.date_range.from) {
        summary.date_range.from = log.created_at;
      }
      if (!summary.date_range.to || log.created_at > summary.date_range.to) {
        summary.date_range.to = log.created_at;
      }

      // Count actions
      summary.actions[log.action] = (summary.actions[log.action] || 0) + 1;

      // Track unique actors
      if (log.actor_id) {
        summary.unique_actors.add(log.actor_id);
      }
    });

    // Convert Set to count
    summary.unique_actors = summary.unique_actors.size;

    // Save summary to archive collection
    await createDocument('audit_log_archives', summary);

    // Delete old logs (in batches to avoid overwhelming Firestore)
    const batchSize = 10;
    for (let i = 0; i < logsToDelete.length; i += batchSize) {
      const batch = logsToDelete.slice(i, i + batchSize);
      await Promise.all(batch.map(log => deleteDocument('audit_logs', log.id)));
    }

    console.log(`✅ Cleaned up ${summary.total_deleted} audit logs older than 30 days`);
    
    return {
      success: true,
      deleted: summary.total_deleted,
      summary_id: summary.cleanup_date
    };
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    throw error;
  }
}

/**
 * Clean up deleted circulars older than 90 days
 */
export async function cleanupOldDeletedCirculars() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  try {
    // Get all deleted circulars
    const deletedCirculars = await getDocuments('circulars');
    const circularsToDelete = deletedCirculars.filter(circular => 
      circular.status === 'deleted' && 
      circular.deleted_at &&
      new Date(circular.deleted_at) < ninetyDaysAgo
    );

    if (circularsToDelete.length === 0) {
      console.log('No old deleted circulars to clean up');
      return { deleted: 0 };
    }

    // Delete in batches
    const batchSize = 10;
    for (let i = 0; i < circularsToDelete.length; i += batchSize) {
      const batch = circularsToDelete.slice(i, i + batchSize);
      await Promise.all(batch.map(circular => deleteDocument('circulars', circular.id)));
    }

    console.log(`✅ Permanently deleted ${circularsToDelete.length} circulars older than 90 days`);

    return {
      success: true,
      deleted: circularsToDelete.length
    };
  } catch (error) {
    console.error('Error cleaning up deleted circulars:', error);
    throw error;
  }
}

/**
 * Run all cleanup tasks
 * Call this when admin visits Audit Logs page
 */
export async function runCleanupTasks() {
  if (!shouldRunCleanup()) {
    console.log('Cleanup already ran today');
    return { skipped: true };
  }

  console.log('🧹 Starting automated cleanup...');

  try {
    const [logsResult, circularsResult] = await Promise.all([
      cleanupOldAuditLogs(),
      cleanupOldDeletedCirculars()
    ]);

    markCleanupComplete();

    return {
      success: true,
      audit_logs: logsResult,
      deleted_circulars: circularsResult
    };
  } catch (error) {
    console.error('Cleanup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
