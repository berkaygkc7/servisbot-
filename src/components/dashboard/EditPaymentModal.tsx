import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { type Payment } from './PaymentList';

interface EditPaymentModalProps {
    isOpen: boolean;
    payment: Payment | null;
    onClose: () => void;
    onSave: (paymentId: string, updates: Partial<Payment>) => Promise<void>;
}

const MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const EditPaymentModal: React.FC<EditPaymentModalProps> = ({ isOpen, payment, onClose, onSave }) => {
    const [amount, setAmount] = useState<string>('');
    const [month, setMonth] = useState<string>('');
    const [invoiceNo, setInvoiceNo] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>('');
    const [status, setStatus] = useState<Payment['status']>('Bekliyor');
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (payment) {
            setAmount(payment.amount.toString());
            setMonth(payment.month || '');
            setInvoiceNo(payment.invoice_no || '');
            setDueDate(payment.due_date ? payment.due_date.split('T')[0] : '');
            setStatus(payment.status);
            setPaymentMethod(payment.payment_method || '');
        }
    }, [payment]);

    if (!isOpen || !payment) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await onSave(payment.id, {
                amount: Number(amount),
                month,
                invoice_no: invoiceNo,
                due_date: dueDate,
                status,
                payment_method: paymentMethod
            });
            onClose();
        } catch (error) {
            console.error('Save error', error);
            alert('Kaydedilirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-black text-slate-800">Ödeme Kaydını Düzenle</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Öğrenci</label>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-medium">
                            {payment.student?.full_name || 'Bilinmiyor'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Tutar (₺)</label>
                            <input
                                type="number"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Ay</label>
                            <select
                                required
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Seçiniz</option>
                                {MONTHS.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Fatura No</label>
                            <input
                                type="text"
                                value={invoiceNo}
                                onChange={(e) => setInvoiceNo(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Son Ödeme Tarihi</label>
                            <input
                                type="date"
                                required
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Durum</label>
                            <select
                                required
                                value={status}
                                onChange={(e) => setStatus(e.target.value as Payment['status'])}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="Bekliyor">Bekliyor</option>
                                <option value="Ödendi">Ödendi</option>
                                <option value="İptal">İptal</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Ödeme Yöntemi / Not</label>
                            <input
                                type="text"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                placeholder="Nakit, Kredi Kartı vb."
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                        >
                            {loading ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPaymentModal;
