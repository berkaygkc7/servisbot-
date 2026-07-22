import React, { useState } from 'react';
import { X, Users, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface BulkBillingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (month: string, dueDate: string) => Promise<void>;
}

const getNextMonths = () => {
    const months = [];
    const date = new Date();
    // Generate next 6 months for billing
    for (let i = 0; i < 6; i++) {
        months.push(format(date, 'MMMM yyyy', { locale: tr }));
        date.setMonth(date.getMonth() + 1);
    }
    return months;
};

const BulkBillingModal: React.FC<BulkBillingModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [selectedMonth, setSelectedMonth] = useState(getNextMonths()[0]);
    // Default due date: 5th of the selected month
    const [dueDate, setDueDate] = useState(() => {
        const d = new Date();
        d.setDate(5);
        return d.toISOString().split('T')[0];
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onConfirm(selectedMonth, dueDate);
            onClose();
        } catch (error) {
            console.error('Error in bulk billing:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Users size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Toplu Borçlandırma</h2>
                            <p className="text-sm text-slate-500">Tüm öğrencilere fatura oluştur</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                        disabled={isSubmitting}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">

                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 mb-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-amber-800">
                            <strong>Dikkat:</strong> Bu işlem, sistemdeki <strong className="font-bold">tüm aktif öğrencilere</strong> seçilen ay için "Bekliyor" statüsünde yeni bir borç (ödeme kaydı) oluşturacaktır. Tutar, öğrencinin özel fiyatından veya okul seviyesi fiyatından otomatik çekilir.
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Tahsilat Ayı</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-medium"
                                required
                            >
                                {getNextMonths().map(month => (
                                    <option key={month} value={month}>{month}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Son Ödeme Tarihi (Vade)</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-medium"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Faturalandırılıyor...</span>
                                </>
                            ) : (
                                <span>Toplu Borçlandır</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkBillingModal;
