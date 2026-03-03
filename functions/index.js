const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

/**
 * Scheduled function to clean up audit logs older than 30 days
 * Runs daily at 2 AM UTC
 * Keeps a summary of deleted logs in audit_log_archives collection
 */
exports.cleanupOldAuditLogs = onSchedule('0 2 * * *', async (_event) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    // Get logs older than 30 days
    const oldLogsSnapshot = await db.collection('audit_logs')
      .where('created_at', '<', thirtyDaysAgo.toISOString())
      .get();

    if (oldLogsSnapshot.empty) {
      console.log('No old audit logs to clean up');
      return null;
    }

    // Create summary statistics
    const summary = {
      total_deleted: oldLogsSnapshot.size,
      date_range: {
        from: null,
        to: null
      },
      actions: {},
      actors: new Set(),
      cleanup_date: new Date().toISOString()
    };

    // Collect statistics and prepare batch delete
    const batch = db.batch();
    oldLogsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Track date range
      if (!summary.date_range.from || data.created_at < summary.date_range.from) {
        summary.date_range.from = data.created_at;
      }
      if (!summary.date_range.to || data.created_at > summary.date_range.to) {
        summary.date_range.to = data.created_at;
      }

      // Count actions
      summary.actions[data.action] = (summary.actions[data.action] || 0) + 1;

      // Track unique actors
      if (data.actor_id) {
        summary.actors.add(data.actor_id);
      }

      // Add to batch delete
      batch.delete(doc.ref);
    });

    // Convert Set to count
    summary.unique_actors = summary.actors.size;
    delete summary.actors;

    // Save summary to archive collection
    await db.collection('audit_log_archives').add(summary);

    // Execute batch delete
    await batch.commit();

    console.log(`Cleaned up ${summary.total_deleted} audit logs older than 30 days`);
    console.log(`Summary saved to audit_log_archives`);

    return {
      success: true,
      deleted: summary.total_deleted,
      summary_id: summary.cleanup_date
    };
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    throw error;
  }
});

/**
 * Scheduled function to clean up deleted circulars older than 90 days
 * Runs weekly on Sunday at 3 AM UTC
 */
exports.cleanupOldDeletedCirculars = onSchedule('0 3 * * 0', async (_event) => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  try {
    // Get deleted circulars older than 90 days
    const oldCircularsSnapshot = await db.collection('circulars')
      .where('status', '==', 'deleted')
      .where('deleted_at', '<', ninetyDaysAgo.toISOString())
      .get();

    if (oldCircularsSnapshot.empty) {
      console.log('No old deleted circulars to clean up');
      return null;
    }

    // Create summary
    const summary = {
      total_deleted: oldCircularsSnapshot.size,
      cleanup_date: new Date().toISOString(),
      circular_ids: oldCircularsSnapshot.docs.map(doc => doc.id)
    };

    // Batch delete
    const batch = db.batch();
    oldCircularsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`Permanently deleted ${summary.total_deleted} circulars older than 90 days`);

    return {
      success: true,
      deleted: summary.total_deleted
    };
  } catch (error) {
    console.error('Error cleaning up deleted circulars:', error);
    throw error;
  }
});
