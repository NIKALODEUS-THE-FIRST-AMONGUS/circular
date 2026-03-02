/**
 * Pure Firebase Firestore Database Helpers
 * NO SUPABASE - Direct Firebase operations only
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase-config';

// Convert ISO string to Firestore Timestamp
export const toTimestamp = (dateString) => {
  if (!dateString) return null;
  if (dateString instanceof Timestamp) return dateString;
  return Timestamp.fromDate(new Date(dateString));
};

// Convert Firestore Timestamp to ISO string
export const fromTimestamp = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  return timestamp;
};

// CREATE - Add new document
export const createDocument = async (collectionName, data, docId = null) => {
  try {
    const dataWithTimestamp = {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    if (docId) {
      // Use specific ID
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, dataWithTimestamp);
      return { id: docId, ...dataWithTimestamp };
    } else {
      // Auto-generate ID
      const colRef = collection(db, collectionName);
      const docRef = await addDoc(colRef, dataWithTimestamp);
      return { id: docRef.id, ...dataWithTimestamp };
    }
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
};

// READ - Get single document
export const getDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      created_at: fromTimestamp(data.created_at),
      updated_at: fromTimestamp(data.updated_at)
    };
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
};

// READ - Get all documents with optional filters
export const getDocuments = async (collectionName, filters = {}) => {
  try {
    const colRef = collection(db, collectionName);
    const constraints = [];

    // Add where clauses
    if (filters.where) {
      filters.where.forEach(([field, operator, value]) => {
        constraints.push(where(field, operator, value));
      });
    }

    // Add orderBy
    if (filters.orderBy) {
      const [field, direction = 'asc'] = filters.orderBy;
      constraints.push(orderBy(field, direction));
    }

    // Add limit
    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }

    const q = query(colRef, ...constraints);
    const querySnapshot = await getDocs(q);
    
    const documents = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      documents.push({
        id: doc.id,
        ...data,
        created_at: fromTimestamp(data.created_at),
        updated_at: fromTimestamp(data.updated_at)
      });
    });

    return documents;
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
};

// UPDATE - Update existing document
export const updateDocument = async (collectionName, docId, updates) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const dataWithTimestamp = {
      ...updates,
      updated_at: serverTimestamp()
    };
    
    await updateDoc(docRef, dataWithTimestamp);
    return { id: docId, ...dataWithTimestamp };
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
};

// DELETE - Delete document
export const deleteDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return { id: docId };
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
};

// SPECIFIC HELPERS

// Circulars
export const createCircular = async (circularData) => {
  return createDocument('circulars', circularData);
};

export const getCircular = async (circularId) => {
  return getDocument('circulars', circularId);
};

export const getAllCirculars = async (filters = {}) => {
  return getDocuments('circulars', filters);
};

export const updateCircular = async (circularId, updates) => {
  return updateDocument('circulars', circularId, updates);
};

export const deleteCircular = async (circularId) => {
  return deleteDocument('circulars', circularId);
};

// Profiles
export const createProfile = async (userId, profileData) => {
  return createDocument('profiles', profileData, userId);
};

export const getProfile = async (userId) => {
  return getDocument('profiles', userId);
};

export const updateProfile = async (userId, updates) => {
  return updateDocument('profiles', userId, updates);
};

// Audit Logs
export const createAuditLog = async (logData) => {
  return createDocument('audit_logs', {
    ...logData,
    timestamp: serverTimestamp()
  });
};

// Feedback
export const createFeedback = async (feedbackData) => {
  return createDocument('feedback', feedbackData);
};

export const getAllFeedback = async () => {
  return getDocuments('feedback', {
    orderBy: ['created_at', 'desc']
  });
};

// Acknowledgments
export const createAcknowledgment = async (ackData) => {
  return createDocument('circular_acknowledgments', ackData);
};

export const getAcknowledgments = async (circularId) => {
  return getDocuments('circular_acknowledgments', {
    where: [['circular_id', '==', circularId]]
  });
};

// Bookmarks
export const createBookmark = async (bookmarkData) => {
  return createDocument('circular_bookmarks', bookmarkData);
};

export const deleteBookmark = async (bookmarkId) => {
  return deleteDocument('circular_bookmarks', bookmarkId);
};

export const getUserBookmarks = async (userId) => {
  return getDocuments('circular_bookmarks', {
    where: [['user_id', '==', userId]]
  });
};

// Downloads tracking
export const trackDownload = async (downloadData) => {
  return createDocument('circular_downloads', downloadData);
};

export default {
  // Generic
  createDocument,
  getDocument,
  getDocuments,
  updateDocument,
  deleteDocument,
  
  // Circulars
  createCircular,
  getCircular,
  getAllCirculars,
  updateCircular,
  deleteCircular,
  
  // Profiles
  createProfile,
  getProfile,
  updateProfile,
  
  // Audit
  createAuditLog,
  
  // Feedback
  createFeedback,
  getAllFeedback,
  
  // Acknowledgments
  createAcknowledgment,
  getAcknowledgments,
  
  // Bookmarks
  createBookmark,
  deleteBookmark,
  getUserBookmarks,
  
  // Downloads
  trackDownload,
  
  // Utilities
  toTimestamp,
  fromTimestamp,
  serverTimestamp
};
