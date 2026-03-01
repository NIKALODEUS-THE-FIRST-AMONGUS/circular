// Mock authentication for development when network is unavailable
// Set VITE_USE_MOCK_AUTH=true in .env to enable

const MOCK_USER = {
    id: 'mock-user-123',
    email: 'dev@test.com',
    user_metadata: {
        full_name: 'Dev User',
        email: 'dev@test.com'
    }
};

const MOCK_PROFILE = {
    id: 'mock-user-123',
    email: 'dev@test.com',
    full_name: 'Dev User',
    role: 'admin',
    department: 'CSE',
    status: 'active',
    class_branch: 'A',
    college_role: 'Developer',
    mobile_number: '1234567890',
    year_of_study: '3',
    section: 'A',
    avatar_url: null,
    theme_preference: 'dark',
    greeting_language: 'en',
    daily_intro_enabled: true,
    intro_frequency: 'daily'
};

export const mockSupabase = {
    auth: {
        getSession: async () => {
            return {
                data: {
                    session: {
                        user: MOCK_USER,
                        access_token: 'mock-token'
                    }
                },
                error: null
            };
        },

        signInWithOAuth: async ({ provider: _provider, options: _options }) => {
            setTimeout(() => {
                window.location.hash = '#access_token=mock-token&refresh_token=mock-refresh';
                window.location.reload();
            }, 500);
            return { data: { url: 'mock-oauth-url' }, error: null };
        },

        signInWithPassword: async ({ email: _email, password }) => {
            if (password === 'admin123') {
                return { data: { user: MOCK_USER, session: {} }, error: null };
            }
            return { data: null, error: { message: 'Invalid credentials' } };
        },

        signOut: async () => {
            localStorage.clear();
            return { error: null };
        },

        onAuthStateChange: (callback) => {
            console.log('🎭 Mock: onAuthStateChange registered');
            setTimeout(() => {
                callback('INITIAL_SESSION', { user: MOCK_USER });
            }, 100);

            return {
                data: {
                    subscription: {
                        unsubscribe: () => {}
                    }
                }
            };
        },

        signUp: async (data) => {
            return { data: { user: { ...MOCK_USER, email: data.email } }, error: null };
        },

        updateUser: async (data) => {
            console.log('🎭 Mock: updateUser', data);
            return { data: { user: MOCK_USER }, error: null };
        }
    },

    from: (table) => {
        const builder = {
            select: (cols, options) => {
                console.log('🎭 Mock: Select', { table, cols, options });
                return builder;
            },
            eq: (col, val) => {
                console.log('🎭 Mock: Eq', { table, col, val });
                return builder;
            },
            in: (col, val) => {
                console.log('🎭 Mock: In', { table, col, val });
                return builder;
            },
            order: (col, options) => {
                console.log('🎭 Mock: Order', { table, col, options });
                return builder;
            },
            limit: (val) => {
                console.log('🎭 Mock: Limit', { table, val });
                return builder;
            },
            range: (from, to) => {
                console.log('🎭 Mock: Range', { table, from, to });
                return builder;
            },
            match: (data) => {
                console.log('🎭 Mock: Match', { table, data });
                return builder;
            },
            single: async () => {
                console.log('🎭 Mock: Single', { table });
                if (table === 'profiles') return { data: MOCK_PROFILE, error: null };
                return { data: null, error: null };
            },
            maybeSingle: async () => {
                console.log('🎭 Mock: MaybeSingle', { table });
                if (table === 'profiles') return { data: MOCK_PROFILE, error: null };
                return { data: null, error: null };
            },
            then: (_onSuccess) => {
                console.log('🎭 Mock: Awaiting Query', { table });
                let data = [];
                if (table === 'circulars') {
                    data = [
                        { id: '1', title: 'Mock Circular 1', content: 'Content 1', created_at: new Date().toISOString(), author_name: 'Admin', department_target: 'ALL', priority: 'normal' },
                        { id: '2', title: 'Mock Circular 2 (Important)', content: 'Content 2', created_at: new Date().toISOString(), author_name: 'Admin', department_target: 'CSE', priority: 'important' }
                    ];
                } else if (table === 'profiles') {
                    data = [MOCK_PROFILE];
                }
                const result = { data, error: null };
                return Promise.resolve(_onSuccess ? _onSuccess(result) : result);
            },
            insert: (data) => {
                console.log('🎭 Mock: Insert', { table, data });
                return {
                    select: (cols) => {
                        console.log('🎭 Mock: Insert.Select', { table, cols });
                        return {
                            single: async () => {
                                console.log('🎭 Mock: Insert.Select.Single', { table });
                                return { data: Array.isArray(data) ? data[0] : data, error: null };
                            },
                            then: async (_onSuccess) => {
                                const result = { data: Array.isArray(data) ? data : [data], error: null };
                                return Promise.resolve(_onSuccess ? _onSuccess(result) : result);
                            }
                        };
                    },
                    then: async (_onSuccess) => {
                        const result = { data: Array.isArray(data) ? data : [data], error: null };
                        return Promise.resolve(_onSuccess ? _onSuccess(result) : result);
                    }
                };
            },
            update: (data) => {
                console.log('🎭 Mock: Update', { table, data });
                return builder;
            },
            upsert: async (data) => {
                console.log('🎭 Mock: Upsert', { table, data });
                return { data, error: null };
            },
            delete: () => {
                console.log('🎭 Mock: Delete', { table });
                return builder;
            }
        };
        return builder;
    },

    channel: (name) => {
        console.log('🎭 Mock: Channel created', name);
        const mockChannel = {
            on: (type, filter, _callback) => {
                console.log('🎭 Mock: Channel.on', { type, filter });
                return mockChannel;
            },
            subscribe: () => {
                console.log('🎭 Mock: Channel.subscribe');
                return {
                    unsubscribe: () => console.log('🎭 Mock: Channel.unsubscribe')
                };
            },
            unsubscribe: () => console.log('🎭 Mock: Channel.unsubscribe')
        };
        return mockChannel;
    },

    removeChannel: (_channel) => {
        console.log('🎭 Mock: removeChannel');
        return Promise.resolve();
    },

    storage: {
        from: (bucket) => ({
            upload: async (path, _file) => {
                console.log('🎭 Mock: Storage Upload', { bucket, path });
                return { data: { path }, error: null };
            },
            getPublicUrl: (path) => {
                console.log('🎭 Mock: Storage PublicUrl', { bucket, path });
                return { data: { publicUrl: `https://mock-storage.com/${bucket}/${path}` } };
            }
        })
    }
};

export const isMockMode = () => {
    return import.meta.env.VITE_USE_MOCK_AUTH === 'true';
};
