const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();

/**
 * Triggered when a circular document is created or updated.
 * Sends FCM push notifications to all subscribed users when
 * a circular's status changes to 'published'.
 */
exports.sendCircularNotification = onDocumentWritten('circulars/{circularId}', async (event) => {
  const before = event.data.before?.data();
  const after  = event.data.after?.data();

  // Only fire when transitioning TO 'published'
  if (after?.status !== 'published' || before?.status === 'published') {
    return null;
  }

  const title      = after.title || 'New Circular';
  const body       = `Posted by ${after.author_name || 'School'} — tap to view`;
  const circularId = event.params.circularId;

  try {
    // Fetch all stored FCM tokens
    const tokensSnap = await db.collection('notification_tokens').get();
    if (tokensSnap.empty) {
      console.log('No FCM tokens found — nobody to notify.');
      return null;
    }

    const tokens       = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
    const uniqueTokens = [...new Set(tokens)]; // deduplicate

    if (uniqueTokens.length === 0) return null;

    // FCM allows max 500 tokens per sendEachForMulticast call
    const BATCH_SIZE = 500;
    const staleTokens = [];

    for (let i = 0; i < uniqueTokens.length; i += BATCH_SIZE) {
      const batch = uniqueTokens.slice(i, i + BATCH_SIZE);
      const message = {
        tokens: batch,
        notification: { title, body },
        data: {
          circularId,
          url: `/dashboard/center/${circularId}`,
          priority: after.priority || 'normal',
        },
        webpush: {
          notification: {
            title,
            body,
            icon: '/logo.svg',
            badge: '/logo.svg',
            requireInteraction: after.priority === 'urgent',
          },
          fcmOptions: {
            link: `/dashboard/center/${circularId}`,
          },
        },
        android: {
          notification: {
            channelId: 'circulars',
            priority: after.priority === 'urgent' ? 'high' : 'default',
          },
        },
      };

      const response = await getMessaging().sendEachForMulticast(message);
      console.log(`Batch ${i / BATCH_SIZE + 1}: ${response.successCount} sent, ${response.failureCount} failed`);

      // Collect stale/invalid tokens to clean up
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const errCode = res.error?.code;
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            staleTokens.push(batch[idx]);
          }
        }
      });
    }

    // Remove stale tokens from Firestore (batch of up to 30 at a time due to 'in' limit)
    if (staleTokens.length > 0) {
      console.log(`Cleaning up ${staleTokens.length} stale tokens…`);
      for (let j = 0; j < staleTokens.length; j += 30) {
        const chunk = staleTokens.slice(j, j + 30);
        const staleSnap = await db.collection('notification_tokens')
          .where('token', 'in', chunk)
          .get();
        const deleteBatch = db.batch();
        staleSnap.docs.forEach(d => deleteBatch.delete(d.ref));
        await deleteBatch.commit();
      }
    }

    console.log(`Notification sent for circular: ${title}`);
    return null;
  } catch (err) {
    console.error('FCM send error:', err);
    return null;
  }
});

/**
 * Scheduled function to clean up audit logs older than 30 days
 * Runs daily at 2 AM UTC
 * Keeps a summary of deleted logs in audit_log_archives collection
 */
exports.cleanupOldAuditLogs = onSchedule('0 2 * * *', async (_event) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const oldLogsSnapshot = await db.collection('audit_logs')
      .where('created_at', '<', thirtyDaysAgo.toISOString())
      .get();

    if (oldLogsSnapshot.empty) {
      console.log('No old audit logs to clean up');
      return null;
    }

    const summary = {
      total_deleted: oldLogsSnapshot.size,
      date_range: { from: null, to: null },
      actions: {},
      actors: new Set(),
      cleanup_date: new Date().toISOString()
    };

    const batch = db.batch();
    oldLogsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!summary.date_range.from || data.created_at < summary.date_range.from) summary.date_range.from = data.created_at;
      if (!summary.date_range.to   || data.created_at > summary.date_range.to)   summary.date_range.to   = data.created_at;
      summary.actions[data.action] = (summary.actions[data.action] || 0) + 1;
      if (data.actor_id) summary.actors.add(data.actor_id);
      batch.delete(doc.ref);
    });

    summary.unique_actors = summary.actors.size;
    delete summary.actors;

    await db.collection('audit_log_archives').add(summary);
    await batch.commit();

    console.log(`Cleaned up ${summary.total_deleted} audit logs older than 30 days`);
    return { success: true, deleted: summary.total_deleted, summary_id: summary.cleanup_date };
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
    const oldCircularsSnapshot = await db.collection('circulars')
      .where('status', '==', 'deleted')
      .where('deleted_at', '<', ninetyDaysAgo.toISOString())
      .get();

    if (oldCircularsSnapshot.empty) {
      console.log('No old deleted circulars to clean up');
      return null;
    }

    const summary = {
      total_deleted: oldCircularsSnapshot.size,
      cleanup_date: new Date().toISOString(),
      circular_ids: oldCircularsSnapshot.docs.map(doc => doc.id)
    };

    const batch = db.batch();
    oldCircularsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`Permanently deleted ${summary.total_deleted} circulars older than 90 days`);
    return { success: true, deleted: summary.total_deleted };
  } catch (error) {
    console.error('Error cleaning up deleted circulars:', error);
    throw error;
  }
});
