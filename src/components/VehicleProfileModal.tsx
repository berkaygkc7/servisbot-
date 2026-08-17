import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { 
    X, 
    FileSpreadsheet, 
    Loader2, 
    AlertCircle, 
    Car,
    Calendar,
    Fuel,
    MapPin,
    Users,
    Activity,
    Bus,
    FileText
} from 'lucide-react';
import { type Vehicle } from './dashboard/VehicleList';

interface VehicleProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: Vehicle | null;
}

const VehicleProfileModal: React.FC<VehicleProfileModalProps> = ({ isOpen, onClose, vehicle }) => {
    const { profile } = useAuth();
    
    const [activeTab, setActiveTab] = useState<'overview' | 'timesheet' | 'expenses' | 'trips'>('overview');
    
    // Period selection for filtering
    const [selectedMonth, setSelectedMonth] = useState<string>(
        (new Date().getMonth() + 1).toString().padStart(2, '0')
    );
    const [selectedYear, setSelectedYear] = useState<string>(
        new Date().getFullYear().toString()
    );

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Data states
    const [timesheetRows, setTimesheetRows] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [trips, setTrips] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && vehicle && profile?.company_id) {
            fetchVehicleData();
        }
    }, [isOpen, vehicle, selectedMonth, selectedYear, profile?.company_id]);

    const fetchVehicleData = async () => {
        if (!vehicle || !profile?.company_id) return;
        setLoading(true);
        setErrorMsg(null);
        
        try {
            // 1. Fetch the timesheet ID for the selected month/year
            const { data: tsData } = await supabase
                .from('universal_timesheets')
                .select('id')
                .eq('company_id', profile.company_id)
                .eq('month', selectedMonth)
                .eq('year', selectedYear)
                .single();

            let tRows: any[] = [];
            if (tsData) {
                // 2. Fetch timesheet rows matching the vehicle's plate
                const { data: rowData } = await supabase
                    .from('universal_timesheet_rows')
                    .select('*')
                    .eq('timesheet_id', tsData.id)
                    .ilike('unique_identifier', `%${vehicle.plate}%`);
                
                if (rowData) tRows = rowData;
            }
            setTimesheetRows(tRows);

            // 3. Fetch Expenses & Trips
            const startDate = `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`;
            const nextMonthDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
            const endDate = nextMonthDate.toISOString().split('T')[0];

            const { data: expData, error: expError } = await supabase
                .from('expenses')
                .select('*')
                .eq('company_id', profile.company_id)
                .eq('vehicle_id', vehicle.id)
                .gte('expense_date', startDate)
                .lt('expense_date', endDate)
                .order('expense_date', { ascending: false });

            if (expError) throw expError;

            if (expData) {
                const fuelAndOthers = expData.filter(e => e.expense_category !== 'Gezi / Ekstra İş');
                const vehicleTrips = expData.filter(e => e.expense_category === 'Gezi / Ekstra İş');
                setExpenses(fuelAndOthers);
                setTrips(vehicleTrips);
            }

        } catch (err: any) {
            console.error('Error fetching vehicle profile data:', err);
            setErrorMsg('Veriler yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!vehicle) return;
        setLoading(true);

        try {
            const wb = XLSX.utils.book_new();

            // Sheet 1: Puantaj
            const timesheetExportData: any[] = [];
            timesheetRows.forEach(row => {
                const baseRow: any = {
                    'Öğe Adı': row.primary_name,
                    'Kategori': row.category,
                    'Plaka': row.unique_identifier,
                    'Açıklama': row.description,
                };
                
                let totalDays = 0;
                const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
                for (let i = 1; i <= daysInMonth; i++) {
                    const dayData = row.days_data?.[i.toString()];
                    let val = '';
                    if (typeof dayData === 'object' && dayData !== null) {
                        val = dayData.value || '';
                    } else if (dayData !== undefined && dayData !== null) {
                        val = String(dayData);
                    }
                    baseRow[`Gün ${i}`] = val;
                    if (val) totalDays++;
                }
                
                baseRow['Toplam Adet'] = totalDays;
                baseRow['Birim Fiyat'] = row.unit_price;
                baseRow['Prim/Ek'] = row.extra_payment;
                baseRow['Kesinti'] = row.deduction;
                baseRow['Net Tutar'] = (totalDays * row.unit_price) + row.extra_payment - row.deduction;
                
                timesheetExportData.push(baseRow);
            });

            if (timesheetExportData.length > 0) {
                const wsTimesheet = XLSX.utils.json_to_sheet(timesheetExportData);
                XLSX.utils.book_append_sheet(wb, wsTimesheet, "Puantaj");
            } else {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Mesaj: 'Bu araca ait puantaj kaydı bulunamadı.' }]), "Puantaj");
            }

            // Sheet 2: Yakıt ve Giderler
            const expenseExportData = expenses.map(exp => ({
                'Tarih': new Date(exp.expense_date).toLocaleDateString('tr-TR'),
                'Kategori': exp.expense_category,
                'Başlık': exp.title,
                'Açıklama': exp.description || '-',
                'Kilometre': exp.kilometer || '-',
                'Tutar (₺)': exp.amount
            }));
            
            if (expenseExportData.length > 0) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseExportData), "Yakıt ve Giderler");
            } else {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Mesaj: 'Kayıt bulunamadı.' }]), "Yakıt ve Giderler");
            }

            // Sheet 3: Geziler
            const tripExportData = trips.map(t => ({
                'Tarih': new Date(t.expense_date).toLocaleDateString('tr-TR'),
                'Başlık': t.title,
                'Açıklama': t.description || '-',
                'Kilometre': t.kilometer || '-',
                'Kazanç/Tutar (₺)': t.amount
            }));

            if (tripExportData.length > 0) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tripExportData), "Geziler");
            } else {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Mesaj: 'Kayıt bulunamadı.' }]), "Geziler");
            }

            // Download
            const fileName = `Arac_Profili_${vehicle.plate}_${selectedMonth}_${selectedYear}.xlsx`;
            XLSX.writeFile(wb, fileName);

        } catch (err) {
            console.error(err);
            setErrorMsg('Rapor oluşturulurken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !vehicle) return null;

    // Render Helpers
    const totalExpenseAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalTimesheetAmount = timesheetRows.reduce((sum, r) => {
        const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
        let totalDays = 0;
        for (let i = 1; i <= daysInMonth; i++) {
            if (r.days_data?.[i.toString()]) totalDays++;
        }
        return sum + (totalDays * r.unit_price) + r.extra_payment - r.deduction;
    }, 0);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="bg-slate-900 p-6 shrink-0 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 shadow-inner">
                            <Car className="text-blue-400" size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-black text-white tracking-tight">{vehicle.plate}</h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    vehicle.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                    vehicle.status === 'maintenance' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                    'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}>
                                    {vehicle.status === 'active' ? 'Aktif' : vehicle.status === 'maintenance' ? 'Bakımda' : 'Servis Dışı'}
                                </span>
                            </div>
                            <p className="text-sm font-medium text-slate-400">
                                Sürücü: <span className="text-slate-300">{vehicle.driver || 'Atanmadı'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
                        {/* Period Selectors */}
                        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
                            <select
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="bg-transparent text-white text-sm font-bold focus:outline-none px-2 cursor-pointer"
                            >
                                {Array.from({ length: 12 }, (_, i) => {
                                    const m = (i + 1).toString().padStart(2, '0');
                                    return <option key={m} value={m} className="bg-slate-800">{new Date(2000, i, 1).toLocaleString('tr-TR', { month: 'short' })}</option>;
                                })}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={e => setSelectedYear(e.target.value)}
                                className="bg-transparent text-white text-sm font-bold focus:outline-none px-2 cursor-pointer border-l border-slate-700"
                            >
                                <option value="2024" className="bg-slate-800">2024</option>
                                <option value="2025" className="bg-slate-800">2025</option>
                            </select>
                        </div>

                        <button 
                            onClick={handleExport}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-900/20"
                            title="Tüm verileri Excel'e aktar"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                            <span className="hidden sm:inline">Rapor Al</span>
                        </button>
                        
                        <button 
                            onClick={onClose}
                            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="px-6 bg-white border-b border-slate-200 shrink-0 flex gap-6 overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Activity size={16} /> Özet
                    </button>
                    <button 
                        onClick={() => setActiveTab('timesheet')}
                        className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'timesheet' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Calendar size={16} /> Puantaj & Hakediş
                        <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-[10px] ml-1">{timesheetRows.length}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('expenses')}
                        className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'expenses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Fuel size={16} /> Yakıt & Giderler
                        <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-[10px] ml-1">{expenses.length}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('trips')}
                        className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'trips' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Bus size={16} /> Geziler
                        <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-[10px] ml-1">{trips.length}</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            <Loader2 size={32} className="animate-spin mb-3 text-blue-500" />
                            <p className="font-medium text-sm">Veriler yükleniyor...</p>
                        </div>
                    )}
                    
                    {!loading && errorMsg && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                            <AlertCircle size={20} />
                            <p className="font-bold">{errorMsg}</p>
                        </div>
                    )}

                    {!loading && !errorMsg && activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kapasite</p>
                                        <p className="text-xl font-black text-slate-800">{vehicle.student_count || 0} / {vehicle.capacity}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Aylık Hakediş</p>
                                        <p className="text-xl font-black text-slate-800">{totalTimesheetAmount.toLocaleString('tr-TR')} ₺</p>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-600">
                                        <Fuel size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Aylık Gider</p>
                                        <p className="text-xl font-black text-slate-800">{totalExpenseAmount.toLocaleString('tr-TR')} ₺</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <MapPin className="text-slate-400" size={20} /> Güncel Konum
                                </h3>
                                {vehicle.current_latitude && vehicle.current_longitude ? (
                                    <div className="bg-slate-100 rounded-xl p-4 font-mono text-sm text-slate-600 text-center">
                                        Enlem: {vehicle.current_latitude.toFixed(6)} <br/>
                                        Boylam: {vehicle.current_longitude.toFixed(6)}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-slate-400 font-medium bg-slate-50 rounded-xl">
                                        Konum verisi bulunamadı.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!loading && !errorMsg && activeTab === 'timesheet' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 text-sm">Puantaj Kayıtları</h3>
                                <span className="text-xs font-medium text-slate-500">{selectedMonth}/{selectedYear} Dönemi</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-600">
                                            <th className="p-3 font-semibold">Öğe Adı</th>
                                            <th className="p-3 font-semibold text-center">Çalışılan Gün</th>
                                            <th className="p-3 font-semibold text-right">Birim Fiyat</th>
                                            <th className="p-3 font-semibold text-right">Prim</th>
                                            <th className="p-3 font-semibold text-right">Kesinti</th>
                                            <th className="p-3 font-semibold text-right">Net Hakediş</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {timesheetRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                                                    Bu dönem için puantaj kaydı bulunmuyor.
                                                </td>
                                            </tr>
                                        ) : (
                                            timesheetRows.map(row => {
                                                const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
                                                let totalDays = 0;
                                                for (let i = 1; i <= daysInMonth; i++) {
                                                    if (row.days_data?.[i.toString()]) totalDays++;
                                                }
                                                const totalAmount = (totalDays * row.unit_price) + row.extra_payment - row.deduction;

                                                return (
                                                    <tr key={row.id} className="hover:bg-slate-50">
                                                        <td className="p-3 font-bold text-slate-700">
                                                            {row.primary_name}
                                                            <div className="text-[10px] text-slate-400 font-normal">{row.category}</div>
                                                        </td>
                                                        <td className="p-3 text-center font-bold text-blue-600 bg-blue-50/30">{totalDays}</td>
                                                        <td className="p-3 text-right text-slate-600">{row.unit_price.toLocaleString('tr-TR')} ₺</td>
                                                        <td className="p-3 text-right text-emerald-600">+{row.extra_payment} ₺</td>
                                                        <td className="p-3 text-right text-rose-600">-{row.deduction} ₺</td>
                                                        <td className="p-3 text-right font-black text-slate-800">{totalAmount.toLocaleString('tr-TR')} ₺</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!loading && !errorMsg && activeTab === 'expenses' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                            <th className="p-4 font-semibold">Tarih</th>
                                            <th className="p-4 font-semibold">Kategori</th>
                                            <th className="p-4 font-semibold">Başlık</th>
                                            <th className="p-4 font-semibold text-right">Kilometre</th>
                                            <th className="p-4 font-semibold text-right">Tutar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {expenses.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Kayıt bulunamadı.</td>
                                            </tr>
                                        ) : (
                                            expenses.map(exp => (
                                                <tr key={exp.id} className="hover:bg-slate-50">
                                                    <td className="p-4 text-slate-500">{new Date(exp.expense_date).toLocaleDateString('tr-TR')}</td>
                                                    <td className="p-4 font-medium text-slate-700">
                                                        <span className="bg-slate-100 px-2.5 py-1 rounded-md">{exp.expense_category}</span>
                                                    </td>
                                                    <td className="p-4 font-bold text-slate-800">{exp.title}</td>
                                                    <td className="p-4 text-right text-slate-500 font-mono">{exp.kilometer ? `${exp.kilometer} km` : '-'}</td>
                                                    <td className="p-4 text-right font-black text-rose-600">{Number(exp.amount).toLocaleString('tr-TR')} ₺</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!loading && !errorMsg && activeTab === 'trips' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                            <th className="p-4 font-semibold">Tarih</th>
                                            <th className="p-4 font-semibold">Başlık (Rota)</th>
                                            <th className="p-4 font-semibold text-right">Kilometre</th>
                                            <th className="p-4 font-semibold text-right">Kazanç / Tutar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {trips.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">Bu aya ait gezi kaydı bulunamadı.</td>
                                            </tr>
                                        ) : (
                                            trips.map(trip => (
                                                <tr key={trip.id} className="hover:bg-slate-50">
                                                    <td className="p-4 text-slate-500">{new Date(trip.expense_date).toLocaleDateString('tr-TR')}</td>
                                                    <td className="p-4 font-bold text-slate-800">{trip.title}</td>
                                                    <td className="p-4 text-right text-slate-500 font-mono">{trip.kilometer ? `${trip.kilometer} km` : '-'}</td>
                                                    <td className="p-4 text-right font-black text-emerald-600">{Number(trip.amount).toLocaleString('tr-TR')} ₺</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default VehicleProfileModal;
