import React, { useState, useEffect } from 'react';
import {
    Plus, Search, X, Wrench, Fuel, Users, Wallet, MoreHorizontal,
    Calendar, DollarSign,
    Check, Trash2, Edit2, Loader2, AlertCircle, Truck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ExpenseRecord {
    id: string;
    company_id: string;
    expense_category: string;
    vehicle_id?: string | null;
    title: string;
    expense_date: string;
    amount: number;
    description: string;
    status: 'upcoming' | 'paid' | 'cancelled';
    created_at: string;
    vehicles?: {
        plate_number: string;
    };
}

export const EXPENSE_CATEGORIES = [
    { id: 'Araç Bakım', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'Yakıt', icon: Fuel, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'Maaş', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'Vergi/Sigorta', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'Diğer', icon: MoreHorizontal, color: 'text-slate-600', bg: 'bg-slate-50' }
];

const Expenses: React.FC = () => {
    const { profile, loading: authLoading } = useAuth();
    const [records, setRecords] = useState<ExpenseRecord[]>([]);
    const [vehicles, setVehicles] = useState<{ id: string, plate_number: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);
    const [formData, setFormData] = useState<Partial<ExpenseRecord>>({
        expense_category: 'Araç Bakım',
        status: 'upcoming',
        expense_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (authLoading) return;

        if (profile?.company_id) {
            fetchRecords();
            fetchVehicles();
        } else {
            setLoading(false); // No profile, stop loading
        }

        const channel = supabase
            .channel('public:expenses')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
                fetchRecords();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.company_id, authLoading]);

    const fetchVehicles = async () => {
        if (!profile?.company_id) return;
        const { data } = await supabase.from('vehicles').select('id, plate_number').eq('company_id', profile.company_id).order('plate_number');
        if (data) setVehicles(data);
    };

    const fetchRecords = async () => {
        if (!profile?.company_id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select(`
                    *,
                    vehicles(plate_number)
                `)
                .eq('company_id', profile.company_id)
                .order('expense_date', { ascending: false });

            if (error) throw error;
            setRecords(data || []);
        } catch (err) {
            console.error('Error fetching expenses:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                company_id: profile?.company_id,
                expense_category: formData.expense_category,
                // Only save vehicle_id if category generally requires it, otherwise null
                vehicle_id: ['Araç Bakım', 'Yakıt'].includes(formData.expense_category || '') ? (formData.vehicle_id || null) : null,
                title: formData.title,
                expense_date: formData.expense_date,
                amount: formData.amount,
                description: formData.description,
                status: formData.status
            };

            if (editingRecord) {
                const { error } = await supabase
                    .from('expenses')
                    .update(payload)
                    .eq('id', editingRecord.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('expenses')
                    .insert([payload]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            setEditingRecord(null);
            setFormData({ expense_category: 'Araç Bakım', status: 'upcoming', expense_date: new Date().toISOString().split('T')[0] });
            fetchRecords();
        } catch (err) {
            console.error('Error saving record:', err);
            alert('İşlem sırasında bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('expenses')
                .update({ status: 'paid' })
                .eq('id', id);
            if (error) throw error;
            fetchRecords();
        } catch (err) {
            console.error('Error completing record:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu gider kaydını silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) throw error;
            fetchRecords();
        } catch (err) {
            console.error('Error deleting record:', err);
        }
    };

    const filteredRecords = records.filter(record => {
        const matchesSearch =
            (record.vehicles?.plate_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (record.title || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || record.expense_category === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
    });

    const stats = {
        totalAmount: filteredRecords.filter(r => r.status !== 'cancelled').reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
        upcomingCount: filteredRecords.filter(r => r.status === 'upcoming').length,
        paidCount: filteredRecords.filter(r => r.status === 'paid').length
    };
    
    // Calculate vehicle totals for filtered records
    const vehicleTotals = filteredRecords.reduce((acc, record) => {
        if (record.status !== 'cancelled' && record.vehicles?.plate_number) {
            const plate = record.vehicles.plate_number;
            acc[plate] = (acc[plate] || 0) + (Number(record.amount) || 0);
        }
        return acc;
    }, {} as Record<string, number>);
    
    const hasVehicleTotals = Object.keys(vehicleTotals).length > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gider Yönetimi</h1>
                    <p className="text-slate-500">Araç bakımı, yakıt, personel ve genel şirket giderlerini takip edin.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingRecord(null);
                        setFormData({ expense_category: 'Araç Bakım', status: 'upcoming', expense_date: new Date().toISOString().split('T')[0] });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-xl hover:bg-blue-600 transition-colors font-medium shadow-sm"
                >
                    <Plus size={20} />
                    Yeni Gider Ekle
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">{categoryFilter === 'all' ? 'Toplam Gider' : `${categoryFilter} Toplamı`}</p>
                        <p className="text-2xl font-black text-slate-800">{stats.totalAmount.toLocaleString('tr-TR')} ₺</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Bekleyen Ödemeler</p>
                        <p className="text-2xl font-black text-slate-800">{stats.upcomingCount} Adet</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Check size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Ödenen Giderler</p>
                        <p className="text-2xl font-black text-slate-800">{stats.paidCount} Kayıt</p>
                    </div>
                </div>
            </div>
            
            {/* Vehicle Breakdown (Only show when a specific category is selected and there's vehicle data) */}
            {categoryFilter !== 'all' && hasVehicleTotals && (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Truck size={16} className="text-slate-400" />
                        Araç Bazlı {categoryFilter} Harcamaları
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(vehicleTotals)
                            .sort(([, a], [, b]) => b - a)
                            .map(([plate, total]) => (
                            <div key={plate} className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-3">
                                <span className="font-bold text-slate-700">{plate}</span>
                                <span className="text-sm font-black text-blue-600">{total.toLocaleString('tr-TR')} ₺</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2">
                <button
                    onClick={() => setCategoryFilter('all')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
                        categoryFilter === 'all'
                            ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    Tüm Giderler
                </button>
                {EXPENSE_CATEGORIES.map(c => {
                    const CategoryIcon = c.icon;
                    const isActive = categoryFilter === c.id;
                    return (
                        <button
                            key={c.id}
                            onClick={() => setCategoryFilter(c.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
                                isActive
                                    ? `${c.bg} ${c.color} border-transparent shadow-sm ring-1 ring-${c.color.split('-')[1]}-500/50`
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <CategoryIcon size={18} className={isActive ? c.color : 'text-slate-400'} />
                            {c.id}
                        </button>
                    )
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-col xl:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Başlık veya plaka ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:bg-white focus:border-secondary transition-all"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0 scrollbar-hide">
                    {['all', 'upcoming', 'paid', 'cancelled'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${statusFilter === status
                                ? 'bg-secondary text-white shadow-lg shadow-blue-500/20'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {status === 'all' ? 'Tümü' :
                                status === 'upcoming' ? 'Bekleyen' :
                                    status === 'paid' ? 'Ödendi' : 'İptal'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-4 font-semibold text-slate-600 text-sm">Gider Bilgisi</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Kategori</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Tarih</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Maliyet</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Durum</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {authLoading || loading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <Loader2 className="animate-spin text-secondary inline-block mb-2" size={32} />
                                        <p className="text-slate-500">Yükleniyor...</p>
                                    </td>
                                </tr>
                            ) : !profile?.company_id ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                                <AlertCircle size={32} className="text-red-400" />
                                            </div>
                                            <p className="text-lg font-medium text-slate-700">Profil Yüklenemedi</p>
                                            <p className="text-sm text-slate-500 mb-4">Şirket bilginiz bulunamadığı için harcamalar listelenemiyor.</p>
                                            <button
                                                onClick={() => window.location.reload()}
                                                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-blue-600 transition-colors"
                                            >
                                                Sayfayı Yenile
                                            </button>
                                        </div>
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
                                            <p className="text-sm text-slate-500">Aramanıza uygun bir gider kaydı yok.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRecords.map((record) => {
                                const catMatch = EXPENSE_CATEGORIES.find(c => c.id === record.expense_category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
                                const CategoryIcon = catMatch.icon;

                                return (
                                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div>
                                                <p className="text-slate-800 font-bold">{record.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {record.vehicles?.plate_number && (
                                                        <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                                                            {record.vehicles.plate_number}
                                                        </span>
                                                    )}
                                                    {record.description && (
                                                        <span className="text-[11px] text-slate-500 truncate max-w-[200px]" title={record.description}>
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
                                                <span className="text-sm font-medium text-slate-700">{record.expense_category}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600 text-sm font-medium">
                                            {new Date(record.expense_date).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="p-4 font-bold text-slate-900">
                                            {Number(record.amount).toLocaleString('tr-TR')} ₺
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                record.status === 'upcoming' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                {record.status === 'paid' ? 'Ödendi' :
                                                    record.status === 'upcoming' ? 'Bekliyor' : 'İptal'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {record.status !== 'paid' && (
                                                    <button
                                                        onClick={() => handleComplete(record.id)}
                                                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100"
                                                        title="Ödendi İşaretle"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setEditingRecord(record);
                                                        setFormData(record);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                                                    title="Düzenle"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(record.id)}
                                                    className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
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
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Wallet size={20} className="text-secondary" />
                                {editingRecord ? 'Gideri Düzenle' : 'Yeni Gider Ekle'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Gider Kategorisi</label>
                                    <select
                                        required
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                        value={formData.expense_category || 'Araç Bakım'}
                                        onChange={e => setFormData({ ...formData, expense_category: e.target.value })}
                                    >
                                        {EXPENSE_CATEGORIES.map(c => (
                                            <option key={c.id} value={c.id}>{c.id}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Başlık / Açıklama</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Örn: Yağ Değişimi"
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                        value={formData.title || ''}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                {['Araç Bakım', 'Yakıt'].includes(formData.expense_category || 'Araç Bakım') && (
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">İlgili Araç (Opsiyonel)</label>
                                        <select
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                            value={formData.vehicle_id || ''}
                                            onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
                                        >
                                            <option value="">Araç Belirtilmedi</option>
                                            {vehicles.map(v => (
                                                <option key={v.id} value={v.id}>{v.plate_number}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tarih</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                        value={formData.expense_date || ''}
                                        onChange={e => setFormData({ ...formData, expense_date: e.target.value })}
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
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all font-bold text-slate-900"
                                        value={formData.amount || ''}
                                        onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Durum</label>
                                    <select
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all font-medium text-slate-700"
                                        value={formData.status || 'upcoming'}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="upcoming">Bekliyor / Ödenecek</option>
                                        <option value="paid">Ödendi</option>
                                        <option value="cancelled">İptal Edildi</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Detaylı Notlar</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Eklemek istediğiniz notlar..."
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
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
                                    className="flex-1 py-3 bg-secondary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'İşlem Sürüyor...' : (editingRecord ? 'Güncelle' : 'Kaydet')}
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
