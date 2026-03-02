/**
 * Database abstraction layer
 * Provides a unified interface for database operations
 * Makes it easier to switch between Supabase and Firebase
 */

import {
  getCirculars,
  getCircular,
  createCircular,
  updateCircular,
  deleteCircular,
  getProfile,
  createProfile,
  updateProfile,
  createAcknowledgment,
  getAcknowledgments,
  createBookmark,
  deleteBookmark,
  getUserBookmarks,
  recordView,
  saveNotificationToken,
  createFeedback,
  createAuditLog,
  timestampToISO
} from './firestore-helpers';

// Export all Firestore helpers with a consistent API
export const db = {
  // Circulars
  circulars: {
    getAll: getCirculars,
    getOne: getCircular,
    create: createCircular,
    update: updateCircular,
    delete: deleteCircular,
  },
  
  // Profiles
  profiles: {
    getOne: getProfile,
    create: createProfile,
    update: updateProfile,
  },
  
  // Acknowledgments
  acknowledgments: {
    create: createAcknowledgment,
    getByCircular: getAcknowledgments,
  },
  
  // Bookmarks
  bookmarks: {
    create: createBookmark,
    delete: deleteBookmark,
    getByUser: getUserBookmarks,
  },
  
  // Views
  views: {
    record: recordView,
  },
  
  // Notifications
  notifications: {
    saveToken: saveNotificationToken,
  },
  
  // Feedback
  feedback: {
    create: createFeedback,
  },
  
  // Audit
  audit: {
    log: createAuditLog,
  },
  
  // Utilities
  utils: {
    timestampToISO,
  },
};

export default db;
