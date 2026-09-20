import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, X, Wrench, Fuel, Users, Wallet, MoreHorizontal,
    Check, Trash2, Edit2, Loader2, AlertCircle, TrendingUp, TrendingDown, Map,
    Plus, Building2, Phone, ChevronDown, Calendar, Filter, UserCircle, Eye
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ============ INTERFACES ============

export interface Account {
    id: string;
    company_id: string;
    name: string;
    type: 'supplier' | 'customer' | 'other';
    phone?: string;
    note?: string;
    created_at: string;
}

export interface FinancialRecord {
    id: string;
    type: 'income' | 'expense';
    source: 'expense' | 'income' | 'payment';
    category: string;
    title: string;
    date: string;
    amount: number;
    description: string;
    status: 'upcoming' | 'paid' | 'cancelled';
    created_at: string;
    vehicle_id?: string | null;
    vehicle_plate?: string;
    student_name?: string;
    kilometer?: number | null;
    account_id?: string | null;
    account_name?: string;
}

// ============ CATEGORIES ============

export const EXPENSE_CATEGORIES = [
    { id: 'Araç Bakım', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'Yakıt', icon: Fuel, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'Gezi / Ekstra İş', icon: Map, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'Maaş', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'Vergi/Sigorta', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'Diğer', icon: MoreHorizontal, color: 'text-slate-600', bg: 'bg-slate-50' }
];

export const INCOME_CATEGORIES = [
    { id: 'Öğrenci Ödemesi', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'Sponsorluk', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'Devlet Desteği', icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'Diğer', icon: MoreHorizontal, color: 'text-slate-600', bg: 'bg-slate-50' }
];

const ACCOUNT_TYPES: { id: string; label: string; color: string; bg: string }[] = [
    { id: 'supplier', label: 'Tedarikçi', color: 'text-orange-700', bg: 'bg-orange-50' },
    { id: 'customer', label: 'Müşteri', color: 'text-blue-700', bg: 'bg-blue-50' },
    { id: 'other', label: 'Diğer', color: 'text-slate-700', bg: 'bg-slate-50' }
];

// ============ MAIN COMPONENT ============

const Expenses: React.FC = () => {
    const { profile, loading: authLoading } = useAuth();
    const [records, setRecords] = useState<FinancialRecord[]>([]);
    const [vehicles, setVehicles] = useState<{ id: string, plate_number: string }[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Page Tab: 'finance' or 'accounts'
    const [pageTab, setPageTab] = useState<'finance' | 'accounts'>('finance');
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [statusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    
    // Modal State (Income/Expense)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'expense' | 'income'>('expense');
    const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
    const [formData, setFormData] = useState<Partial<FinancialRecord>>({
        category: 'Araç Bakım',
        status: 'upcoming',
        date: new Date().toISOString().split('T')[0],
        kilometer: undefined
    });
    const [isCariTransaction, setIsCariTransaction] = useState(false);
    
    const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
    const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

    // Account Modal State
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [accountFormData, setAccountFormData] = useState<Partial<Account>>({
        name: '',
        type: 'supplier',
        phone: '',
        note: ''
    });
    const [accountsSearchTerm, setAccountsSearchTerm] = useState('');

    // Account Detail Modal State
    const [isAccountDetailOpen, setIsAccountDetailOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

    // ============ DATA FETCHING ============

    useEffect(() => {
        if (authLoading) return;

        if (profile?.company_id) {
            fetchAllData();
            fetchVehicles();
            fetchAccounts();
        } else {
            setLoading(false);
        }

        const channelExpenses = supabase
            .channel('public:expenses')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchAllData)
            .subscribe();
            
        const channelIncomes = supabase
            .channel('public:incomes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'incomes' }, fetchAllData)
            .subscribe();
            
        const channelPayments = supabase
            .channel('public:payments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchAllData)
            .subscribe();

        const channelAccounts = supabase
            .channel('public:accounts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, fetchAccounts)
            .subscribe();

        return () => {
            supabase.removeChannel(channelExpenses);
            supabase.removeChannel(channelIncomes);
            supabase.removeChannel(channelPayments);
            supabase.removeChannel(channelAccounts);
        };
    }, [profile?.company_id, authLoading]);

    const fetchVehicles = async () => {
        if (!profile?.company_id) return;
        const { data } = await supabase.from('vehicles').select('id, plate_number').eq('company_id', profile.company_id).order('plate_number');
        if (data) setVehicles(data);
    };

    const fetchAccounts = async () => {
        if (!profile?.company_id) return;
        const { data } = await supabase.from('accounts').select('*').eq('company_id', profile.company_id).order('name');
        if (data) setAccounts(data);
    };

    const fetchAllData = async () => {
        if (!profile?.company_id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Fetch Expenses with account join
            const { data: expensesData, error: expensesError } = await supabase
                .from('expenses')
                .select(`*, vehicles(plate_number), accounts(name)`)
                .eq('company_id', profile.company_id);

            if (expensesError) throw expensesError;

            // Fetch Incomes with account join
            const { data: incomesData } = await supabase
                .from('incomes')
                .select(`*, accounts(name)`)
                .eq('company_id', profile.company_id);

            // Fetch Payments (Students)
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('payments')
                .select(`*, students(full_name)`)
                .eq('company_id', profile.company_id)
                .in('status', ['Ödendi', 'Kısmi Ödeme']);

            let combined: FinancialRecord[] = [];

            if (expensesData) {
                combined = combined.concat(expensesData.map(e => ({
                    id: e.id,
                    type: 'expense',
                    source: 'expense',
                    category: e.expense_category,
                    title: e.title,
                    date: e.expense_date,
                    amount: Number(e.amount),
                    description: e.description,
                    status: e.status,
                    created_at: e.created_at,
                    vehicle_id: e.vehicle_id,
                    vehicle_plate: e.vehicles?.plate_number,
                    kilometer: e.kilometer,
                    account_id: e.account_id,
                    account_name: e.accounts?.name
                })));
            }

            if (incomesData) {
                combined = combined.concat(incomesData.map(i => ({
                    id: i.id,
                    type: 'income',
                    source: 'income',
                    category: i.income_category,
                    title: i.title,
                    date: i.income_date,
                    amount: Number(i.amount),
                    description: i.description,
                    status: i.status || 'paid',
                    created_at: i.created_at,
                    account_id: i.account_id,
                    account_name: i.accounts?.name
                })));
            }
            
            if (paymentsData && !paymentsError) {
                combined = combined.concat(paymentsData.map(p => ({
                    id: p.id,
                    type: 'income',
                    source: 'payment',
                    category: 'Öğrenci Ödemesi',
                    title: `Taksit Ödemesi (${p.month || ''})`,
                    date: p.payment_date || p.created_at.substring(0, 10),
                    amount: Number(p.amount),
                    description: p.notes || '',
                    status: 'paid',
                    created_at: p.created_at,
                    student_name: p.students?.full_name
                })));
            }

            // Sort by date descending
            combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setRecords(combined);
        } catch (err) {
            console.error('Error fetching financial data:', err);
        } finally {
            setLoading(false);
        }
    };

    // ============ INCOME / EXPENSE HANDLERS ============

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (modalType === 'expense') {
                const payload = {
                    company_id: profile?.company_id,
                    expense_category: formData.category,
                    vehicle_id: ['Araç Bakım', 'Yakıt', 'Gezi / Ekstra İş'].includes(formData.category || '') ? (formData.vehicle_id || null) : null,
                    title: formData.title,
                    expense_date: formData.date,
                    amount: formData.amount,
                    description: formData.description,
                    status: formData.status,
                    kilometer: formData.category === 'Yakıt' || formData.category === 'Gezi / Ekstra İş' ? (formData.kilometer || null) : null,
                    account_id: isCariTransaction ? (formData.account_id || null) : null
                };

                if (editingRecord && editingRecord.source === 'expense') {
                    await supabase.from('expenses').update(payload).eq('id', editingRecord.id);
                } else {
                    await supabase.from('expenses').insert([payload]);
                }
            } else {
                const payload = {
                    company_id: profile?.company_id,
                    income_category: formData.category,
                    title: formData.title,
                    income_date: formData.date,
                    amount: formData.amount,
                    description: formData.description,
                    status: formData.status,
                    account_id: isCariTransaction ? (formData.account_id || null) : null
                };

                if (editingRecord && editingRecord.source === 'income') {
                    await supabase.from('incomes').update(payload).eq('id', editingRecord.id);
                } else {
                    await supabase.from('incomes').insert([payload]);
                }
            }

            setIsModalOpen(false);
            setEditingRecord(null);
            setIsCariTransaction(false);
            fetchAllData();
        } catch (err) {
            console.error('Error saving record:', err);
            alert('İşlem sırasında bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (record: FinancialRecord) => {
        try {
            if (record.source === 'expense') {
                await supabase.from('expenses').update({ status: 'paid' }).eq('id', record.id);
            } else if (record.source === 'income') {
                await supabase.from('incomes').update({ status: 'paid' }).eq('id', record.id);
            }
            fetchAllData();
        } catch (err) {
            console.error('Error completing record:', err);
        }
    };

    const handleDelete = async (record: FinancialRecord) => {
        if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;

        try {
            if (record.source === 'expense') {
                await supabase.from('expenses').delete().eq('id', record.id);
            } else if (record.source === 'income') {
                await supabase.from('incomes').delete().eq('id', record.id);
            } else {
                alert("Öğrenci ödemeleri sadece 'Ödemeler' menüsünden silinebilir.");
                return;
            }
            fetchAllData();
        } catch (err) {
            console.error('Error deleting record:', err);
        }
    };

    const openModal = (type: 'income' | 'expense', record?: FinancialRecord) => {
        setModalType(type);
        setEditingRecord(record || null);
        if (record) {
            setFormData({
                category: record.category,
                status: record.status,
                date: record.date,
                title: record.title,
                amount: record.amount,
                description: record.description,
                vehicle_id: record.vehicle_id,
                kilometer: record.kilometer,
                account_id: record.account_id
            });
            setIsCariTransaction(!!record.account_id);
        } else {
            setFormData({
                category: type === 'expense' ? 'Araç Bakım' : 'Diğer',
                status: 'upcoming',
                date: new Date().toISOString().split('T')[0]
            });
            setIsCariTransaction(false);
        }
        setIsModalOpen(true);
    };

    // ============ ACCOUNT HANDLERS ============

    const openAccountModal = (account?: Account) => {
        setEditingAccount(account || null);
        if (account) {
            setAccountFormData({
                name: account.name,
                type: account.type,
                phone: account.phone || '',
                note: account.note || ''
            });
        } else {
            setAccountFormData({ name: '', type: 'supplier', phone: '', note: '' });
        }
        setIsAccountModalOpen(true);
    };

    const handleAccountSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                company_id: profile?.company_id,
                name: accountFormData.name,
                type: accountFormData.type,
                phone: accountFormData.phone || null,
                note: accountFormData.note || null
            };

            if (editingAccount) {
                await supabase.from('accounts').update(payload).eq('id', editingAccount.id);
            } else {
                await supabase.from('accounts').insert([payload]);
            }
            setIsAccountModalOpen(false);
            setEditingAccount(null);
            fetchAccounts();
        } catch (err) {
            console.error('Error saving account:', err);
            alert('Cari kaydedilirken bir hata oluştu.');
        }
    };

    const handleDeleteAccount = async (account: Account) => {
        if (!window.confirm(`"${account.name}" carisini silmek istediğinize emin misiniz? İlişkili işlemlerdeki cari bağlantısı kaldırılacaktır.`)) return;
        try {
            await supabase.from('accounts').delete().eq('id', account.id);
            fetchAccounts();
        } catch (err) {
            console.error('Error deleting account:', err);
        }
    };

    const openAccountDetail = (account: Account) => {
        setSelectedAccount(account);
        setIsAccountDetailOpen(true);
    };

    // ============ FILTERING ============

    const filteredRecords = records.filter(record => {
        const matchesSearch =
            (record.vehicle_plate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (record.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (record.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (record.account_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || record.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || record.category === categoryFilter;
        
        // Date range filter
        let matchesDateRange = true;
        if (dateFrom) {
            matchesDateRange = matchesDateRange && record.date >= dateFrom;
        }
        if (dateTo) {
            matchesDateRange = matchesDateRange && record.date <= dateTo;
        }
        
        return matchesSearch && matchesType && matchesStatus && matchesCategory && matchesDateRange;
    });

    const filteredAccounts = accounts.filter(a =>
        a.name.toLowerCase().includes(accountsSearchTerm.toLowerCase()) ||
        (a.phone || '').includes(accountsSearchTerm)
    );

    // Account-related records for detail modal
    const accountRecords = useMemo(() => {
        if (!selectedAccount) return [];
        return records.filter(r => r.account_id === selectedAccount.id);
    }, [selectedAccount, records]);

    const accountSummary = useMemo(() => {
        let totalIncome = 0;
        let totalExpense = 0;
        accountRecords.forEach(r => {
            if (r.status === 'cancelled') return;
            if (r.type === 'income') totalIncome += r.amount;
            else totalExpense += r.amount;
        });
        return { income: totalIncome, expense: totalExpense, net: totalIncome - totalExpense };
    }, [accountRecords]);

    // Per-account balance summary for account list
    const accountBalances = useMemo(() => {
        const map: Record<string, { income: number; expense: number }> = {};
        records.forEach(r => {
            if (!r.account_id || r.status === 'cancelled') return;
            if (!map[r.account_id]) map[r.account_id] = { income: 0, expense: 0 };
            if (r.type === 'income') map[r.account_id].income += r.amount;
            else map[r.account_id].expense += r.amount;
        });
        return map;
    }, [records]);

    const currentYear = new Date().getFullYear();
    const currentMonthStr = new Date().toISOString().substring(0, 7);

    // Calculate Stats
    const stats = useMemo(() => {
        let totalIncome = 0;
        let totalExpense = 0;
        
        records.forEach(r => {
            if (r.status === 'cancelled') return;
            
            // Filter by viewMode (current month or current year)
            if (viewMode === 'monthly') {
                if (!r.date.startsWith(currentMonthStr)) return;
            } else {
                if (!r.date.startsWith(currentYear.toString())) return;
            }

            if (r.type === 'income') totalIncome += r.amount;
            else totalExpense += r.amount;
        });

        return {
            income: totalIncome,
            expense: totalExpense,
            net: totalIncome - totalExpense
        };
    }, [records, viewMode, currentMonthStr, currentYear]);

    // Chart Data Calculation
    const chartData = useMemo(() => {
        const timeMap: Record<string, { income: number, expense: number }> = {};
        
        filteredRecords.forEach(r => {
            if (r.status === 'cancelled') return;
            
            const key = viewMode === 'monthly' ? r.date.substring(0, 7) : r.date.substring(0, 4);
            
            if (!timeMap[key]) timeMap[key] = { income: 0, expense: 0 };
            
            if (r.type === 'income') timeMap[key].income += r.amount;
            else timeMap[key].expense += r.amount;
        });

        const sortedKeys = Object.keys(timeMap).sort();
        // Limit to last 12 items for yearly or 6 items for monthly
        const slicedKeys = viewMode === 'monthly' ? sortedKeys.slice(-6) : sortedKeys.slice(-5);
        
        return slicedKeys.map(key => {
            let name = key;
            if (viewMode === 'monthly') {
                const [year, month] = key.split('-');
                const d = new Date(Number(year), Number(month) - 1);
                name = d.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
            }
            return {
                name,
                Gelir: timeMap[key].income,
                Gider: timeMap[key].expense
            };
        });
    }, [filteredRecords, viewMode]);

    const pieData = useMemo(() => {
        const categoryMap: Record<string, number> = {};
        filteredRecords.forEach(r => {
            if (r.status === 'cancelled') return;
            if (typeFilter !== 'all' && r.type !== typeFilter) return; // if type is selected
            if (typeFilter === 'all' && r.type !== 'expense') return; // Default pie to expense if 'all' selected
            
            categoryMap[r.category] = (categoryMap[r.category] || 0) + r.amount;
        });
        
        const categories = typeFilter === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        
        return Object.keys(categoryMap).map(key => ({
            name: key,
            value: categoryMap[key],
            color: categories.find(c => c.id === key)?.color.replace('text-', 'bg-').split('-')[1] || 'slate'
        })).filter(item => item.value > 0);
    }, [filteredRecords, typeFilter]);

    const tailwindColors: Record<string, string> = {
        'blue': '#2563eb',
        'orange': '#ea580c',
        'purple': '#9333ea',
        'emerald': '#16a34a',
        'slate': '#475569',
        'indigo': '#4f46e5',
        'red': '#dc2626'
    };

    const hasActiveDateFilter = dateFrom || dateTo;

    // ============ RENDER ============

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-slate-200/50">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gelir / Gider Yönetimi</h1>
                    <p className="text-slate-500">Tüm finansal akışınızı aylık ve yıllık bazda takip edin.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => openModal('expense')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors font-medium border border-rose-200"
                    >
                        <TrendingDown size={20} />
                        Gider Ekle
                    </button>
                    <button
                        onClick={() => openModal('income')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium shadow-sm shadow-emerald-500/20"
                    >
                        <TrendingUp size={20} />
                        Gelir Ekle
                    </button>
                </div>
            </div>

            {/* Page Tabs: Gelir/Gider vs Cariler */}
            <div className="flex justify-center sm:justify-start">
                <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex shadow-sm">
                    <button 
                        onClick={() => setPageTab('finance')}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${pageTab === 'finance' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Wallet size={16} />
                        Gelir / Giderler
                    </button>
                    <button 
                        onClick={() => setPageTab('accounts')}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${pageTab === 'accounts' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Building2 size={16} />
                        Cariler
                        {accounts.length > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${pageTab === 'accounts' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                {accounts.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* =============== FINANCE TAB =============== */}
            {pageTab === 'finance' && (
                <>
                    {/* Stats View Mode Toggle */}
                    <div className="flex justify-center sm:justify-start">
                        <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex shadow-sm">
                            <button 
                                onClick={() => setViewMode('monthly')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${viewMode === 'monthly' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Bu Ay
                            </button>
                            <button 
                                onClick={() => setViewMode('yearly')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${viewMode === 'yearly' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Bu Yıl
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Toplam Gelir ({viewMode === 'monthly' ? 'Aylık' : 'Yıllık'})</p>
                                <p className="text-2xl font-black text-emerald-600">+{stats.income.toLocaleString('tr-TR')} ₺</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                                <TrendingDown size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Toplam Gider ({viewMode === 'monthly' ? 'Aylık' : 'Yıllık'})</p>
                                <p className="text-2xl font-black text-rose-600">-{stats.expense.toLocaleString('tr-TR')} ₺</p>
                            </div>
                        </div>
                        <div className={`bg-white p-6 rounded-2xl border ${stats.net >= 0 ? 'border-blue-100' : 'border-orange-100'} shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]`}>
                            <div className={`p-3 rounded-xl ${stats.net >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                <Wallet size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Net Durum ({viewMode === 'monthly' ? 'Aylık' : 'Yıllık'})</p>
                                <p className={`text-2xl font-black ${stats.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                    {stats.net > 0 ? '+' : ''}{stats.net.toLocaleString('tr-TR')} ₺
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Bar Chart */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.01]">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">Finansal Trend ({viewMode === 'monthly' ? 'Son 6 Ay' : 'Son Yıllar'})</h3>
                            <div className="h-72 w-full">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${value > 1000 ? (value/1000).toFixed(0) + 'k' : value}₺`} />
                                            <RechartsTooltip
                                                cursor={{ fill: '#f1f5f9' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value: any) => [`${Number(value || 0).toLocaleString('tr-TR')} ₺`]}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="circle" />
                                            <Bar dataKey="Gelir" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                            <Bar dataKey="Gider" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <AlertCircle size={24} />
                                        <p>Henüz yeterli veri yok</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pie Chart (Categories) */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.01]">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">
                                {typeFilter === 'income' ? 'Gelir Dağılımı' : typeFilter === 'expense' ? 'Gider Dağılımı' : 'Genel Gider Dağılımı'}
                            </h3>
                            <div className="h-72 w-full relative">
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={tailwindColors[entry.color] || tailwindColors['slate']} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                formatter={(value: any) => [`${Number(value || 0).toLocaleString('tr-TR')} ₺`, 'Tutar']}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <AlertCircle size={24} />
                                        <p>Henüz yeterli veri yok</p>
                                    </div>
                                )}
                                {pieData.length > 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                        <div className="text-center">
                                            <p className="text-xs text-slate-500 font-medium">Toplam</p>
                                            <p className="text-lg font-black text-slate-800">{pieData.reduce((sum, item) => sum + item.value, 0).toLocaleString('tr-TR')}₺</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content Table Filters */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
                        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                            {/* Main Type Tabs */}
                            <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
                                <button
                                    onClick={() => { setTypeFilter('all'); setCategoryFilter('all'); }}
                                    className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Tümü
                                </button>
                                <button
                                    onClick={() => { setTypeFilter('income'); setCategoryFilter('all'); }}
                                    className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Gelirler
                                </button>
                                <button
                                    onClick={() => { setTypeFilter('expense'); setCategoryFilter('all'); }}
                                    className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Giderler
                                </button>
                            </div>

                            <div className="relative flex-1 w-full lg:max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Başlık, plaka, öğrenci veya cari ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all text-sm"
                                />
                            </div>
                        </div>

                        {/* Date Range Filter */}
                        <div className="flex flex-col sm:flex-row gap-3 items-center pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Calendar size={16} />
                                <span className="text-sm font-medium">Tarih Aralığı:</span>
                            </div>
                            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={e => setDateFrom(e.target.value)}
                                    className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    placeholder="Başlangıç"
                                />
                                <span className="text-slate-400 text-sm">—</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={e => setDateTo(e.target.value)}
                                    className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    placeholder="Bitiş"
                                />
                                {hasActiveDateFilter && (
                                    <button
                                        onClick={() => { setDateFrom(''); setDateTo(''); }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors border border-rose-200"
                                    >
                                        <X size={14} />
                                        Temizle
                                    </button>
                                )}
                            </div>
                            {hasActiveDateFilter && (
                                <div className="flex items-center gap-1.5 text-sm">
                                    <Filter size={14} className="text-blue-500" />
                                    <span className="text-blue-600 font-medium">
                                        {filteredRecords.length} kayıt bulundu
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Sub Categories based on Type Filter */}
                        {typeFilter !== 'all' && (
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide pt-2 border-t border-slate-100">
                                <button
                                    onClick={() => setCategoryFilter('all')}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${categoryFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                >
                                    Tüm Kategoriler
                                </button>
                                {(typeFilter === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setCategoryFilter(c.id)}
                                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${categoryFilter === c.id ? `${c.bg} ${c.color} ring-1 ring-current` : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        <c.icon size={14} />
                                        {c.id}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="p-4 font-semibold text-slate-600 text-sm">İşlem</th>
                                        <th className="p-4 font-semibold text-slate-600 text-sm">Kategori</th>
                                        <th className="p-4 font-semibold text-slate-600 text-sm">Tarih</th>
                                        <th className="p-4 font-semibold text-slate-600 text-sm">Tutar</th>
                                        <th className="p-4 font-semibold text-slate-600 text-sm">Durum</th>
                                        <th className="p-4 font-semibold text-slate-600 text-sm text-right">Aksiyon</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {authLoading || loading ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center">
                                                <Loader2 className="animate-spin text-blue-500 inline-block mb-2" size={32} />
                                                <p className="text-slate-500">Kayıtlar yükleniyor...</p>
                                            </td>
                                        </tr>
                                    ) : filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                        <AlertCircle size={32} className="text-slate-300" />
                                                    </div>
                                                    <p className="text-lg font-medium text-slate-700">Kayıt bulunamadı</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredRecords.map((record) => {
                                        const isIncome = record.type === 'income';
                                        const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                                        const catMatch = categories.find(c => c.id === record.category) || categories[categories.length - 1];
                                        const CategoryIcon = catMatch.icon;

                                        return (
                                            <tr key={`${record.source}-${record.id}`} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="p-4">
                                                    <div>
                                                        <p className="text-slate-800 font-bold">{record.title}</p>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            {record.vehicle_plate && (
                                                                <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                                                                    {record.vehicle_plate}
                                                                </span>
                                                            )}
                                                            {record.student_name && (
                                                                <span className="text-[11px] font-medium px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
                                                                    Öğrenci: {record.student_name}
                                                                </span>
                                                            )}
                                                            {record.account_name && (
                                                                <span className="text-[11px] font-medium px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200">
                                                                    <Building2 size={10} className="inline mr-1" />
                                                                    Cari: {record.account_name}
                                                                </span>
                                                            )}
                                                            {record.description && (
                                                                <span className="text-[11px] text-slate-500 truncate max-w-[150px]" title={record.description}>
                                                                    {record.description}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1.5 rounded-lg ${catMatch.bg} ${catMatch.color}`}>
                                                            <CategoryIcon size={14} />
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700">{record.category}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-slate-600 text-sm font-medium">
                                                    {new Date(record.date).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td className={`p-4 font-bold ${isIncome ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                    {isIncome ? '+' : '-'}{record.amount.toLocaleString('tr-TR')} ₺
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                        record.status === 'upcoming' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {record.status === 'paid' ? 'Tamamlandı' :
                                                            record.status === 'upcoming' ? 'Bekliyor' : 'İptal'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {record.source !== 'payment' && (
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {record.status !== 'paid' && (
                                                                <button
                                                                    onClick={() => handleComplete(record)}
                                                                    className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100"
                                                                    title="Tamamlandı İşaretle"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => openModal(record.type, record)}
                                                                className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                                                                title="Düzenle"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(record)}
                                                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                                                                title="Sil"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* =============== ACCOUNTS TAB =============== */}
            {pageTab === 'accounts' && (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="relative flex-1 w-full sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Cari adı veya telefon ara..."
                                value={accountsSearchTerm}
                                onChange={e => setAccountsSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                            />
                        </div>
                        <button
                            onClick={() => openAccountModal()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors font-medium shadow-sm"
                        >
                            <Plus size={18} />
                            Yeni Cari Ekle
                        </button>
                    </div>

                    {/* Account Cards */}
                    {filteredAccounts.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                            <div className="flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <Building2 size={32} className="text-slate-300" />
                                </div>
                                <p className="text-lg font-medium text-slate-700">Henüz cari hesap eklenmemiş</p>
                                <p className="text-slate-500 text-sm mt-1">Tedarikçi, müşteri veya iş ortağı eklemek için "Yeni Cari Ekle" butonuna tıklayın.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredAccounts.map(account => {
                                const balance = accountBalances[account.id] || { income: 0, expense: 0 };
                                const net = balance.income - balance.expense;
                                const typeInfo = ACCOUNT_TYPES.find(t => t.id === account.type) || ACCOUNT_TYPES[2];

                                return (
                                    <div
                                        key={account.id}
                                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all group relative"
                                    >
                                        {/* Actions */}
                                        <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openAccountDetail(account)}
                                                className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                                                title="Detay Görüntüle"
                                            >
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                onClick={() => openAccountModal(account)}
                                                className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                                                title="Düzenle"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAccount(account)}
                                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                                                title="Sil"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Account Info */}
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                                                <UserCircle size={20} className="text-slate-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-800 truncate">{account.name}</h3>
                                                <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 ${typeInfo.bg} ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Contact */}
                                        {account.phone && (
                                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                                                <Phone size={13} />
                                                <span>{account.phone}</span>
                                            </div>
                                        )}

                                        {/* Balance Summary */}
                                        <div className="border-t border-slate-100 pt-3 space-y-1.5">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Toplam Gelir:</span>
                                                <span className="font-bold text-emerald-600">+{balance.income.toLocaleString('tr-TR')} ₺</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Toplam Gider:</span>
                                                <span className="font-bold text-rose-600">-{balance.expense.toLocaleString('tr-TR')} ₺</span>
                                            </div>
                                            <div className="flex justify-between text-sm pt-1 border-t border-dashed border-slate-200">
                                                <span className="text-slate-600 font-medium">Net Bakiye:</span>
                                                <span className={`font-black ${net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                                    {net > 0 ? '+' : ''}{net.toLocaleString('tr-TR')} ₺
                                                </span>
                                            </div>
                                        </div>

                                        {/* Detail Button */}
                                        <button
                                            onClick={() => openAccountDetail(account)}
                                            className="w-full mt-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors border border-slate-200 flex items-center justify-center gap-2"
                                        >
                                            <Eye size={14} />
                                            İşlem Geçmişi
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* =============== INCOME / EXPENSE MODAL =============== */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden max-h-[90vh] flex flex-col">
                        <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${modalType === 'income' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            <h3 className={`text-xl font-bold flex items-center gap-2 ${modalType === 'income' ? 'text-emerald-800' : 'text-rose-800'}`}>
                                {modalType === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                                {editingRecord ? 'Kaydı Düzenle' : (modalType === 'income' ? 'Yeni Gelir Ekle' : 'Yeni Gider Ekle')}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Kategori</label>
                                    <select
                                        required
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={formData.category || (modalType === 'income' ? 'Diğer' : 'Araç Bakım')}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {(modalType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                                            <option key={c.id} value={c.id}>{c.id}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Başlık / Açıklama</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder={modalType === 'income' ? 'Örn: Ekstra Taşıma' : 'Örn: Yağ Değişimi'}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={formData.title || ''}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                {modalType === 'expense' && ['Araç Bakım', 'Yakıt', 'Gezi / Ekstra İş'].includes(formData.category || 'Araç Bakım') && (
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">İlgili Araç (Opsiyonel)</label>
                                        <div className="relative">
                                            <div 
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer"
                                                onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                                            >
                                                <span className="text-slate-700">
                                                    {formData.vehicle_id 
                                                        ? vehicles.find(v => v.id === formData.vehicle_id)?.plate_number 
                                                        : 'Araç Belirtilmedi'}
                                                </span>
                                                <Search size={16} className="text-slate-400" />
                                            </div>
                                            
                                            {isVehicleDropdownOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                                                    <div className="p-2 sticky top-0 bg-white border-b border-slate-100">
                                                        <input 
                                                            type="text"
                                                            placeholder="Plaka ara..."
                                                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-sm"
                                                            value={vehicleSearchQuery}
                                                            onChange={e => setVehicleSearchQuery(e.target.value)}
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="p-1">
                                                        <div 
                                                            className="px-3 py-2 hover:bg-slate-50 cursor-pointer rounded-lg text-sm text-slate-700"
                                                            onClick={() => {
                                                                setFormData({ ...formData, vehicle_id: null });
                                                                setIsVehicleDropdownOpen(false);
                                                            }}
                                                        >
                                                            Araç Belirtilmedi
                                                        </div>
                                                        {vehicles.filter(v => v.plate_number.toLowerCase().includes(vehicleSearchQuery.toLowerCase())).map(v => (
                                                            <div 
                                                                key={v.id}
                                                                className="px-3 py-2 hover:bg-slate-50 cursor-pointer rounded-lg text-sm font-medium text-slate-700"
                                                                onClick={() => {
                                                                    setFormData({ ...formData, vehicle_id: v.id });
                                                                    setIsVehicleDropdownOpen(false);
                                                                    setVehicleSearchQuery('');
                                                                }}
                                                            >
                                                                {v.plate_number}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Cari İşlem Toggle */}
                                <div className="col-span-2">
                                    <div className="flex items-center justify-between p-3 bg-amber-50/60 rounded-xl border border-amber-200/50">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={18} className="text-amber-600" />
                                            <span className="text-sm font-bold text-amber-800">Cari İşlem</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCariTransaction(!isCariTransaction);
                                                if (isCariTransaction) {
                                                    setFormData({ ...formData, account_id: null });
                                                }
                                            }}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isCariTransaction ? 'bg-amber-500' : 'bg-slate-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${isCariTransaction ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Cari Seçim Dropdown */}
                                {isCariTransaction && (
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Cari Hesap Seçin</label>
                                        <div className="relative">
                                            <div 
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer"
                                                onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                                            >
                                                <span className={formData.account_id ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                                                    {formData.account_id 
                                                        ? accounts.find(a => a.id === formData.account_id)?.name 
                                                        : 'Cari seçin...'}
                                                </span>
                                                <ChevronDown size={16} className="text-slate-400" />
                                            </div>
                                            
                                            {isAccountDropdownOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                                                    <div className="p-2 sticky top-0 bg-white border-b border-slate-100">
                                                        <input 
                                                            type="text"
                                                            placeholder="Cari ara..."
                                                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-sm"
                                                            value={accountSearchQuery}
                                                            onChange={e => setAccountSearchQuery(e.target.value)}
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="p-1">
                                                        {accounts.length === 0 ? (
                                                            <div className="px-3 py-3 text-center text-sm text-slate-400">
                                                                Henüz cari hesap yok. Önce "Cariler" sekmesinden ekleyin.
                                                            </div>
                                                        ) : (
                                                            accounts
                                                                .filter(a => a.name.toLowerCase().includes(accountSearchQuery.toLowerCase()))
                                                                .map(a => {
                                                                    const tInfo = ACCOUNT_TYPES.find(t => t.id === a.type) || ACCOUNT_TYPES[2];
                                                                    return (
                                                                        <div 
                                                                            key={a.id}
                                                                            className={`px-3 py-2 hover:bg-slate-50 cursor-pointer rounded-lg text-sm flex items-center justify-between ${formData.account_id === a.id ? 'bg-amber-50 border border-amber-200' : ''}`}
                                                                            onClick={() => {
                                                                                setFormData({ ...formData, account_id: a.id });
                                                                                setIsAccountDropdownOpen(false);
                                                                                setAccountSearchQuery('');
                                                                            }}
                                                                        >
                                                                            <span className="font-medium text-slate-700">{a.name}</span>
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tInfo.bg} ${tInfo.color}`}>{tInfo.label}</span>
                                                                        </div>
                                                                    );
                                                                })
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tarih</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={formData.date || ''}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tutar (₺)</label>
                                    <input
                                        required
                                        type="number"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:border-blue-500 transition-all font-bold ${modalType === 'income' ? 'text-emerald-600 focus:ring-emerald-500/20' : 'text-rose-600 focus:ring-rose-500/20'}`}
                                        value={formData.amount || ''}
                                        onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    />
                                </div>
                                {modalType === 'expense' && ['Yakıt', 'Gezi / Ekstra İş'].includes(formData.category || '') && (
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Kilometre (Opsiyonel)</label>
                                        <input
                                            type="number"
                                            placeholder="Örn: 154200"
                                            min="0"
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            value={formData.kilometer || ''}
                                            onChange={e => setFormData({ ...formData, kilometer: e.target.value ? Number(e.target.value) : undefined })}
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Durum</label>
                                    <select
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                        value={formData.status || 'upcoming'}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="upcoming">Bekliyor</option>
                                        <option value="paid">Tamamlandı</option>
                                        <option value="cancelled">İptal Edildi</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Detaylı Notlar</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Eklemek istediğiniz notlar..."
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={formData.description || ''}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold transition-all shadow-sm ${modalType === 'income' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'} disabled:opacity-70`}
                                >
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                                    {editingRecord ? 'Güncelle' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =============== ACCOUNT ADD/EDIT MODAL =============== */}
            {isAccountModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                                <Building2 size={24} />
                                {editingAccount ? 'Cari Düzenle' : 'Yeni Cari Ekle'}
                            </h3>
                            <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAccountSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Cari Adı *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Firma veya kişi adı"
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={accountFormData.name || ''}
                                    onChange={e => setAccountFormData({ ...accountFormData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Cari Türü</label>
                                <div className="flex gap-2">
                                    {ACCOUNT_TYPES.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setAccountFormData({ ...accountFormData, type: t.id as any })}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${accountFormData.type === t.id
                                                ? `${t.bg} ${t.color} border-current ring-1 ring-current`
                                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Telefon</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="0xxx xxx xx xx"
                                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={accountFormData.phone || ''}
                                        onChange={e => setAccountFormData({ ...accountFormData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Not</label>
                                <textarea
                                    rows={2}
                                    placeholder="Eklemek istediğiniz notlar..."
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={accountFormData.note || ''}
                                    onChange={e => setAccountFormData({ ...accountFormData, note: e.target.value })}
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAccountModalOpen(false)}
                                    className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold bg-slate-800 hover:bg-slate-700 transition-all shadow-sm"
                                >
                                    <Check size={20} />
                                    {editingAccount ? 'Güncelle' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =============== ACCOUNT DETAIL MODAL =============== */}
            {isAccountDetailOpen && selectedAccount && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Building2 size={22} />
                                    {selectedAccount.name}
                                </h3>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(ACCOUNT_TYPES.find(t => t.id === selectedAccount.type) || ACCOUNT_TYPES[2]).bg} ${(ACCOUNT_TYPES.find(t => t.id === selectedAccount.type) || ACCOUNT_TYPES[2]).color}`}>
                                        {(ACCOUNT_TYPES.find(t => t.id === selectedAccount.type) || ACCOUNT_TYPES[2]).label}
                                    </span>
                                    {selectedAccount.phone && (
                                        <span className="text-sm text-slate-500 flex items-center gap-1">
                                            <Phone size={12} /> {selectedAccount.phone}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setIsAccountDetailOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-100">
                            <div className="bg-emerald-50 p-3 rounded-xl text-center">
                                <p className="text-xs text-emerald-600 font-medium">Toplam Gelir</p>
                                <p className="text-lg font-black text-emerald-700">+{accountSummary.income.toLocaleString('tr-TR')} ₺</p>
                            </div>
                            <div className="bg-rose-50 p-3 rounded-xl text-center">
                                <p className="text-xs text-rose-600 font-medium">Toplam Gider</p>
                                <p className="text-lg font-black text-rose-700">-{accountSummary.expense.toLocaleString('tr-TR')} ₺</p>
                            </div>
                            <div className={`p-3 rounded-xl text-center ${accountSummary.net >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                                <p className={`text-xs font-medium ${accountSummary.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Net Bakiye</p>
                                <p className={`text-lg font-black ${accountSummary.net >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                                    {accountSummary.net > 0 ? '+' : ''}{accountSummary.net.toLocaleString('tr-TR')} ₺
                                </p>
                            </div>
                        </div>

                        {/* Transaction List */}
                        <div className="flex-1 overflow-y-auto">
                            {accountRecords.length === 0 ? (
                                <div className="p-12 text-center">
                                    <AlertCircle size={32} className="text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">Bu cariye ait işlem bulunamadı</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {accountRecords.map(record => {
                                        const isIncome = record.type === 'income';
                                        return (
                                            <div key={`${record.source}-${record.id}`} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                        {isIncome ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">{record.title}</p>
                                                        <p className="text-xs text-slate-400">{record.category} • {new Date(record.date).toLocaleDateString('tr-TR')}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {isIncome ? '+' : '-'}{record.amount.toLocaleString('tr-TR')} ₺
                                                    </p>
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : record.status === 'upcoming' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {record.status === 'paid' ? 'Tamamlandı' : record.status === 'upcoming' ? 'Bekliyor' : 'İptal'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                            <button
                                onClick={() => setIsAccountDetailOpen(false)}
                                className="w-full py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expenses;
