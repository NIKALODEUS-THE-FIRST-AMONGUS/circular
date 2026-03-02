import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase-config';

/**
 * Firestore helper functions to replace Supabase queries
 */

// Profiles
export const profilesCollection = collection(db, 'profiles');

export const getProfile = async (userId) => {
  const docRef = doc(db, 'profiles', userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const createProfile = async (userId, profileData) => {
  const docRef = doc(db, 'profiles', userId);
  await setDoc(docRef, {
    ...profileData,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
};

export const updateProfile = async (userId, updates) => {
  const docRef = doc(db, 'profiles', userId);
  await updateDoc(docRef, {
    ...updates,
    updated_at: serverTimestamp()
  });
};

// Circulars
export const circularsCollection = collection(db, 'circulars');

export const getCirculars = async (filters = {}) => {
  let q = query(circularsCollection);
  
  // Apply filters
  if (filters.department) {
    q = query(q, where('department_target', '==', filters.department));
  }
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters.priority) {
    q = query(q, where('priority', '==', filters.priority));
  }
  
  // Order by created_at descending
  q = query(q, orderBy('created_at', 'desc'));
  
  // Apply limit
  if (filters.limit) {
    q = query(q, firestoreLimit(filters.limit));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getCircular = async (circularId) => {
  const docRef = doc(db, 'circulars', circularId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const createCircular = async (circularData) => {
  const docRef = doc(circularsCollection);
  await setDoc(docRef, {
    ...circularData,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
  return docRef.id;
};

export const updateCircular = async (circularId, updates) => {
  const docRef = doc(db, 'circulars', circularId);
  await updateDoc(docRef, {
    ...updates,
    updated_at: serverTimestamp()
  });
};

export const deleteCircular = async (circularId) => {
  const docRef = doc(db, 'circulars', circularId);
  await deleteDoc(docRef);
};

// Circular Acknowledgments
export const createAcknowledgment = async (circularId, userId) => {
  const docRef = doc(collection(db, 'circular_acknowledgments'));
  await setDoc(docRef, {
    circular_id: circularId,
    user_id: userId,
    acknowledged_at: serverTimestamp()
  });
};

export const getAcknowledgments = async (circularId) => {
  const q = query(
    collection(db, 'circular_acknowledgments'),
    where('circular_id', '==', circularId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Circular Bookmarks
export const createBookmark = async (circularId, userId) => {
  const docRef = doc(collection(db, 'circular_bookmarks'));
  await setDoc(docRef, {
    circular_id: circularId,
    user_id: userId,
    created_at: serverTimestamp()
  });
};

export const deleteBookmark = async (circularId, userId) => {
  const q = query(
    collection(db, 'circular_bookmarks'),
    where('circular_id', '==', circularId),
    where('user_id', '==', userId)
  );
  const snapshot = await getDocs(q);
  snapshot.docs.forEach(doc => deleteDoc(doc.ref));
};

export const getUserBookmarks = async (userId) => {
  const q = query(
    collection(db, 'circular_bookmarks'),
    where('user_id', '==', userId),
    orderBy('created_at', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Circular Views (Analytics)
export const recordView = async (circularId, userId) => {
  const docRef = doc(collection(db, 'circular_views'));
  await setDoc(docRef, {
    circular_id: circularId,
    user_id: userId,
    viewed_at: serverTimestamp()
  });
};

// Notification Tokens
export const saveNotificationToken = async (userId, token, deviceType) => {
  const docRef = doc(collection(db, 'notification_tokens'));
  await setDoc(docRef, {
    user_id: userId,
    token,
    device_type: deviceType,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
};

// Feedback
export const createFeedback = async (userId, feedbackData) => {
  const docRef = doc(collection(db, 'feedback'));
  await setDoc(docRef, {
    user_id: userId,
    ...feedbackData,
    created_at: serverTimestamp(),
    status: 'pending'
  });
};

// Audit Logs
export const createAuditLog = async (logData) => {
  const docRef = doc(collection(db, 'audit_logs'));
  await setDoc(docRef, {
    ...logData,
    created_at: serverTimestamp()
  });
};

// Helper to convert Firestore Timestamp to ISO string
export const timestampToISO = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  return timestamp;
};
