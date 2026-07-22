import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Users, Bus, GraduationCap, DollarSign, Activity, Route, TrendingUp, TrendingDown } from 'lucide-react';

interface GrowthData {
  month: string;
  count?: number;
  amount?: number;
}

interface AdvancedStats {
  total_companies: number;
  total_users: number;
  total_students: number;
  total_vehicles: number;
  total_drivers: number;
  total_routes: number;
  total_schools: number;
  premium_companies: number;
  free_companies: number;
  mrr: number;
  total_payments: number;
  total_expenses: number;
  company_growth: GrowthData[];
  payment_growth: GrowthData[];
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('sa_get_advanced_stats');
      if (error) throw error;
      setStats(data as AdvancedStats);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.message || 'İstatistikler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-600 font-medium">Yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-500 p-4 rounded-xl border border-red-200">
          <p className="font-bold">Hata oluştu:</p>
          <p>{error}</p>
          <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition">Tekrar Dene</button>
        </div>
      </div>
    );
  }

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  };

  // Safe max values for SVG scaling
  const maxCompanyCount = Math.max(...(stats?.company_growth.map(g => g.count || 0) || [1]), 1);
  const maxPaymentAmount = Math.max(...(stats?.payment_growth.map(g => g.amount || 0) || [1]), 1);

  // SVG dimensions for Line Chart
  const lineChartWidth = 500;
  const lineChartHeight = 150;
  const companyPoints = stats?.company_growth.map((g, idx) => {
    const x = (idx / Math.max(stats.company_growth.length - 1, 1)) * (lineChartWidth - 40) + 20;
    const y = lineChartHeight - ((g.count || 0) / maxCompanyCount) * (lineChartHeight - 40) - 20;
    return `${x},${y}`;
  }).join(' ') || '';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Süper Admin Paneli</h1>
          <p className="text-slate-600">ServisBot platformu genel durumu, SaaS gelirleri ve büyüme istatistikleri.</p>
        </div>
        <button
          onClick={fetchStats}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
        >
          <Activity className="h-4 w-4" />
          Verileri Yenile
        </button>
      </div>

      {/* Main SaaS Finance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-900 flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400 font-medium">Aylık Tekrarlayan Gelir (MRR)</span>
            <div className="p-2 bg-slate-800 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold">{formatMoney(stats?.mrr || 0)}</h3>
            <p className="text-xs text-slate-400 mt-2">Premium şirket aboneliklerinden toplam.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">Platform İçi Ödemeler (Ciro)</span>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900">{formatMoney(stats?.total_payments || 0)}</h3>
            <p className="text-xs text-slate-500 mt-2">Tüm şirketlerin topladığı toplam ödeme.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">Platform İçi Giderler</span>
            <div className="p-2 bg-rose-50 rounded-lg">
              <TrendingDown className="h-5 w-5 text-rose-600" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900">{formatMoney(stats?.total_expenses || 0)}</h3>
            <p className="text-xs text-slate-500 mt-2">Şirketlerin eklediği toplam gider miktarı.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">Aktif Servis Güzergahı</span>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Route className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900">{stats?.total_routes || 0}</h3>
            <p className="text-xs text-slate-500 mt-2">Şu an aktif planlanan rota sayısı.</p>
          </div>
        </div>
      </div>

      {/* Operational Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Şirketler', count: stats?.total_companies, icon: Building2, color: 'text-blue-600' },
          { label: 'Kullanıcılar', count: stats?.total_users, icon: Users, color: 'text-emerald-600' },
          { label: 'Şoförler', count: stats?.total_drivers, icon: Bus, color: 'text-violet-600' },
          { label: 'Öğrenciler', count: stats?.total_students, icon: GraduationCap, color: 'text-amber-600' }
        ].map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg bg-slate-50`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">{item.label}</p>
              <h4 className="text-lg font-bold text-slate-900">{item.count || 0}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Company Registration Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Şirket Kayıt Artış Trendi</h3>
              <p className="text-xs text-slate-500">Son 6 ayda sisteme katılan yeni kiracılar</p>
            </div>
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">Dinamik</span>
          </div>

          <div className="relative w-full overflow-hidden">
            {stats && stats.company_growth.length > 0 ? (
              <svg viewBox={`0 0 ${lineChartWidth} ${lineChartHeight}`} className="w-full h-auto overflow-visible">
                {/* Y-axis grid lines */}
                {[0, 0.5, 1].map((p, i) => {
                  const y = lineChartHeight - p * (lineChartHeight - 40) - 20;
                  return (
                    <line key={i} x1="20" y1={y} x2={lineChartWidth - 20} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  );
                })}
                
                {/* Area Gradient under Line */}
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 20,${lineChartHeight - 20} ${companyPoints.replace(/(\d+),(\d+)/g, 'L $1,$2')} L ${lineChartWidth - 20},${lineChartHeight - 20} Z`}
                  fill="url(#gradient)"
                />

                {/* Line Path */}
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  points={companyPoints}
                />
                
                {/* Data Points */}
                {stats.company_growth.map((g, idx) => {
                  const x = (idx / Math.max(stats.company_growth.length - 1, 1)) * (lineChartWidth - 40) + 20;
                  const y = lineChartHeight - ((g.count || 0) / maxCompanyCount) * (lineChartHeight - 40) - 20;
                  return (
                    <g key={idx} className="group cursor-pointer">
                      <circle cx={x} cy={y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                      <text x={x} y={y - 8} textAnchor="middle" className="text-[10px] font-bold fill-slate-700 hidden group-hover:block">{g.count}</text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Veri bulunamadı.</div>
            )}
          </div>
          
          <div className="flex justify-between px-4 text-xs font-semibold text-slate-500">
            {stats?.company_growth.map((g, idx) => (
              <span key={idx}>{g.month}</span>
            ))}
          </div>
        </div>

        {/* Subscription Tier Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Abonelik Dağılımı</h3>
            <p className="text-xs text-slate-500">Free vs Premium Şirket Oranı</p>
          </div>

          <div className="flex flex-col items-center justify-center my-6 space-y-4">
            <div className="relative flex items-center justify-center w-32 h-32">
              {/* Circular Gauge */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="50" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                {stats && stats.total_companies > 0 && (
                  <circle 
                    cx="64" 
                    cy="64" 
                    r="50" 
                    fill="transparent" 
                    stroke="#3b82f6" 
                    strokeWidth="12" 
                    strokeDasharray={2 * Math.PI * 50}
                    strokeDashoffset={2 * Math.PI * 50 * (1 - (stats.premium_companies / stats.total_companies))}
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center text-center">
                <span className="text-2xl font-extrabold text-slate-900">
                  {stats && stats.total_companies > 0 ? Math.round((stats.premium_companies / stats.total_companies) * 100) : 0}%
                </span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Premium</span>
              </div>
            </div>

            <div className="w-full space-y-2">
              <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span>Premium</span>
                </div>
                <span className="font-bold text-slate-950">{stats?.premium_companies || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-slate-200 rounded-full"></span>
                  <span>Free</span>
                </div>
                <span className="font-bold text-slate-950">{stats?.free_companies || 0}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Transaction volume bar chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Aylık Platform İşlem Hacmi (Ciro)</h3>
          <p className="text-xs text-slate-500">Son 6 ayda platform üzerinden tamamlanan ödemeler</p>
        </div>

        <div className="h-48 flex items-end justify-between gap-4 pt-6 px-4 border-b border-slate-100">
          {stats && stats.payment_growth.length > 0 ? (
            stats.payment_growth.map((g, idx) => {
              const heightPercent = maxPaymentAmount > 1 ? ((g.amount || 0) / maxPaymentAmount) * 100 : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatMoney(g.amount || 0)}
                  </div>
                  <div 
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                    className="w-full max-w-[60px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg group-hover:from-emerald-700 group-hover:to-emerald-500 transition-all duration-300 shadow-sm"
                  />
                  <div className="text-xs font-semibold text-slate-500 mt-1">{g.month}</div>
                </div>
              );
            })
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Ödeme verisi bulunamadı.</div>
          )}
        </div>
      </div>
    </div>
  );
}
