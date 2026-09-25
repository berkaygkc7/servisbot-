import React, { useState, useEffect } from 'react';
import { X, Download, Printer, CreditCard, CheckCircle, Bell, TrendingUp, Calendar, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

interface PaymentRecord {
    id: string;
    invoice_no: string;
    month: string;
    amount: number;
    due_date: string;
    status: string;
    payment_method: string | null;
    is_archived: boolean;
    created_at: string;
}

interface PaymentHistoryModalProps {
    studentId: string;
    studentName: string;
    isOpen: boolean;
    onClose: () => void;
}

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({ studentId, studentName, isOpen, onClose }) => {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && studentId) {
            fetchPaymentHistory();
        }
    }, [isOpen, studentId]);

    const fetchPaymentHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payments')
                .select('id, invoice_no, month, amount, due_date, status, payment_method, is_archived, created_at')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayments(data || []);
        } catch (err) {
            console.error('Ödeme geçmişi yüklenirken hata:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalPaid = payments.filter(p => p.status === 'Ödendi').reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPending = payments.filter(p => p.status === 'Bekliyor').reduce((sum, p) => sum + Number(p.amount), 0);
    const totalOverdue = payments.filter(p => {
        if (p.status === 'Ödendi') return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(p.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    }).reduce((sum, p) => sum + Number(p.amount), 0);

    const paidCount = payments.filter(p => p.status === 'Ödendi').length;
    const pendingCount = payments.filter(p => p.status !== 'Ödendi').length;

    const handleExportExcel = () => {
        const exportData = payments.map(p => ({
            'Ay': p.month,
            'Tutar (₺)': p.amount,
            'Son Ödeme Tarihi': formatDate(p.due_date),
            'Durum': p.status,
            'Ödeme Yöntemi': p.payment_method || '-',
            'Fatura No': p.invoice_no,
            'Kayıt Tarihi': formatDate(p.created_at)
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ödeme Geçmişi');
        XLSX.writeFile(wb, `${studentName.replace(/\s+/g, '_')}_odeme_gecmisi.xlsx`);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const rows = payments.map(p => `
            <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${p.month}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold">${Number(p.amount).toLocaleString('tr-TR')} ₺</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${formatDate(p.due_date)}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${p.payment_method || '-'}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">
                    <span style="padding:2px 8px;border-radius:12px;font-size:12px;font-weight:bold;${p.status === 'Ödendi' ? 'background:#dcfce7;color:#15803d' : 'background:#fef3c7;color:#d97706'}">${p.status}</span>
                </td>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b">${p.invoice_no}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <title>${studentName} - Ödeme Geçmişi</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; }
                    h1 { font-size: 22px; margin-bottom: 4px; }
                    .subtitle { color: #64748b; margin-bottom: 24px; font-size: 14px; }
                    table { width: 100%; border-collapse: collapse; }
                    th { text-align: left; padding: 10px 12px; background: #f1f5f9; font-size: 13px; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
                    .summary { display: flex; gap: 24px; margin-bottom: 24px; }
                    .summary-card { padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
                    .summary-card .label { font-size: 12px; color: #64748b; }
                    .summary-card .value { font-size: 20px; font-weight: 800; margin-top: 4px; }
                    .print-date { text-align: right; font-size: 12px; color: #94a3b8; margin-top: 24px; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <h1>📋 ${studentName} — Ödeme Geçmişi</h1>
                <p class="subtitle">Toplam ${payments.length} ödeme kaydı</p>
                <div class="summary">
                    <div class="summary-card">
                        <div class="label">Toplam Ödenen</div>
                        <div class="value" style="color:#15803d">${totalPaid.toLocaleString('tr-TR')} ₺</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">Bekleyen</div>
                        <div class="value" style="color:#d97706">${totalPending.toLocaleString('tr-TR')} ₺</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">Geciken</div>
                        <div class="value" style="color:#dc2626">${totalOverdue.toLocaleString('tr-TR')} ₺</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Ay</th>
                            <th style="text-align:right">Tutar</th>
                            <th>Son Ödeme</th>
                            <th>Yöntem</th>
                            <th>Durum</th>
                            <th>Fatura No</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <p class="print-date">Yazdırma tarihi: ${new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <script>window.print();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const getStatusBadge = (payment: PaymentRecord) => {
        const isOverdue = () => {
            if (payment.status === 'Ödendi') return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(payment.due_date);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate < today;
        };

        if (payment.status === 'Ödendi') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-200">
                    <CheckCircle size={12} />
                    Ödendi
                </span>
            );
        }
        if (isOverdue()) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold border border-red-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                    Gecikti
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold border border-amber-200">
                <Bell size={12} />
                Bekliyor
            </span>
        );
    };

    const getPaymentMethodIcon = (method: string | null) => {
        if (!method) return '-';
        if (method === 'Nakit') return '💵 Nakit';
        if (method.includes('Havale') || method.includes('EFT')) return '🏦 Havale/EFT';
        if (method.includes('Kredi')) return '💳 Kredi Kartı';
        return method;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 max-h-[90vh] flex flex-col">
                
                {/* Header */}
                <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-6 shrink-0">
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    </div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                <CreditCard size={22} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">Ödeme Geçmişi</h2>
                                <p className="text-sm text-slate-400 mt-0.5 font-medium">{studentName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportExcel}
                                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                                title="Excel'e Aktar"
                            >
                                <Download size={18} />
                            </button>
                            <button
                                onClick={handlePrint}
                                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                                title="Yazdır"
                            >
                                <Printer size={18} />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2.5 bg-white/10 hover:bg-red-500/80 text-white rounded-xl transition-all ml-1"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="px-8 py-5 bg-slate-50/80 border-b border-slate-100 shrink-0">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl p-4 border border-green-100 shadow-sm">
                            <div className="flex items-center gap-2 text-green-600 mb-1">
                                <CheckCircle size={14} />
                                <span className="text-xs font-bold uppercase tracking-wider">Toplam Ödenen</span>
                            </div>
                            <div className="text-2xl font-black text-green-700 tracking-tight">
                                {totalPaid.toLocaleString('tr-TR')} ₺
                            </div>
                            <div className="text-[11px] text-green-600/70 font-semibold mt-1">{paidCount} ödeme</div>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm">
                            <div className="flex items-center gap-2 text-amber-600 mb-1">
                                <Bell size={14} />
                                <span className="text-xs font-bold uppercase tracking-wider">Bekleyen</span>
                            </div>
                            <div className="text-2xl font-black text-amber-700 tracking-tight">
                                {totalPending.toLocaleString('tr-TR')} ₺
                            </div>
                            <div className="text-[11px] text-amber-600/70 font-semibold mt-1">{pendingCount} kayıt</div>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-sm">
                            <div className="flex items-center gap-2 text-red-600 mb-1">
                                <TrendingUp size={14} />
                                <span className="text-xs font-bold uppercase tracking-wider">Geciken</span>
                            </div>
                            <div className="text-2xl font-black text-red-700 tracking-tight">
                                {totalOverdue.toLocaleString('tr-TR')} ₺
                            </div>
                            <div className="text-[11px] text-red-600/70 font-semibold mt-1">vadesi geçmiş</div>
                        </div>
                    </div>
                </div>

                {/* Payment Table */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Loader2 size={32} className="animate-spin mb-3" />
                            <span className="text-sm font-medium">Ödeme kayıtları yükleniyor...</span>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <FileText size={48} className="mb-4 opacity-30" />
                            <p className="font-bold text-lg text-slate-500">Ödeme Kaydı Bulunamadı</p>
                            <p className="text-sm mt-1">Bu öğrenci için henüz ödeme kaydı oluşturulmamış.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Ay</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tutar</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Son Ödeme</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Yöntem</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fatura No</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payments.map((payment, index) => (
                                    <tr 
                                        key={payment.id} 
                                        className={`hover:bg-blue-50/40 transition-colors ${payment.status !== 'Ödendi' ? 'bg-amber-50/20' : ''}`}
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span className="font-bold text-slate-800 text-sm">{payment.month}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <span className="font-black text-slate-900 text-sm">
                                                {Number(payment.amount).toLocaleString('tr-TR')} ₺
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-sm text-slate-600 font-medium">
                                            {formatDate(payment.due_date)}
                                        </td>
                                        <td className="px-6 py-3.5 text-sm text-slate-600">
                                            <span className="font-medium">{getPaymentMethodIcon(payment.payment_method)}</span>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            {getStatusBadge(payment)}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                {payment.invoice_no}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                {!loading && payments.length > 0 && (
                    <div className="px-8 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between shrink-0">
                        <div className="text-xs text-slate-500 font-medium">
                            Toplam <span className="font-black text-slate-700">{payments.length}</span> ödeme kaydı
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExportExcel}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <Download size={14} />
                                Excel
                            </button>
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <Printer size={14} />
                                Yazdır
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentHistoryModal;
