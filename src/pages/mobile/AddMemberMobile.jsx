/**
 * Mobile-optimized Add Member Page
 * Simplified form for adding new members
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDocument } from '../../lib/firebase-db';
import { useNotify } from '../../components/Toaster';
import { ChevronLeft, UserPlus, Loader2 } from 'lucide-react';

const AddMemberMobile = () => {
    const navigate = useNavigate();
    const notify = useNotify();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        role: 'student',
        department: 'CSE',
        status: 'pending'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.full_name.trim() || !formData.email.trim()) {
            notify('Please fill in all required fields', 'error');
            return;
        }

        setLoading(true);
        try {
            await createDocument('profiles', formData);
            notify('✅ Member added successfully', 'success');
            navigate('/dashboard/manage-users');
        } catch (error) {
            notify(`Failed to add member: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-light">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-lg">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-lg font-bold">Add Member</h1>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    Add
                </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-text-main mb-2">
                        Full Name *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-border-light bg-surface-light text-text-main outline-none focus:border-primary"
                        placeholder="Enter full name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-text-main mb-2">
                        Email *
                    </label>
                    <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-border-light bg-surface-light text-text-main outline-none focus:border-primary"
                        placeholder="Enter email"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-text-main mb-2">
                        Role
                    </label>
                    <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-border-light bg-surface-light text-text-main outline-none focus:border-primary"
                    >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-text-main mb-2">
                        Department
                    </label>
                    <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-border-light bg-surface-light text-text-main outline-none focus:border-primary"
                    >
                        <option value="CSE">Computer Science</option>
                        <option value="AIDS">AI & Data Science</option>
                        <option value="AIML">AI & Machine Learning</option>
                        <option value="ECE">Electronics</option>
                        <option value="MECH">Mechanical</option>
                        <option value="CIVIL">Civil</option>
                        <option value="EEE">Electrical</option>
                    </select>
                </div>
            </form>
        </div>
    );
};

export default AddMemberMobile;
