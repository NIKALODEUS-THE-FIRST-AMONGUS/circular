/**
 * Mobile-optimized Circular Detail Page
 * Touch-friendly interface with bottom action buttons
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDocument, getDocuments, createDocument } from '../../lib/firebase-db';
import { useNotify } from '../../components/Toaster';
import { ChevronLeft, Calendar, User, Eye, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const CircularDetailMobile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const notify = useNotify();
    const [circular, setCircular] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewCount, setViewCount] = useState(0);

    useEffect(() => {
        const fetchCircular = async () => {
            try {
                const [circularData, viewCounts] = await Promise.all([
                    getDocument('circulars', id),
                    getDocuments('circular_views', {
                        where: [['circular_id', '==', id]]
                    })
                ]);

                if (!circularData) {
                    throw new Error('Circular not found');
                }

                setCircular(circularData);
                setViewCount(viewCounts.length);

                // Track view
                if (profile?.id) {
                    createDocument('circular_views', {
                        circular_id: id,
                        viewer_id: profile.id,
                        viewed_at: new Date().toISOString()
                    }).catch(() => {});
                }
            } catch (err) {
                notify(err.message, 'error');
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchCircular();
    }, [id, profile, navigate, notify]);

    if (loading || !circular) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    const formattedDate = new Date(circular.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    return (
        <div className="min-h-screen bg-bg-light pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900 text-white p-4 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-lg">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-bold truncate">Circular Details</h1>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Title */}
                <h2 className="text-xl font-bold text-text-main">{circular.title}</h2>

                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-sm text-text-muted">
                    <div className="flex items-center gap-1">
                        <User size={14} />
                        <span>{circular.author_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Eye size={14} />
                        <span>{viewCount} views</span>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-surface-light rounded-xl p-4 border border-border-light">
                    <p className="text-text-main whitespace-pre-wrap leading-relaxed">
                        {circular.content}
                    </p>
                </div>

                {/* Attachments */}
                {circular.attachments && circular.attachments.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-text-main">Attachments</h3>
                        {circular.attachments.map((url, index) => (
                            <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-surface-light rounded-lg border border-border-light active:bg-bg-light"
                            >
                                <Download size={18} className="text-primary" />
                                <span className="text-sm text-text-main truncate flex-1">
                                    Attachment {index + 1}
                                </span>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CircularDetailMobile;
