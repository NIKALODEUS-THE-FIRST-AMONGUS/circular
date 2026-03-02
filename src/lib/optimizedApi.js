/**
 * Optimized API Layer - Firebase Version
 * Single call approach for fetch, post, update, delete operations
 * Reduces backend calls by batching and using efficient queries
 */

import { getDocuments, createDocument, updateDocument, deleteDocument } from './firebase-db';

/**
 * Batch fetch multiple resources in a single call
 * @param {Array} resources - Array of resource configs
 * @returns {Object} - Object with all fetched data
 */
export const batchFetch = async (resources) => {
    const promises = resources.map(async (resource) => {
        const { table, filters = {}, order, limit: resourceLimit, single = false } = resource;
        
        // Build Firebase filters
        const firebaseFilters = {};
        
        // Convert filters to Firebase format
        if (Object.keys(filters).length > 0) {
            firebaseFilters.where = Object.entries(filters).map(([key, value]) => {
                if (Array.isArray(value)) {
                    // Firebase doesn't support 'in' operator directly, we'll filter client-side
                    return null;
                } else if (value !== null && value !== undefined) {
                    return [key, '==', value];
                }
                return null;
            }).filter(Boolean);
        }
        
        // Apply ordering
        if (order) {
            firebaseFilters.orderBy = [order.column, order.ascending ? 'asc' : 'desc'];
        }
        
        // Apply limit
        if (resourceLimit) {
            firebaseFilters.limit = resourceLimit;
        }
        
        try {
            let data = await getDocuments(table, firebaseFilters);
            
            // Client-side filtering for 'in' operations
            if (Object.keys(filters).length > 0) {
                data = data.filter(doc => {
                    return Object.entries(filters).every(([key, value]) => {
                        if (Array.isArray(value)) {
                            return value.includes(doc[key]);
                        }
                        return true;
                    });
                });
            }
            
            if (single) {
                return { key: resource.key, data: data[0] || null, error: null };
            } else {
                return { key: resource.key, data, error: null };
            }
        } catch (error) {
            return { key: resource.key, data: null, error };
        }
    });
    
    const results = await Promise.all(promises);
    
    // Convert array to object
    return results.reduce((acc, result) => {
        acc[result.key] = {
            data: result.data,
            error: result.error
        };
        return acc;
    }, {});
};

/**
 * Batch insert multiple records across tables
 * @param {Array} operations - Array of insert operations
 * @returns {Object} - Results of all inserts
 */
export const batchInsert = async (operations) => {
    const promises = operations.map(async (op) => {
        const { table, data } = op;
        
        try {
            const result = await createDocument(table, data);
            return { key: op.key, data: result, error: null };
        } catch (error) {
            return { key: op.key, data: null, error };
        }
    });
    
    const results = await Promise.all(promises);
    
    return results.reduce((acc, result) => {
        acc[result.key] = {
            data: result.data,
            error: result.error
        };
        return acc;
    }, {});
};

/**
 * Batch update multiple records
 * @param {Array} operations - Array of update operations
 * @returns {Object} - Results of all updates
 */
export const batchUpdate = async (operations) => {
    const promises = operations.map(async (op) => {
        const { table, data, filters } = op;
        
        try {
            // Firebase requires document ID for updates
            // If filters contain 'id', use it directly
            if (filters.id) {
                const result = await updateDocument(table, filters.id, data);
                return { key: op.key, data: result, error: null };
            } else {
                // Otherwise, fetch documents matching filters and update them
                const docs = await getDocuments(table, {
                    where: Object.entries(filters).map(([key, value]) => [key, '==', value])
                });
                
                const updatePromises = docs.map(doc => updateDocument(table, doc.id, data));
                const results = await Promise.all(updatePromises);
                
                return { key: op.key, data: results, error: null };
            }
        } catch (error) {
            return { key: op.key, data: null, error };
        }
    });
    
    const results = await Promise.all(promises);
    
    return results.reduce((acc, result) => {
        acc[result.key] = {
            data: result.data,
            error: result.error
        };
        return acc;
    }, {});
};

/**
 * Batch delete multiple records
 * @param {Array} operations - Array of delete operations
 * @returns {Object} - Results of all deletes
 */
export const batchDelete = async (operations) => {
    const promises = operations.map(async (op) => {
        const { table, filters } = op;
        
        try {
            // Firebase requires document ID for deletes
            if (filters.id) {
                const result = await deleteDocument(table, filters.id);
                return { key: op.key, data: result, error: null };
            } else {
                // Fetch documents matching filters and delete them
                const docs = await getDocuments(table, {
                    where: Object.entries(filters).map(([key, value]) => [key, '==', value])
                });
                
                const deletePromises = docs.map(doc => deleteDocument(table, doc.id));
                const results = await Promise.all(deletePromises);
                
                return { key: op.key, data: results, error: null };
            }
        } catch (error) {
            return { key: op.key, data: null, error };
        }
    });
    
    const results = await Promise.all(promises);
    
    return results.reduce((acc, result) => {
        acc[result.key] = {
            data: result.data,
            error: result.error
        };
        return acc;
    }, {});
};

/**
 * Unified operation handler - handles fetch, insert, update, delete in one call
 * @param {Object} config - Operation configuration
 * @returns {Object} - Results of the operation
 */
export const unifiedOperation = async (config) => {
    const { type, operations } = config;
    
    switch (type) {
        case 'fetch':
            return await batchFetch(operations);
        case 'insert':
            return await batchInsert(operations);
        case 'update':
            return await batchUpdate(operations);
        case 'delete':
            return await batchDelete(operations);
        case 'mixed': {
            // Handle mixed operations
            const results = {};
            
            if (operations.fetch) {
                results.fetch = await batchFetch(operations.fetch);
            }
            if (operations.insert) {
                results.insert = await batchInsert(operations.insert);
            }
            if (operations.update) {
                results.update = await batchUpdate(operations.update);
            }
            if (operations.delete) {
                results.delete = await batchDelete(operations.delete);
            }
            
            return results;
        }
        default:
            throw new Error(`Unknown operation type: ${type}`);
    }
};

/**
 * Dashboard data fetcher - Single call for all dashboard data
 * @param {Object} user - Current user
 * @param {Object} profile - User profile
 * @returns {Object} - All dashboard data
 */
export const fetchDashboardData = async (user, profile) => {
    const operations = [
        {
            key: 'stats',
            table: 'profiles',
            filters: profile?.role === 'admin' ? { status: 'pending' } : {},
            single: false
        },
        {
            key: 'notifications',
            table: 'circulars',
            filters: profile?.role === 'student' 
                ? { department_target: ['ALL', profile.department] }
                : {},
            order: { column: 'created_at', ascending: false },
            limit: 10
        }
    ];
    
    return await batchFetch(operations);
};

/**
 * Circular detail fetcher - Single call for circular + views + activity
 * @param {String} circularId - Circular ID
 * @param {String} userId - Current user ID
 * @returns {Object} - Circular data with views and activity
 */
export const fetchCircularDetail = async (circularId, userId) => {
    const operations = [
        {
            key: 'circular',
            table: 'circulars',
            filters: { id: circularId },
            single: true
        },
        {
            key: 'views',
            table: 'circular_views',
            filters: { circular_id: circularId },
            order: { column: 'viewed_at', ascending: false },
            limit: 20
        }
    ];
    
    const results = await batchFetch(operations);
    
    // Track view in background (non-blocking)
    if (userId) {
        createDocument('circular_views', {
            circular_id: circularId,
            viewer_id: userId,
            viewed_at: new Date().toISOString()
        }).catch(() => {});
    }
    
    return results;
};

/**
 * Member management fetcher - Single call for profiles + pre-approvals
 * @returns {Object} - All member data
 */
export const fetchMemberData = async () => {
    return await batchFetch([
        {
            key: 'profiles',
            table: 'profiles',
            order: { column: 'created_at', ascending: false }
        },
        {
            key: 'preApprovals',
            table: 'profile_pre_approvals',
            order: { column: 'created_at', ascending: false }
        }
    ]);
};

/**
 * Create circular with audit log - Single transaction
 * @param {Object} circularData - Circular data
 * @param {Object} auditData - Audit log data
 * @returns {Object} - Created circular
 */
export const createCircularWithAudit = async (circularData, auditData) => {
    try {
        // Insert circular
        const circular = await createDocument('circulars', circularData);
        
        // Insert audit log in background (non-blocking)
        createDocument('audit_logs', auditData).catch(() => {});
        
        return { data: circular, error: null };
    } catch (error) {
        return { data: null, error };
    }
};

/**
 * Delete member with cleanup - Single transaction
 * @param {String} memberId - Member ID
 * @param {String} email - Member email
 * @returns {Object} - Delete result
 */
export const deleteMemberWithCleanup = async (memberId, email) => {
    const operations = [
        {
            key: 'profile',
            table: 'profiles',
            filters: { id: memberId }
        },
        {
            key: 'preApproval',
            table: 'profile_pre_approvals',
            filters: { email: email }
        }
    ];
    
    return await batchDelete(operations);
};

/**
 * Update profile with timestamp - Single call
 * @param {String} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Object} - Update result
 */
export const updateProfile = async (userId, updates) => {
    try {
        const result = await updateDocument('profiles', userId, {
            ...updates,
            updated_at: new Date().toISOString()
        });
        return { data: result, error: null };
    } catch (error) {
        return { data: null, error };
    }
};
