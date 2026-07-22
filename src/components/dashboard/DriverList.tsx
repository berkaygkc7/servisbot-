import React from 'react';
import { Edit, Trash2, Phone, BadgeCheck, ShieldAlert, Calendar, CalendarClock } from 'lucide-react';

export interface Driver {
    id: string;
    full_name: string;
    phone: string;
    blood_group?: string;
    status: 'active' | 'inactive' | 'on_leave';
    avatar_url?: string;
    login_token?: string;
    next_leave?: string; // e.g. "12 Ekim - 14 Ekim (Yıllık İzin)"
}

interface DriverListProps {
    drivers: Driver[];
    onEdit: (driver: Driver) => void;
    onDelete: (id: string) => void;
    onViewLeaves: (driver: Driver) => void;
}

const DriverList: React.FC<DriverListProps> = ({ drivers, onEdit, onDelete, onViewLeaves }) => {
    if (drivers.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                Henüz şoför eklenmemiş veya arama kriterine uygun şoför yok.
            </div>
        );
    }

    const getStatusStyles = (status: Driver['status']) => {
        switch (status) {
            case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'inactive': return 'bg-slate-100 text-slate-600 border-slate-200';
            case 'on_leave': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getStatusText = (status: Driver['status']) => {
        switch (status) {
            case 'active': return 'Aktif';
            case 'inactive': return 'Pasif';
            case 'on_leave': return 'İzinli';
            default: return status;
        }
    };

    return (
        <div className="space-y-4">
            {drivers.map((driver, index) => (
                <div
                    key={driver.id}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all group animate-fade-up border-l-4"
                    style={{ 
                        animationDelay: `${index * 50}ms`,
                        borderLeftColor: driver.status === 'active' ? '#10b981' : driver.status === 'on_leave' ? '#f59e0b' : '#cbd5e1'
                    }}
                >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Avatar */}
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner border-2 border-white ring-2 ${driver.status === 'active' ? 'bg-emerald-50 text-emerald-600 ring-emerald-100' : driver.status === 'on_leave' ? 'bg-amber-50 text-amber-600 ring-amber-100' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
                                {driver.full_name.charAt(0)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors">{driver.full_name}</h3>
                                    {driver.status === 'active' ? (
                                        <BadgeCheck size={18} className="text-blue-500 flex-shrink-0" />
                                    ) : (
                                        <ShieldAlert size={18} className="text-slate-300 flex-shrink-0" />
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                        <Phone size={14} className="text-slate-400" />
                                        {driver.phone || 'Belirtilmemiş'}
                                    </div>
                                    {driver.blood_group && (
                                        <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                                            <span>{driver.blood_group}</span>
                                        </div>
                                    )}
                                </div>
                                {driver.next_leave && (
                                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-600 bg-amber-50/50 border border-amber-100/50 px-2.5 py-1.5 rounded-lg w-fit">
                                        <CalendarClock size={14} className="text-amber-500" />
                                        {driver.next_leave}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            <div className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm ${getStatusStyles(driver.status)}`}>
                                {getStatusText(driver.status)}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between opacity-70 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onViewLeaves(driver)}
                                className="flex items-center gap-2 px-4 py-2 hover:bg-amber-50 rounded-xl text-slate-500 hover:text-amber-600 font-bold text-xs transition-all border border-transparent hover:border-amber-100"
                            >
                                <Calendar size={16} strokeWidth={2.5} />
                                İzinleri Yönet
                            </button>
                            <button
                                onClick={() => onEdit(driver)}
                                className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 font-bold text-xs transition-all border border-transparent hover:border-slate-200"
                            >
                                <Edit size={16} strokeWidth={2.5} />
                                Düzenle
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                if (window.confirm(`${driver.full_name} isimli şoförü silmek istediğinize emin misiniz?`)) {
                                    onDelete(driver.id);
                                }
                            }}
                            className="p-2.5 bg-white hover:bg-red-50 hover:shadow-sm rounded-xl text-slate-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 border border-slate-100 hover:border-red-100"
                            title="Sil"
                        >
                            <Trash2 size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DriverList;
