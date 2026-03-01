/**
 * Optimized API Layer
 * Single call approach for fetch, post, update, delete operations
 * Reduces backend calls by batching and using efficient queries
 */

import { supabase } from './supabase';

/**
 * Batch fetch multiple resources in a single call
 * @param {Array} resources - Array of resource configs
 * @returns {Object} - Object with all fetched data
 */
export const batchFetch = async (resources) => {
    const promises = resources.map(async (resource) => {
        const { table, select, filters = {}, order, limit, single = false } = resource;
        
        let query = supabase.from(table).select(select || '*');
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                query = query.in(key, value);
            } else if (value !== null && value !== undefined) {
                query = query.eq(key, value);
            }
        });
        
        // Apply ordering
        if (order) {
            query = query.order(order.column, { ascending: order.ascending ?? false });
        }
        
        // Apply limit
        if (limit) {
            query = query.limit(limit);
        }
        
        // Execute query
        if (single) {
            const { data, error } = await query.maybeSingle();
            return { key: resource.key, data, error };
        } else {
            const { data, error } = await query;
            return { key: resource.key, data, error };
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
        const { table, data, select = false } = op;
        
        let query = supabase.from(table).insert(data);
        
        if (select) {
            query = query.select();
        }
        
        const result = await query;
        return { key: op.key, ...result };
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
        const { table, data, filters, select = false } = op;
        
        let query = supabase.from(table).update(data);
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        if (select) {
            query = query.select();
        }
        
        const result = await query;
        return { key: op.key, ...result };
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
        
        let query = supabase.from(table).delete();
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        const result = await query;
        return { key: op.key, ...result };
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
            select: '*',
            filters: profile?.role === 'admin' ? { status: 'pending' } : {},
            single: false
        },
        {
            key: 'notifications',
            table: 'circulars',
            select: 'id, title, created_at, author_name, priority',
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
            select: '*',
            filters: { id: circularId },
            single: true
        },
        {
            key: 'views',
            table: 'circular_views',
            select: `
                viewed_at,
                profiles:viewer_id (
                    id,
                    full_name,
                    avatar_url,
                    department,
                    role
                )
            `,
            filters: { circular_id: circularId },
            order: { column: 'viewed_at', ascending: false },
            limit: 20
        }
    ];
    
    const results = await batchFetch(operations);
    
    // Track view in background (non-blocking)
    if (userId) {
        supabase
            .from('circular_views')
            .upsert({ 
                circular_id: circularId, 
                viewer_id: userId,
                viewed_at: new Date().toISOString()
            }, { 
                onConflict: 'circular_id,viewer_id' 
            })
            .then(() => {})
            .catch(() => {});
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
            select: 'id, email, full_name, title, role, department, status, created_at, avatar_url, year_of_study, section, mobile_number',
            order: { column: 'created_at', ascending: false }
        },
        {
            key: 'preApprovals',
            table: 'profile_pre_approvals',
            select: 'email, role, department, created_at',
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
    // Insert circular
    const { data: circular, error: circularError } = await supabase
        .from('circulars')
        .insert([circularData])
        .select()
        .single();
    
    if (circularError) throw circularError;
    
    // Insert audit log in background (non-blocking)
    supabase
        .from('audit_logs')
        .insert(auditData)
        .then(() => {})
        .catch(() => {});
    
    return { data: circular, error: null };
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
    return await supabase
        .from('profiles')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
};
