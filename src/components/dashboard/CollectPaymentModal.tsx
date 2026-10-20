import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, 
    CreditCard, 
    Banknote, 
    Building, 
    CheckCircle2, 
    Calendar, 
    Loader2, 
    Check, 
    Search,
    MessageCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface StudentPaymentTarget {
    id: string;
    full_name: string;
    parent_name?: string;
    parent_phone?: string;
    school_name?: string;
    grade?: string;
    custom_price?: number | null;
    total_debt?: number | null;
    tags?: string[] | null;
    company_id?: string;
}

interface CollectPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student?: StudentPaymentTarget | null;
    onSuccess: () => void;
}

interface MonthItem {
    name: string; // e.g. "Ekim 2026"
    shortMonth: string; // e.g. "Ekim"
    year: number;
    monthIndex: number; // 0-11
    dueDate: string; // YYYY-MM-DD
    isPaid: boolean;
    paidAmount?: number;
    paidDate?: string | null;
    paidMethod?: string | null;
    existingPaymentId?: string;
    selected: boolean;
    amountToPay: number;
}

const MONTH_NAMES_ACADEMIC = [
    { name: 'Eylül', monthIndex: 8 },
    { name: 'Ekim', monthIndex: 9 },
    { name: 'Kasım', monthIndex: 10 },
    { name: 'Aralık', monthIndex: 11 },
    { name: 'Ocak', monthIndex: 0 },
    { name: 'Şubat', monthIndex: 1 },
    { name: 'Mart', monthIndex: 2 },
    { name: 'Nisan', monthIndex: 3 },
    { name: 'Mayıs', monthIndex: 4 },
    { name: 'Haziran', monthIndex: 5 },
];

export const getAcademicSeasonMonths = (): { name: string; shortMonth: string; year: number; monthIndex: number; dueDate: string }[] => {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11
    const currentYear = today.getFullYear();

    // If current month is Sep (8) to Dec (11), season started this year.
    // If Jan (0) to Aug (7), season started last year.
    const startYear = currentMonth >= 8 ? currentYear : currentYear - 1;
    const endYear = startYear + 1;

    return MONTH_NAMES_ACADEMIC.map(m => {
        const year = m.monthIndex >= 8 ? startYear : endYear;
        const monthNumStr = String(m.monthIndex + 1).padStart(2, '0');
        return {
            name: `${m.name} ${year}`,
            shortMonth: m.name,
            year,
            monthIndex: m.monthIndex,
            dueDate: `${year}-${monthNumStr}-05`
        };
    });
};

const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({ isOpen, onClose, student: initialStudent, onSuccess }) => {
    const { profile } = useAuth();

    // Student selection state (if no student provided as prop)
    const [selectedStudent, setSelectedStudent] = useState<StudentPaymentTarget | null>(initialStudent || null);
    const [allStudents, setAllStudents] = useState<StudentPaymentTarget[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [searchingStudents, setSearchingStudents] = useState(false);

    // Form state
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [monthItems, setMonthItems] = useState<MonthItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'Nakit' | 'İBAN' | 'Kredi Kartı' | 'Diğer'>('İBAN');
    const [customPaymentMethod, setCustomPaymentMethod] = useState('');
    const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [invoiceNo, setInvoiceNo] = useState('');
    const [sendWhatsApp, setSendWhatsApp] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync initial student
    useEffect(() => {
        if (initialStudent) {
            setSelectedStudent(initialStudent);
        } else {
            setSelectedStudent(null);
        }
    }, [initialStudent, isOpen]);

    // Fetch all students if modal opened without a preselected student
    useEffect(() => {
        if (!isOpen || initialStudent || !profile?.company_id) return;

        const fetchStudents = async () => {
            setSearchingStudents(true);
            try {
                const { data } = await supabase
                    .from('students')
                    .select('id, full_name, parent_name, parent_phone, custom_price, total_debt, tags, schools(name)')
                    .eq('company_id', profile.company_id)
                    .neq('status', 'pending')
                    .order('full_name');

                if (data) {
                    const formatted = data.map((s: any) => ({
                        id: s.id,
                        full_name: s.full_name,
                        parent_name: s.parent_name,
                        parent_phone: s.parent_phone,
                        school_name: s.schools?.name,
                        custom_price: s.custom_price,
                        total_debt: s.total_debt,
                        tags: s.tags,
                        company_id: profile.company_id
                    }));
                    setAllStudents(formatted);
                }
            } catch (err) {
                console.error('Error fetching students:', err);
            } finally {
                setSearchingStudents(false);
            }
        };

        fetchStudents();
    }, [isOpen, initialStudent, profile?.company_id]);

    // Load installment plan and payments for the selected student
    useEffect(() => {
        if (!isOpen || !selectedStudent?.id) {
            setMonthItems([]);
            return;
        }

        const loadStudentPlan = async () => {
            setLoadingPlan(true);
            try {
                // Fetch student details to get latest custom_price and total_debt
                const { data: stData } = await supabase
                    .from('students')
                    .select('id, full_name, parent_name, parent_phone, custom_price, total_debt, tags, schools(name)')
                    .eq('id', selectedStudent.id)
                    .single();

                const defaultMonthly = Number(stData?.custom_price) || Number(selectedStudent.custom_price) || 0;

                // Fetch existing payments
                const { data: payments } = await supabase
                    .from('payments')
                    .select('id, month, amount, status, due_date, payment_date, payment_method, is_archived')
                    .eq('student_id', selectedStudent.id);

                const seasonMonths = getAcademicSeasonMonths();

                let firstUnpaidFound = false;

                const mapped: MonthItem[] = seasonMonths.map(sm => {
                    // Match with DB payment (supports "Ekim 2026", "Ekim", etc.)
                    const existing = (payments || []).find(p => 
                        p.month === sm.name || 
                        p.month === sm.shortMonth ||
                        p.month?.startsWith(sm.shortMonth + ' ') ||
                        p.month?.toLowerCase()?.startsWith(sm.shortMonth.toLowerCase() + ' ')
                    );

                    const isPaid = existing?.status === 'Ödendi';
                    
                    // Auto-select the earliest unpaid month by default
                    let shouldSelect = false;
                    if (!isPaid && !firstUnpaidFound) {
                        shouldSelect = true;
                        firstUnpaidFound = true;
                    }

                    return {
                        name: sm.name,
                        shortMonth: sm.shortMonth,
                        year: sm.year,
                        monthIndex: sm.monthIndex,
                        dueDate: existing?.due_date ? existing.due_date.split('T')[0] : sm.dueDate,
                        isPaid,
                        paidAmount: isPaid ? Number(existing?.amount) : undefined,
                        paidDate: isPaid ? existing?.payment_date : undefined,
                        paidMethod: isPaid ? existing?.payment_method : undefined,
                        existingPaymentId: existing?.id,
                        selected: shouldSelect,
                        amountToPay: defaultMonthly
                    };
                });

                setMonthItems(mapped);

                // Auto generate invoice no
                const randomHex = Math.floor(1000 + Math.random() * 9000);
                const d = new Date();
                setInvoiceNo(`THS-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${randomHex}`);

            } catch (err) {
                console.error('Error loading student installment plan:', err);
            } finally {
                setLoadingPlan(false);
            }
        };

        loadStudentPlan();
    }, [isOpen, selectedStudent?.id]);

    // Filter students for search dropdown
    const filteredStudents = useMemo(() => {
        if (!studentSearch.trim()) return allStudents.slice(0, 10);
        const q = studentSearch.toLocaleLowerCase('tr-TR');
        return allStudents.filter(s => 
            s.full_name?.toLocaleLowerCase('tr-TR')?.includes(q) ||
            s.parent_name?.toLocaleLowerCase('tr-TR')?.includes(q) ||
            s.parent_phone?.includes(q)
        ).slice(0, 15);
    }, [allStudents, studentSearch]);

    // Calculate total amount to collect
    const totalAmountToCollect = useMemo(() => {
        return monthItems
            .filter(m => m.selected && !m.isPaid)
            .reduce((sum, m) => sum + (Number(m.amountToPay) || 0), 0);
    }, [monthItems]);

    const selectedMonthsCount = useMemo(() => {
        return monthItems.filter(m => m.selected && !m.isPaid).length;
    }, [monthItems]);

    // Handle single month checkbox toggle
    const handleToggleMonth = (index: number) => {
        setMonthItems(prev => {
            const copy = [...prev];
            copy[index].selected = !copy[index].selected;
            return copy;
        });
    };

    // Handle month amount change (allows partial or custom amount per month)
    const handleAmountChange = (index: number, val: string) => {
        const num = Number(val.replace(',', '.'));
        setMonthItems(prev => {
            const copy = [...prev];
            copy[index].amountToPay = isNaN(num) ? 0 : num;
            return copy;
        });
    };

    // Handle month due date change (allows user to change the small date under the month)
    const handleDueDateChange = (index: number, val: string) => {
        if (!val) return;
        setMonthItems(prev => {
            const copy = [...prev];
            copy[index].dueDate = val;
            return copy;
        });
    };

    // Select all unpaid months or unselect all
    const handleSelectAllUnpaid = (select: boolean) => {
        setMonthItems(prev => prev.map(m => m.isPaid ? m : { ...m, selected: select }));
    };

    // Quick presets
    const handleQuickSelectNextN = (count: number) => {
        let remaining = count;
        setMonthItems(prev => prev.map(m => {
            if (m.isPaid) return m;
            if (remaining > 0) {
                remaining--;
                return { ...m, selected: true };
            }
            return { ...m, selected: false };
        }));
    };

    // Submit handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !profile?.company_id) return;

        const monthsToPay = monthItems.filter(m => m.selected && !m.isPaid);
        if (monthsToPay.length === 0) {
            alert('Lütfen tahsilat yapılacak en az bir ay seçiniz.');
            return;
        }

        if (totalAmountToCollect <= 0) {
            alert('Lütfen geçerli bir tahsilat tutarı giriniz.');
            return;
        }

        setIsSubmitting(true);

        try {
            const effectivePaymentDate = paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString();
            const effectivePaymentMethod = paymentMethod === 'Diğer' 
                ? (customPaymentMethod.trim() || 'Diğer') 
                : paymentMethod;

            // 1. Process each selected month
            for (let i = 0; i < monthsToPay.length; i++) {
                const item = monthsToPay[i];
                const itemInvNo = monthsToPay.length > 1 ? `${invoiceNo}-${i + 1}` : invoiceNo;

                if (item.existingPaymentId) {
                    // Update existing pending payment to Paid
                    const { error: updateErr } = await supabase
                        .from('payments')
                        .update({
                            status: 'Ödendi',
                            amount: item.amountToPay,
                            due_date: item.dueDate,
                            payment_method: effectivePaymentMethod,
                            payment_date: effectivePaymentDate,
                            invoice_no: itemInvNo || undefined
                        })
                        .eq('id', item.existingPaymentId);

                    if (updateErr) throw updateErr;
                } else {
                    // Insert new payment row for this future/uncreated month
                    const { error: insertErr } = await supabase
                        .from('payments')
                        .insert([{
                            company_id: profile.company_id,
                            student_id: selectedStudent.id,
                            month: item.name,
                            amount: item.amountToPay,
                            due_date: item.dueDate,
                            status: 'Ödendi',
                            payment_method: effectivePaymentMethod,
                            payment_date: effectivePaymentDate,
                            invoice_no: itemInvNo
                        }]);

                    if (insertErr) throw insertErr;
                }
            }

            // 2. WhatsApp Notification if requested
            if (sendWhatsApp && selectedStudent.parent_phone) {
                const cleanPhone = selectedStudent.parent_phone.replace(/\D/g, '').slice(-10);
                if (cleanPhone.length === 10) {
                    const paidMonthNames = monthsToPay.map(m => m.shortMonth).join(', ');
                    const companyName = profile?.companies?.company_name || 'Öğrenci Servisi';
                    
                    // Approximate remaining debt
                    const currentDebt = Number(selectedStudent.total_debt) || 0;
                    const newDebt = Math.max(0, currentDebt - totalAmountToCollect);

                    const msg = `Sayın ${selectedStudent.parent_name || 'Velimiz'},\n\n` +
                        `Öğrencimiz *${selectedStudent.full_name}* için *${paidMonthNames}* ayı servis ücreti toplamı olan *${totalAmountToCollect.toLocaleString('tr-TR')} ₺* tahsil edilmiştir.\n\n` +
                        `💳 Ödeme Yöntemi: ${effectivePaymentMethod}\n` +
                        `📅 Ödeme Tarihi: ${new Date(effectivePaymentDate).toLocaleDateString('tr-TR')}\n` +
                        `💰 Kalan Sezonluk Borç: ${newDebt.toLocaleString('tr-TR')} ₺\n\n` +
                        `Ödemeniz için teşekkür eder, iyi günler dileriz.\n*${companyName}*`;

                    window.open(`https://wa.me/90${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                }
            }

            onSuccess();
            onClose();

        } catch (error: any) {
            console.error('Error processing multi-month collection:', error);
            alert(`Tahsilat kaydedilirken bir hata oluştu: ${error.message || 'Bilinmeyen Hata'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner shrink-0">
                            <CreditCard className="text-white" size={24} />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200 block">
                                Hızlı & Çoklu Ay Tahsilatı
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                                Ödeme / Tahsilat Girişi
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors relative z-10"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm text-slate-700 flex-1 custom-scrollbar">

                    {/* Step 1: Student Selection (if not preselected) */}
                    {!initialStudent && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">
                                Öğrenci Seçin:
                            </label>
                            {selectedStudent ? (
                                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                                            {selectedStudent.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <strong className="text-slate-900 block text-sm font-bold">{selectedStudent.full_name}</strong>
                                            <span className="text-xs text-slate-500">
                                                Veli: {selectedStudent.parent_name || '-'} ({selectedStudent.parent_phone || '-'})
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline px-2 py-1"
                                    >
                                        Değiştir
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                                        <input
                                            type="text"
                                            value={studentSearch}
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                            placeholder="Öğrenci veya veli adı ile ara..."
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-44 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50 bg-slate-50/50">
                                        {searchingStudents ? (
                                            <div className="p-4 text-center text-xs text-slate-400">Öğrenciler yükleniyor...</div>
                                        ) : filteredStudents.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-slate-400">Eşleşen öğrenci bulunamadı.</div>
                                        ) : (
                                            filteredStudents.map(s => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => setSelectedStudent(s)}
                                                    className="w-full text-left p-2.5 hover:bg-emerald-50/70 transition-colors flex items-center justify-between text-xs"
                                                >
                                                    <div>
                                                        <span className="font-bold text-slate-800 block">{s.full_name}</span>
                                                        <span className="text-slate-400 text-[11px]">{s.school_name || 'Okul atanmadı'} | Veli: {s.parent_name || '-'}</span>
                                                    </div>
                                                    <span className="text-emerald-700 font-bold bg-white px-2 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                                                        Seç
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Student Info Summary Card */}
                    {selectedStudent && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
                            <div>
                                <span className="text-slate-400 font-medium block">Öğrenci Adı</span>
                                <strong className="text-slate-900 block truncate mt-0.5">{selectedStudent.full_name}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400 font-medium block">Veli Bilgisi</span>
                                <span className="text-slate-700 font-semibold block truncate mt-0.5">
                                    {selectedStudent.parent_name || '-'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 font-medium block">Aylık Servis Ücreti</span>
                                <span className="font-bold text-slate-800 block mt-0.5">
                                    {selectedStudent.custom_price ? `${Number(selectedStudent.custom_price).toLocaleString('tr-TR')} ₺` : 'Belirlenmedi'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 font-medium block">Kalan Toplam Borç</span>
                                <span className="font-black text-emerald-700 block mt-0.5 text-sm">
                                    {selectedStudent.total_debt !== undefined && selectedStudent.total_debt !== null
                                        ? `${Number(selectedStudent.total_debt).toLocaleString('tr-TR')} ₺`
                                        : '-'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Installment Plan & Month Selection */}
                    {selectedStudent && (
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                        <Calendar size={16} className="text-emerald-600" />
                                        Sezon Taksitleri (Hangi Aylar Ödenecek?)
                                    </h4>
                                    <p className="text-[11px] text-slate-400">
                                        Veli birden fazla ay ödediyse (örn: Ekim + Kasım) kutucukları işaretleyin.
                                    </p>
                                </div>

                                {/* Quick selection chips */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => handleQuickSelectNextN(1)}
                                        className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                                    >
                                        1 Ay
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleQuickSelectNextN(2)}
                                        className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors"
                                    >
                                        2 Ay (Peşin)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleQuickSelectNextN(3)}
                                        className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                                    >
                                        3 Ay
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectAllUnpaid(true)}
                                        className="text-[11px] font-bold px-2.5 py-1 text-blue-600 hover:underline"
                                    >
                                        Tümünü Seç
                                    </button>
                                </div>
                            </div>

                            {loadingPlan ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    <Loader2 className="animate-spin w-6 h-6 mx-auto mb-2 text-emerald-600" />
                                    Taksit planı yükleniyor...
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                    {monthItems.map((m, idx) => (
                                        <div
                                            key={m.name}
                                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                                                m.isPaid
                                                    ? 'bg-slate-50/80 border-slate-200/60 opacity-60 cursor-not-allowed'
                                                    : m.selected
                                                        ? 'bg-emerald-50/80 border-emerald-400 shadow-sm ring-1 ring-emerald-400'
                                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div 
                                                className={`flex items-center gap-2.5 flex-1 ${m.isPaid ? '' : 'cursor-pointer'}`}
                                                onClick={() => !m.isPaid && handleToggleMonth(idx)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={m.isPaid || m.selected}
                                                    disabled={m.isPaid}
                                                    readOnly
                                                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                                                />
                                                <div>
                                                    <span className={`font-bold text-xs block ${m.selected ? 'text-emerald-950' : 'text-slate-800'}`}>
                                                        {m.name}
                                                    </span>
                                                    {m.isPaid ? (
                                                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                            <CheckCircle2 size={11} /> Ödendi ({m.paidAmount?.toLocaleString('tr-TR')} ₺)
                                                        </span>
                                                    ) : (
                                                        <div 
                                                            className="flex items-center gap-1 mt-0.5" 
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <span className="text-[10px] text-slate-400 font-medium">Vade:</span>
                                                            <input
                                                                type="date"
                                                                value={m.dueDate}
                                                                onChange={(e) => handleDueDateChange(idx, e.target.value)}
                                                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                                                    m.selected
                                                                        ? 'border-emerald-300 bg-white text-emerald-950 focus:ring-1 focus:ring-emerald-500 shadow-2xs'
                                                                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 focus:bg-white'
                                                                }`}
                                                                title="Vade tarihini elle değiştirebilirsiniz (değiştirmedikleriniz aynı kalır)"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {!m.isPaid && (
                                                <div className="flex items-center gap-1 ml-2">
                                                    <input
                                                        type="number"
                                                        value={m.amountToPay || ''}
                                                        onChange={(e) => handleAmountChange(idx, e.target.value)}
                                                        disabled={!m.selected}
                                                        className={`w-20 px-2 py-1 text-right text-xs font-bold rounded-lg border transition-all ${
                                                            m.selected
                                                                ? 'border-emerald-300 bg-white text-emerald-950 focus:ring-2 focus:ring-emerald-500'
                                                                : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                                        }`}
                                                        placeholder="0"
                                                    />
                                                    <span className="text-xs font-bold text-slate-400">₺</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Total Calculation Banner */}
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold text-emerald-800 block">
                                        Tahsil Edilecek Toplam Tutar ({selectedMonthsCount} Ay Seçili):
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                        {selectedMonthsCount === 0 
                                            ? 'Lütfen yukarıdan en az 1 ay seçiniz' 
                                            : monthItems.filter(m => m.selected && !m.isPaid).map(m => m.shortMonth).join(' + ')}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-emerald-700 tracking-tight">
                                        {totalAmountToCollect.toLocaleString('tr-TR')} ₺
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Payment Details */}
                    {selectedStudent && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
                            {/* Payment Method */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                    Ödeme Yöntemi / Kasa
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['İBAN', 'Nakit', 'Kredi Kartı', 'Diğer'] as const).map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => {
                                                setPaymentMethod(method);
                                                if (method !== 'Diğer') setCustomPaymentMethod('');
                                            }}
                                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                paymentMethod === method
                                                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            {method === 'Nakit' && <Banknote size={14} />}
                                            {method === 'İBAN' && <Building size={14} />}
                                            {method === 'Kredi Kartı' && <CreditCard size={14} />}
                                            {method}
                                        </button>
                                    ))}
                                </div>
                                {paymentMethod === 'Diğer' && (
                                    <input
                                        type="text"
                                        value={customPaymentMethod}
                                        onChange={(e) => setCustomPaymentMethod(e.target.value)}
                                        placeholder="Ödeme yöntemini belirtin (Örn: Çek, Elden)..."
                                        autoFocus
                                        className="w-full mt-2 px-3 py-2 rounded-xl border border-emerald-400 bg-emerald-50/20 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                )}
                            </div>

                            {/* Payment Date */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                    Tahsilat Tarihi
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="date"
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Receipt / Invoice No */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Makbuz / İşlem No (Opsiyonel)
                                </label>
                                <input
                                    type="text"
                                    value={invoiceNo}
                                    onChange={(e) => setInvoiceNo(e.target.value)}
                                    placeholder="Örn: THS-1026-4421"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* WhatsApp Notification Toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                        <MessageCircle size={17} />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-800 block">WhatsApp Dekontu</span>
                                        <span className="text-[10px] text-slate-400 block">Veliye anında bilgi mesajı aç</span>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={sendWhatsApp}
                                    onChange={(e) => setSendWhatsApp(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                        Vazgeç
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedStudent || selectedMonthsCount === 0 || totalAmountToCollect <= 0}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                Tahsilat İşleniyor...
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                {selectedMonthsCount > 1 
                                    ? `${selectedMonthsCount} Ayı Birden Tahsil Et (${totalAmountToCollect.toLocaleString('tr-TR')} ₺)`
                                    : `Tahsilatı Kaydet (${totalAmountToCollect.toLocaleString('tr-TR')} ₺)`}
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CollectPaymentModal;
