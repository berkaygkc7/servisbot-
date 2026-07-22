import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { X, Calendar as CalendarIcon, Trash2, Plus, Loader2 } from 'lucide-react';
import { type Driver } from './DriverList';
import { type DriverLeave } from './DriverLeaveCalendar';

interface DriverLeavesModalProps {
    isOpen: boolean;
    onClose: () => void;
    driver: Driver | null;
    leaves: DriverLeave[];
    onDeleteLeave: (id: string) => Promise<void>;
    onAddLeaveClick: (driver: Driver) => void;
}

const DriverLeavesModal: React.FC<DriverLeavesModalProps> = ({
    isOpen,
    onClose,
    driver,
    leaves,
    onDeleteLeave,
    onAddLeaveClick
}) => {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    if (!isOpen || !driver) return null;

    const driverLeaves = leaves.filter(l => l.driver_id === driver.id).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu izin kaydını silmek istediğinize emin misiniz?')) return;
        setDeletingId(id);
        try {
            await onDeleteLeave(id);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <CalendarIcon className="text-amber-500" />
                            {driver.full_name} - İzin Geçmişi
                        </h3>
                        <p className="text-sm font-medium text-slate-500 mt-1">Şoförün geçmiş ve gelecek tüm izin kayıtları.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto bg-slate-50/30">
                    <div className="flex justify-end mb-6">
                        <button
                            onClick={() => {
                                onClose();
                                onAddLeaveClick(driver);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-xl font-bold shadow-md hover:bg-blue-600 transition-colors"
                        >
                            <Plus size={18} strokeWidth={3} />
                            Manuel İzin Ekle
                        </button>
                    </div>

                    <div className="space-y-3">
                        {driverLeaves.length === 0 ? (
                            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
                                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <CalendarIcon size={24} />
                                </div>
                                <p className="text-slate-500 font-bold">Bu şoför için kayıtlı izin bulunamadı.</p>
                            </div>
                        ) : (
                            driverLeaves.map(leave => (
                                <div key={leave.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                                            <span className="font-bold text-slate-700">
                                                {format(parseISO(leave.start_date), 'd MMMM yyyy', { locale: tr })} - {format(parseISO(leave.end_date), 'd MMMM yyyy', { locale: tr })}
                                            </span>
                                        </div>
                                        {leave.reason && (
                                            <p className="text-sm text-slate-500 italic ml-4">"{leave.reason}"</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDelete(leave.id)}
                                        disabled={deletingId === leave.id}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-all disabled:opacity-50"
                                        title="İzni Sil"
                                    >
                                        {deletingId === leave.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverLeavesModal;
