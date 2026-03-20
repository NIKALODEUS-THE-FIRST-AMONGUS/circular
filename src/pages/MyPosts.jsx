import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getDocuments, deleteCircular } from '../lib/firebase-db';
import { Trash2, FileText, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useNotify } from '../components/Toaster';
import { useConfirm } from '../components/ConfirmDialog';
import { useIsMobile } from '../hooks/useIsMobile';
import BottomNav from '../components/BottomNav';

const MyPosts = () => {
    const { user } = useAuth();
    const notify = useNotify();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const isMobile = useIsMobile();

    const fetchPosts = useCallback(async () => {
        try {
            const data = await getDocuments('circulars', {
                where: [['author_id', '==', user.uid]],
                orderBy: ['created_at', 'desc']
            });

            setPosts(data || []);
        } catch {
            // console.error();
        } finally {
            setLoading(false);
        }
    }, [user.uid]);

    useEffect(() => {
        if (user) fetchPosts();
    }, [user, fetchPosts]);

    const handleDelete = async (postId) => {
        const ok = await confirm({
            title: 'Delete Circular?',
            message: 'Are you sure you want to permanently delete this circular? This action cannot be undone.',
            type: 'danger',
            confirmText: 'Delete Now',
            cancelText: 'Keep it'
        });
        
        if (!ok) return;
        try {
            await deleteCircular(postId);
            setPosts(posts.filter(p => p.id !== postId));
            notify('✅ Circular deleted successfully', 'success');
            // Navigate to center with refresh flag to update feed
            navigate('/dashboard/center', { state: { refresh: true } });
        } catch (_err) {
            notify('❌ Delete failed: ' + _err.message, 'error');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-black text-text-main">My Circulars</h1>
                <p className="text-text-muted font-medium">Manage and review your published notifications.</p>
            </header>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            ) : posts.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-bg-light p-20 rounded-3xl border-2 border-dashed border-border-light text-center space-y-6"
                >
                    <div className="h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                        <FileText size={40} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-text-main">No Circulars Yet</h3>
                        <p className="text-text-muted font-medium max-w-md mx-auto">
                            You haven't created any circulars yet. Start broadcasting important information to your community.
                        </p>
                    </div>
                    <Link
                        to="/dashboard/create"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all"
                    >
                        <Plus size={18} />
                        Create Your First Circular
                    </Link>
                </motion.div>
            ) : (
                <div className="grid gap-4">
                    {posts.map(post => (
                        <div key={post.id} className="bg-bg-light p-6 rounded-2xl shadow-sm border border-border-light flex items-center justify-between group">
                            <div>
                                <h3 className="font-bold text-text-main">{post.title}</h3>
                                <p className="text-xs text-text-dim font-bold uppercase tracking-wider mt-1 italic">
                                    {new Date(post.created_at).toLocaleDateString()} • {post.department_target}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDelete(post.id)}
                                className="opacity-0 group-hover:opacity-100 p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {isMobile && <BottomNav notifCount={0} />}
        </div>
    );
};

export default MyPosts;
