import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendUp?: boolean;
    color?: string;
    iconColor?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    icon: Icon,
    trend,
    trendUp = true,
    color = "bg-blue-50",
    iconColor = "text-blue-500"
}) => {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-800">{value}</h3>

                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                            <span>{trendUp ? '+' : '-'}{trend}</span>
                            <span className="text-slate-400">geçen aya göre</span>
                        </div>
                    )}
                </div>

                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon size={24} className={iconColor} />
                </div>
            </div>
        </div>
    );
};

export default StatsCard;
