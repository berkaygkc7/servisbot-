import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, TrendingUp, DollarSign, Users, Bus } from 'lucide-react';
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';

const FinancialReports: React.FC = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [financialData, setFinancialData] = useState<any[]>([]);
    const [registrationData, setRegistrationData] = useState<any[]>([]);

    // New state for Capacity Utilization
    const [capacityData, setCapacityData] = useState<any[]>([]);
    const [capacityStats, setCapacityStats] = useState({ totalSeats: 0, usedSeats: 0, emptySeats: 0, utilPercentage: 0 });

    // New state for Payment Distribution
    const [paymentData, setPaymentData] = useState<any[]>([]);
    const [paymentStats, setPaymentStats] = useState({ toplanan: 0, bekleyen: 0, gecikmis: 0, toplananPercentage: 0 });

    useEffect(() => {
        if (!profile?.company_id) return;
        fetchData();

        // Setup realtime
        const paymentsChannel = supabase.channel('public:payments_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchData)
            .subscribe();

        const expensesChannel = supabase.channel('public:expenses_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData)
            .subscribe();

        const studentsChannel = supabase.channel('public:students_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchData)
            .subscribe();

        const vehiclesChannel = supabase.channel('public:vehicles_capacity_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(paymentsChannel);
            supabase.removeChannel(expensesChannel);
            supabase.removeChannel(studentsChannel);
            supabase.removeChannel(vehiclesChannel);
        };
    }, [profile?.company_id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Generate last 6 months for labels
            const formatter = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });

            const months = Array.from({ length: 6 }).map((_, i) => {
                const d = subMonths(new Date(), 5 - i);
                const rawMonthStr = formatter.format(d);
                const capitalizedMonthStr = rawMonthStr.charAt(0).toUpperCase() + rawMonthStr.slice(1);

                return {
                    date: d,
                    label: format(d, 'MMMM', { locale: tr }),
                    labelShort: format(d, 'MMM', { locale: tr }),
                    year: d.getFullYear(),
                    monthStr: capitalizedMonthStr, // Match 'Ocak 2026' format exactly
                    start: startOfMonth(d),
                    end: endOfMonth(d)
                };
            });

            // 1. Get Payments (Income & Receivables)
            const { data: payments } = await supabase
                .from('payments')
                .select('*')
                .eq('company_id', profile?.company_id || '');

            // 2. Get Expenses
            const { data: expenses } = await supabase
                .from('expenses')
                .select('*')
                .eq('company_id', profile?.company_id || '')
                .eq('status', 'paid');

            // 3. Get Student Registrations
            const { data: students } = await supabase
                .from('students')
                .select('created_at, registration_date, status, vehicle_id')
                .eq('company_id', profile?.company_id || '');

            // 4. Get Vehicles for Capacity
            const { data: vehicles } = await supabase
                .from('vehicles')
                .select('id, capacity, status')
                .eq('company_id', profile?.company_id || '')
                .eq('status', 'active');

            // Process Financials (Income vs Expense)
            const finData = months.map(m => {
                let gelir = 0;
                if (payments) {
                    gelir = payments
                        .filter(p => p.month === m.monthStr && p.status === 'Ödendi')
                        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                }

                let gider = 0;
                if (expenses) {
                    gider = expenses
                        .filter(v => {
                            if (!v.expense_date) return false;
                            const d = parseISO(v.expense_date);
                            return d >= m.start && d <= m.end;
                        })
                        .reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
                }

                return {
                    name: m.labelShort,
                    fullMonth: m.label,
                    Gelir: gelir,
                    Gider: gider,
                    Net: gelir - gider
                };
            });

            setFinancialData(finData);

            // Process Student Registrations
            const regData = months.map(m => {
                let count = 0;
                if (students) {
                    count = students.filter(s => {
                        const dateStr = s.registration_date || s.created_at;
                        if (!dateStr) return false;
                        const d = parseISO(dateStr);
                        return d >= m.start && d <= m.end;
                    }).length;
                }
                return {
                    name: m.labelShort,
                    'Yeni Kayıt': count
                };
            });

            setRegistrationData(regData);

            // Process Capacity Utilization
            let totalSeats = 0;
            if (vehicles) {
                totalSeats = vehicles.reduce((sum, v) => sum + (Number(v.capacity) || 16), 0);
            }

            let usedSeats = 0;
            if (students) {
                // Count active students who are assigned to any vehicle
                usedSeats = students.filter(s => s.status === 'active' && s.vehicle_id != null).length;
            }

            // Safeguard against overbooking data visually breaking things, though overbooking is possible.
            const emptySeats = Math.max(0, totalSeats - usedSeats);
            const utilPercentage = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;

            setCapacityStats({
                totalSeats,
                usedSeats,
                emptySeats,
                utilPercentage
            });

            setCapacityData([
                { name: 'Dolu Koltuklar', value: usedSeats, color: '#3b82f6' }, // blue
                { name: 'Boş Koltuklar', value: emptySeats, color: '#e2e8f0' } // light slate
            ]);

            // Process Payment Distribution
            let toplanan = 0;
            let bekleyen = 0;
            let gecikmis = 0;

            if (payments) {
                payments.forEach(p => {
                    const amt = Number(p.amount) || 0;
                    if (p.status === 'Ödendi') toplanan += amt;
                    else if (p.status === 'Bekliyor') bekleyen += amt;
                    else if (p.status === 'Gecikmiş') gecikmis += amt;
                });
            }

            const totalAmount = toplanan + bekleyen + gecikmis;
            const toplananPercentage = totalAmount > 0 ? Math.round((toplanan / totalAmount) * 100) : 0;

            setPaymentStats({ toplanan, bekleyen, gecikmis, toplananPercentage });

            setPaymentData([
                { name: 'Toplanan', value: toplanan, color: '#10b981' }, // emerald
                { name: 'Bekleyen', value: bekleyen, color: '#f59e0b' }, // amber
                { name: 'Gecikmiş', value: gecikmis, color: '#ef4444' }  // red
            ]);

        } catch (error) {
            console.error('Error fetching dashboard reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 premium-card animate-pulse">
                <Loader2 className="animate-spin text-secondary" size={32} />
            </div>
        );
    }

    // Totals for the current month
    const currentMonthFinances = financialData[financialData.length - 1] || { Gelir: 0, Gider: 0, Net: 0 };

    const profitMargin = currentMonthFinances.Gelir > 0
        ? Math.round((currentMonthFinances.Net / currentMonthFinances.Gelir) * 100)
        : 0;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-lg shadow-slate-200/50">
                    <p className="font-bold text-slate-800 mb-2">{label || payload[0].name}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm font-medium">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.payload.color }} />
                            <span className="text-slate-500">{entry.name}:</span>
                            <span className={
                                entry.name === 'Net' ? (entry.value >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-800'
                            }>
                                {entry.value.toLocaleString('tr-TR')} {entry.name === 'Gelir' || entry.name === 'Gider' || entry.name === 'Net' ? '₺' : 'Kişi'}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-fade-in mt-6">
            <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-secondary" size={24} />
                <h2 className="text-xl font-bold text-slate-800">Gelişmiş Finans ve İstatistikler</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">

                {/* FINANCIAL CHART */}
                <div className="premium-card p-6 flex flex-col animate-fade-up stagger-1 col-span-1 md:col-span-2 lg:col-span-1">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Gelir & Gider Analizi</h3>
                            <p className="text-sm text-slate-500">Son 6 aylık finansal durumuz (Ödemeler - Bakım/Gider)</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl flex items-center gap-3 border border-slate-100">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bu Ayki Net Kâr</p>
                                <p className={`text-base font-black ${currentMonthFinances.Net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {currentMonthFinances.Net > 0 ? '+' : ''}{currentMonthFinances.Net.toLocaleString('tr-TR')} ₺
                                </p>
                            </div>
                            <div className={`p-2 rounded-lg ${currentMonthFinances.Net >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                <DollarSign size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="h-72 w-full mt-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={financialData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorGider" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `₺${value / 1000}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                {/* Recharts renders in order. We use low fillOpacity so overlaps don't hide the lines. */}
                                <Area type="monotone" dataKey="Gider" stroke="#f43f5e" strokeWidth={3} fillOpacity={0.6} fill="url(#colorGider)" activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Area type="monotone" dataKey="Gelir" stroke="#10b981" strokeWidth={3} fillOpacity={0.6} fill="url(#colorGelir)" activeDot={{ r: 6, strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* STUDENTS CHART */}
                <div className="premium-card p-6 flex flex-col animate-fade-up stagger-2">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Öğrenci Kayıtları</h3>
                            <p className="text-sm text-slate-500">Aylık yeni kayıt trendi</p>
                        </div>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Users size={18} />
                        </div>
                    </div>

                    <div className="h-64 w-full mt-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={registrationData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="Yeni Kayıt" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Insights */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bu Ayki Kâr Marjı</p>
                            <div className="flex items-center gap-1 mt-1">
                                <span className={`text-lg font-black ${profitMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {profitMargin}%
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Durum</p>
                            <span className={`inline-block mt-1 px-2.5 py-1 rounded-md text-xs font-bold ${profitMargin > 20 ? 'bg-emerald-100 text-emerald-700' :
                                profitMargin > 0 ? 'bg-blue-100 text-blue-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                {profitMargin > 20 ? 'Mükemmel 👍' : profitMargin > 0 ? 'İyi 👏' : 'Dikkat İster ⚠️'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* PAYMENT DISTRIBUTION CHART (DONUT) */}
                <div className="premium-card p-6 flex flex-col animate-fade-up stagger-3 col-span-1 md:col-span-2">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Tahsilat Durumu</h3>
                            <p className="text-sm text-slate-500">Genel ödeme istatistikleri</p>
                        </div>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <DollarSign size={18} />
                        </div>
                    </div>

                    <div className="h-56 w-full relative mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={paymentData}
                                    innerRadius="65%"
                                    outerRadius="90%"
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {paymentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Centered Percentage */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-slate-800">{paymentStats.toplananPercentage}%</span>
                            <span className="text-xs text-slate-400 font-medium">Bitti</span>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <span className="text-xs font-medium text-slate-500">Bekleyen</span>
                            </div>
                            <p className="text-base font-bold text-slate-800">₺{paymentStats.bekleyen.toLocaleString('tr-TR')}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-xs font-medium text-slate-500">Gecikmiş</span>
                            </div>
                            <p className="text-base font-bold text-slate-800">₺{paymentStats.gecikmis.toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                </div>

                {/* CAPACITY UTILIZATION CHART (DONUT) */}
                <div className="premium-card p-6 pr-6 flex flex-col animate-fade-up stagger-4 col-span-1 md:col-span-2">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Kapasite Kullanımı</h3>
                            <p className="text-sm text-slate-500">Araç doluluk oranları</p>
                        </div>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Users size={18} />
                        </div>
                    </div>

                    <div className="h-56 w-full relative mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={capacityData}
                                    innerRadius="65%"
                                    outerRadius="90%"
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {capacityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Centered Percentage */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-slate-800">{capacityStats.utilPercentage}%</span>
                            <span className="text-xs text-slate-400 font-medium">Dolu</span>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-xs font-medium text-slate-500">Dolu Koltuklar</span>
                            </div>
                            <p className="text-xl font-bold text-slate-800">{capacityStats.usedSeats}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                                <span className="text-xs font-medium text-slate-500">Boş Koltuklar</span>
                            </div>
                            <p className="text-xl font-bold text-slate-800">{capacityStats.emptySeats}</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FinancialReports;
