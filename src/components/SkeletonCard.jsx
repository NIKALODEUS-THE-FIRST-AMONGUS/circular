import { motion } from 'framer-motion';

const SkeletonCard = () => {
    return (
        <div className="bg-white rounded-[32px] border border-[#dadce0] p-6 space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                    <div className="space-y-2">
                        <div className="w-24 h-3 bg-slate-100 rounded-full" />
                        <div className="w-16 h-2 bg-slate-50 rounded-full" />
                    </div>
                </div>
                <div className="w-20 h-6 bg-slate-100 rounded-full" />
            </div>

            <div className="space-y-3 pt-4">
                <div className="w-3/4 h-6 bg-slate-100 rounded-lg" />
                <div className="space-y-2">
                    <div className="w-full h-3 bg-slate-50 rounded-full" />
                    <div className="w-full h-3 bg-slate-50 rounded-full" />
                    <div className="w-2/3 h-3 bg-slate-50 rounded-full" />
                </div>
            </div>

            <div className="pt-6 flex items-center justify-between border-t border-slate-50">
                <div className="w-32 h-4 bg-slate-50 rounded-full" />
                <div className="w-8 h-8 bg-slate-100 rounded-full" />
            </div>
        </div>
    );
};

export default SkeletonCard;
