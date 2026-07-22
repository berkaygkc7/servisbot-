import React from 'react';
import { Trash2, MessageSquare, CheckCircle, Clock, AlertCircle, Archive, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export interface Payment {
    id: string;
    invoice_no: string;
    student_id: string;
    month: string;
    amount: number;
    due_date: string;
    status: 'Bekliyor' | 'Ödendi' | 'Gecikti' | 'İptal';
    payment_method?: string;
    is_archived?: boolean;
    student?: {
        full_name: string;
        parent_name: string;
        parent_phone: string;
        school_level: string;
    };
}

interface PaymentListProps {
    payments: Payment[];
    selectedIds: string[];
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    onDelete: (payment: Payment) => void;
    onMarkAsPaid: (payment: Payment) => void;
    onRemind: (payment: Payment) => void;
}

const statusConfig = {
    'Ödendi': { icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    'Bekliyor': { icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    'Gecikti': { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
    'İptal': { icon: Trash2, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
};

const PaymentList: React.FC<PaymentListProps> = ({ payments, selectedIds, onToggleSelect, onToggleSelectAll, onDelete, onMarkAsPaid, onRemind }) => {
    const allSelected = payments.length > 0 && selectedIds.length === payments.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < payments.length;
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4 w-10">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        ref={input => { if (input) input.indeterminate = someSelected; }}
                                        onChange={onToggleSelectAll}
                                        className="w-4 h-4 text-secondary border-slate-300 rounded focus:ring-secondary/20 transition-all cursor-pointer"
                                    />
                                </div>
                            </th>
                            <th className="px-6 py-4">Fatura No / Ay</th>
                            <th className="px-6 py-4">Öğrenci & Veli</th>
                            <th className="px-6 py-4">Tutar</th>
                            <th className="px-6 py-4">Son Ödeme (Vade)</th>
                            <th className="px-6 py-4">Durum</th>
                            <th className="px-6 py-4 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {payments.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <AlertCircle size={32} className="text-slate-300" />
                                        </div>
                                        <p className="text-lg font-medium text-slate-700">Ödeme kaydı bulunamadı</p>
                                        <p className="text-sm">Bu kriterlere uygun bir fatura veya tahsilat işlemi yok.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            payments.map((payment) => {
                                const StatusIcon = statusConfig[payment.status]?.icon || Clock;
                                const isOverdue = payment.status === 'Bekliyor' && new Date(payment.due_date) < new Date();
                                const displayStatus = isOverdue ? 'Gecikti' : payment.status;
                                const config = statusConfig[displayStatus as keyof typeof statusConfig];

                                const isSelected = selectedIds.includes(payment.id);

                                return (
                                    <tr
                                        key={payment.id}
                                        className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => onToggleSelect(payment.id)}
                                                    className="w-4 h-4 text-secondary border-slate-300 rounded focus:ring-secondary/20 transition-all cursor-pointer"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{payment.month}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-1">#{payment.invoice_no}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{payment.student?.full_name || 'Bilinmiyor'}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                {payment.student?.parent_name || 'Veli Yok'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 text-base">{payment.amount.toLocaleString('tr-TR')} ₺</div>
                                            {payment.payment_method && (
                                                <div className="text-xs text-slate-500 mt-1">{payment.payment_method}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`font-medium ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                                                {format(new Date(payment.due_date), 'd MMM yyyy', { locale: tr })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.bg} ${config.color} ${config.border}`}>
                                                <StatusIcon size={14} />
                                                {displayStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                                                {/* Whatsapp Reminder */}
                                                {(displayStatus === 'Bekliyor' || displayStatus === 'Gecikti') && payment.student?.parent_phone && (
                                                    <button
                                                        onClick={() => onRemind(payment)}
                                                        className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100 shadow-sm"
                                                        title="WhatsApp'tan Hatırlat"
                                                    >
                                                        <MessageSquare size={16} />
                                                    </button>
                                                )}

                                                {/* Mark as Paid */}
                                                {(displayStatus === 'Bekliyor' || displayStatus === 'Gecikti') && (
                                                    <button
                                                        onClick={() => onMarkAsPaid(payment)}
                                                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100 shadow-sm"
                                                        title="Ödendi İşaretle"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                )}

                                                {/* Edit -> Removed since it was unused */}

                                                {/* Archive / Unarchive */}
                                                <button
                                                    onClick={() => onDelete(payment)}
                                                    className={`p-2 transition-colors rounded-lg ${payment.is_archived ? 'text-blue-500 hover:bg-blue-50' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                                    title={payment.is_archived ? "Arşivden Çıkar" : "Arşivle"}
                                                >
                                                    {payment.is_archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PaymentList;
