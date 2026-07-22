import React, { useState } from 'react';
import { X, Calendar, User, AlignLeft, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { type Driver } from './DriverList';

interface LeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date | null;
    drivers: Driver[];
    onSave: (data: { driver_id: string; start_date: string; end_date: string; reason: string }) => Promise<void>;
    existingLeaves?: any[];
    onDelete?: (id: string) => Promise<void>;
}

const LeaveModal: React.FC<LeaveModalProps> = ({
    isOpen,
    onClose,
    selectedDate,
    drivers,
    onSave,
    existingLeaves = [],
    onDelete
}) => {
    const [driverId, setDriverId] = useState('');
    const [driverSearchName, setDriverSearchName] = useState('');
    const [startDate, setStartDate] = useState(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
    const [endDate, setEndDate] = useState(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!driverId) {
            alert('Lütfen listeden geçerli bir şoför seçin.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave({
                driver_id: driverId,
                start_date: startDate,
                end_date: endDate,
                reason
            });
            onClose();
            // Reset form
            setDriverId('');
            setDriverSearchName('');
            setReason('');
        } catch (error) {
            console.error('Error saving leave:', error);
            alert('İzin kaydedilirken bir hata oluştu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">İzin Yönetimi</h3>
                        <p className="text-sm text-slate-500">
                            {selectedDate && format(selectedDate, 'd MMMM yyyy', { locale: tr })} için izin işlemleri
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-100 transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Add Leave Form */}
                        <div>
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                                Yeni İzin Ekle
                            </h4>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                        <User size={14} className="text-slate-400" />
                                        Şoför Seçin
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        list="driver-list"
                                        placeholder="Şoför adı ara veya seçin..."
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                        value={driverSearchName}
                                        onChange={e => {
                                            setDriverSearchName(e.target.value);
                                            const selectedDriver = drivers.find(d => d.full_name === e.target.value);
                                            if (selectedDriver) setDriverId(selectedDriver.id);
                                            else setDriverId('');
                                        }}
                                    />
                                    <datalist id="driver-list">
                                        {drivers.map(driver => (
                                            <option key={driver.id} value={driver.full_name} />
                                        ))}
                                    </datalist>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            Başlangıç
                                        </label>
                                        <input
                                            required
                                            type="date"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            Bitiş
                                        </label>
                                        <input
                                            required
                                            type="date"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                        <AlignLeft size={14} className="text-slate-400" />
                                        Açıklama (Opsiyonel)
                                    </label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all resize-none"
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        placeholder="İzin nedeni..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-secondary text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
                                    İzni Kaydet
                                </button>
                            </form>
                        </div>

                        {/* Existing Leaves List */}
                        <div className="border-l border-slate-100 pl-8">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                                Kayıtlı İzinler
                            </h4>

                            <div className="space-y-3">
                                {existingLeaves.length === 0 ? (
                                    <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-xs text-slate-400 font-medium">Bu tarihte kayıtlı izin bulunamadı.</p>
                                    </div>
                                ) : (
                                    existingLeaves.map(leave => (
                                        <div key={leave.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm">{leave.driver_name}</div>
                                                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                                        {format(parseISO(leave.start_date), 'd MMM')} - {format(parseISO(leave.end_date), 'd MMM yyyy')}
                                                    </div>
                                                </div>
                                                {onDelete && (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('Bu izin kaydını silmek istediğinize emin misiniz?')) {
                                                                onDelete(leave.id);
                                                            }
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-all"
                                                        title="İzni Sil"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            {leave.reason && (
                                                <div className="mt-2 pt-2 border-t border-slate-50 text-[11px] text-slate-600 italic">
                                                    "{leave.reason}"
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper for parseISO if not globally available
function parseISO(isoString: string) {
    return new Date(isoString);
}

export default LeaveModal;
