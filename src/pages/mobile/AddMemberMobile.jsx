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
        <div className="min-h-screen bg-bg-light pb-20">

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
                        <option value="CSE">CSE</option>
                        <option value="AIDS">AIDS</option>
                        <option value="AIML">AIML</option>
                        <option value="ECE">ECE</option>
                        <option value="EEE">EEE</option>
                        <option value="MECH">MECH</option>
                        <option value="CIVIL">CIVIL</option>
                    </select>
                </div>
                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={18} />}
                        <span>Finalize & Add Member</span>
                    </button>
                    <p className="text-[10px] text-center text-text-muted font-bold uppercase tracking-widest mt-6">
                        Fields marked with * are strictly mandatory
                    </p>
                </div>
            </form>
        </div>
    );
};

export default AddMemberMobile;
