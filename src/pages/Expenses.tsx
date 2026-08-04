import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, X, Wrench, Fuel, Users, Wallet, MoreHorizontal,
    Check, Trash2, Edit2, Loader2, AlertCircle, TrendingUp, TrendingDown
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
}

export const EXPENSE_CATEGORIES = [
    { id: 'Araç Bakım', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'Yakıt', icon: Fuel, color: 'text-orange-600', bg: 'bg-orange-50' },
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

const Expenses: React.FC = () => {
    const { profile, loading: authLoading } = useAuth();
    const [records, setRecords] = useState<FinancialRecord[]>([]);
    const [vehicles, setVehicles] = useState<{ id: string, plate_number: string }[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [statusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'expense' | 'income'>('expense');
    const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
    const [formData, setFormData] = useState<Partial<FinancialRecord>>({
        category: 'Araç Bakım',
        status: 'upcoming',
        date: new Date().toISOString().split('T')[0]
    });
    
    const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
    const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);

    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

    useEffect(() => {
        if (authLoading) return;

        if (profile?.company_id) {
            fetchAllData();
            fetchVehicles();
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

        return () => {
            supabase.removeChannel(channelExpenses);
            supabase.removeChannel(channelIncomes);
            supabase.removeChannel(channelPayments);
        };
    }, [profile?.company_id, authLoading]);

    const fetchVehicles = async () => {
        if (!profile?.company_id) return;
        const { data } = await supabase.from('vehicles').select('id, plate_number').eq('company_id', profile.company_id).order('plate_number');
        if (data) setVehicles(data);
    };

    const fetchAllData = async () => {
        if (!profile?.company_id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Fetch Expenses
            const { data: expensesData, error: expensesError } = await supabase
                .from('expenses')
                .select(`*, vehicles(plate_number)`)
                .eq('company_id', profile.company_id);

            if (expensesError) throw expensesError;

            // Fetch Incomes (Manual)
            const { data: incomesData } = await supabase
                .from('incomes')
                .select(`*`)
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
                    vehicle_plate: e.vehicles?.plate_number
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
                    created_at: i.created_at
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (modalType === 'expense') {
                const payload = {
                    company_id: profile?.company_id,
                    expense_category: formData.category,
                    vehicle_id: ['Araç Bakım', 'Yakıt'].includes(formData.category || '') ? (formData.vehicle_id || null) : null,
                    title: formData.title,
                    expense_date: formData.date,
                    amount: formData.amount,
                    description: formData.description,
                    status: formData.status
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
                    status: formData.status
                };

                if (editingRecord && editingRecord.source === 'income') {
                    await supabase.from('incomes').update(payload).eq('id', editingRecord.id);
                } else {
                    await supabase.from('incomes').insert([payload]);
                }
            }

            setIsModalOpen(false);
            setEditingRecord(null);
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
                vehicle_id: record.vehicle_id
            });
        } else {
            setFormData({
                category: type === 'expense' ? 'Araç Bakım' : 'Diğer',
                status: 'upcoming',
                date: new Date().toISOString().split('T')[0]
            });
        }
        setIsModalOpen(true);
    };

    const filteredRecords = records.filter(record => {
        const matchesSearch =
            (record.vehicle_plate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (record.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (record.student_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || record.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || record.category === categoryFilter;
        return matchesSearch && matchesType && matchesStatus && matchesCategory;
    });

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
                            placeholder="Başlık, plaka veya öğrenci ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all text-sm"
                        />
                    </div>
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
                                                <div className="flex items-center gap-2 mt-1">
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
                        <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${modalType === 'income' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            <h3 className={`text-xl font-bold flex items-center gap-2 ${modalType === 'income' ? 'text-emerald-800' : 'text-rose-800'}`}>
                                {modalType === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                                {editingRecord ? 'Kaydı Düzenle' : (modalType === 'income' ? 'Yeni Gelir Ekle' : 'Yeni Gider Ekle')}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

                                {modalType === 'expense' && ['Araç Bakım', 'Yakıt'].includes(formData.category || 'Araç Bakım') && (
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
        </div>
    );
};

export default Expenses;
