/**
 * Database abstraction layer
 * Provides a unified interface for database operations
 * Compatible with Supabase-style queries but uses Firebase Firestore
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  startAfter
} from 'firebase/firestore';
import { db as firestore } from './firebase-config';
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

// Supabase-compatible query builder for Firebase
class FirestoreQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.constraints = [];
    this.orderByField = null;
    this.orderDirection = 'desc';
    this.limitCount = null;
    this.selectFields = '*';
    this.ilikeFilters = [];
    this.startAfterDoc = null;
    this.countOnly = false;
    this.headOnly = false;
  }

  select(fields = '*', options = {}) {
    this.selectFields = fields;
    if (options.count) {
      this.countOnly = options.count === 'exact';
    }
    if (options.head) {
      this.headOnly = true;
    }
    return this;
  }

  eq(field, value) {
    this.constraints.push(where(field, '==', value));
    return this;
  }

  neq(field, value) {
    this.constraints.push(where(field, '!=', value));
    return this;
  }

  in(field, values) {
    if (values && values.length > 0) {
      // Firestore 'in' supports max 30 values (updated from 10)
      if (values.length <= 30) {
        this.constraints.push(where(field, 'in', values));
      } else {
        // For more than 30 values, just take first 30
        console.warn(`Firestore 'in' query limited to 30 values, got ${values.length}`);
        this.constraints.push(where(field, 'in', values.slice(0, 30)));
      }
    }
    return this;
  }

  gte(field, value) {
    const firestoreValue = typeof value === 'string' && value.includes('T')
      ? Timestamp.fromDate(new Date(value))
      : value;
    this.constraints.push(where(field, '>=', firestoreValue));
    return this;
  }

  lte(field, value) {
    const firestoreValue = typeof value === 'string' && value.includes('T')
      ? Timestamp.fromDate(new Date(value))
      : value;
    this.constraints.push(where(field, '<=', firestoreValue));
    return this;
  }

  ilike(field, pattern) {
    // Firestore doesn't support ILIKE, handle client-side
    this.ilikeFilters.push({ field, pattern });
    return this;
  }

  order(field, options = {}) {
    this.orderByField = field;
    this.orderDirection = options.ascending ? 'asc' : 'desc';
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  range(from, to) {
    this.limitCount = to - from + 1;
    // TODO: Handle 'from' offset with startAfter
    return this;
  }

  maybeSingle() {
    this.limitCount = 1;
    this.returnSingle = true;
    return this;
  }

  single() {
    this.limitCount = 1;
    this.returnSingle = true;
    this.throwOnEmpty = true;
    return this;
  }

  // Update method for Supabase compatibility
  update(updates) {
    this.updateData = updates;
    this.isUpdate = true;
    return this;
  }

  // Insert method for Supabase compatibility
  insert(data) {
    this.insertData = Array.isArray(data) ? data : [data];
    this.isInsert = true;
    return this;
  }

  async execute() {
    try {
      // Handle INSERT operations
      if (this.isInsert) {
        const { addDoc, collection: firestoreCollection, doc, setDoc } = await import('firebase/firestore');
        
        const insertedDocs = [];
        
        for (const item of this.insertData) {
          // If item has an id, use setDoc, otherwise use addDoc
          if (item.id) {
            const docRef = doc(firestore, this.tableName, item.id);
            await setDoc(docRef, item);
            insertedDocs.push({ id: item.id, ...item });
          } else {
            const colRef = firestoreCollection(firestore, this.tableName);
            const docRef = await addDoc(colRef, item);
            insertedDocs.push({ id: docRef.id, ...item });
          }
        }
        
        return {
          data: this.returnSingle ? insertedDocs[0] : insertedDocs,
          error: null,
          count: insertedDocs.length
        };
      }

      // Handle UPDATE operations
      if (this.isUpdate) {
        const { doc, updateDoc } = await import('firebase/firestore');
        
        // If we have constraints, we need to query first to get the doc IDs
        if (this.constraints.length > 0) {
          const constraints = [...this.constraints];
          const q = query(collection(firestore, this.tableName), ...constraints);
          const querySnapshot = await getDocs(q);
          
          // Update all matching documents
          const updatePromises = [];
          querySnapshot.forEach((docSnapshot) => {
            const docRef = doc(firestore, this.tableName, docSnapshot.id);
            updatePromises.push(updateDoc(docRef, this.updateData));
          });
          
          await Promise.all(updatePromises);
          
          return { 
            data: null, 
            error: null, 
            count: querySnapshot.size 
          };
        } else {
          // No constraints means we need a document ID
          throw new Error('Update requires either constraints or a document ID');
        }
      }

      // Handle SELECT operations
      const constraints = [...this.constraints];

      if (this.orderByField) {
        constraints.push(orderBy(this.orderByField, this.orderDirection));
      }

      if (this.limitCount) {
        constraints.push(limit(this.limitCount));
      }

      if (this.startAfterDoc) {
        constraints.push(startAfter(this.startAfterDoc));
      }

      const q = query(collection(firestore, this.tableName), ...constraints);
      const querySnapshot = await getDocs(q);

      let data = [];
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        // Convert Firestore Timestamps to ISO strings
        Object.keys(docData).forEach(key => {
          if (docData[key] instanceof Timestamp) {
            docData[key] = docData[key].toDate().toISOString();
          }
        });
        data.push({ id: doc.id, ...docData });
      });

      // Apply client-side ILIKE filters
      if (this.ilikeFilters.length > 0) {
        this.ilikeFilters.forEach(({ field, pattern }) => {
          const searchTerm = pattern.replace(/%/g, '').toLowerCase();
          data = data.filter(item =>
            item[field] && item[field].toLowerCase().includes(searchTerm)
          );
        });
      }

      // Handle count-only queries
      if (this.countOnly) {
        return { data: null, error: null, count: data.length };
      }

      // Handle head-only queries (just count, no data)
      if (this.headOnly) {
        return { data: null, error: null, count: data.length };
      }

      // Handle single result
      if (this.returnSingle) {
        if (data.length === 0 && this.throwOnEmpty) {
          return { data: null, error: new Error('No rows found') };
        }
        return { data: data[0] || null, error: null };
      }

      return { data, error: null, count: data.length };
    } catch (error) {
      console.error('Firestore query error:', error);
      return { data: null, error, count: 0 };
    }
  }

  // Make it thenable so it works with await
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

import { createStorageClient } from './firebase-storage';

// Supabase-compatible API
export const supabase = {
  from: (tableName) => new FirestoreQueryBuilder(tableName),
  
  // Storage API using Firebase Storage
  storage: createStorageClient(),

  // Functions API (placeholder)
  functions: {
    invoke: async (_functionName, _options) => {
      // TODO: Implement Firebase Functions invocation
      console.warn('Functions invoke not yet implemented for Firebase');
      return { data: null, error: null };
    }
  }
};

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
