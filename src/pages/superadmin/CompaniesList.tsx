import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LogIn, Edit, ShieldAlert, Eye, X, Users, Bus, GraduationCap, School, Route, DollarSign } from 'lucide-react';

interface Company {
  id: string;
  company_name: string;
  city: string | null;
  subscription_status: string;
  subscription_tier: string;
  created_at: string;
  owner_id: string;
  owner_email: string;
}

interface CompanyDetails {
  users_count: number;
  drivers_count: number;
  vehicles_count: number;
  students_count: number;
  schools_count: number;
  routes_count: number;
  payments_total: number;
  expenses_total: number;
}

export default function CompaniesList() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ tier: 'free', status: 'active' });

  // Details Modal State
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [details, setDetails] = useState<CompanyDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('sa_get_all_companies');
      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (companyId: string) => {
    if (window.confirm("Bu şirketin adına giriş yapmak istediğinize emin misiniz? (Kendi panelinize dönmek için çıkış yapıp tekrar girmeli veya kendi şirketinizi bulup adına giriş yapmalısınız)")) {
      try {
        const { error } = await supabase.rpc('sa_impersonate_company', { p_target_company_id: companyId });
        if (error) throw error;
        window.location.href = '/dashboard';
      } catch (err) {
        console.error('Error impersonating:', err);
        alert('Giriş yapılamadı.');
      }
    }
  };

  const handleUpdate = async (companyId: string) => {
    try {
      const { error } = await supabase.rpc('sa_update_company_subscription', {
        p_company_id: companyId,
        p_tier: editForm.tier,
        p_status: editForm.status
      });
      if (error) throw error;
      setEditingId(null);
      fetchCompanies();
    } catch (err) {
      console.error('Error updating:', err);
      alert('Güncelleme başarısız.');
    }
  };

  const openDetailsModal = async (company: Company) => {
    setSelectedCompany(company);
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase.rpc('sa_get_company_details', { p_company_id: company.id });
      if (error) throw error;
      setDetails(data as CompanyDetails);
    } catch (err) {
      console.error('Error getting company details:', err);
      alert('Şirket detayları yüklenemedi.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailsModal = () => {
    setSelectedCompany(null);
    setDetails(null);
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-600 font-medium">Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Şirket Yönetimi</h1>
          <p className="text-slate-600">Platformdaki tüm şirketleri (tenantları) görüntüleyin ve yönetin.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-medium">Şirket Adı</th>
                <th className="p-4 font-medium">Sahibi (Email)</th>
                <th className="p-4 font-medium">Paket</th>
                <th className="p-4 font-medium">Durum</th>
                <th className="p-4 font-medium">Kayıt Tarihi</th>
                <th className="p-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <button 
                      onClick={() => openDetailsModal(company)}
                      className="font-semibold text-slate-900 hover:text-primary transition-colors text-left outline-none"
                    >
                      {company.company_name}
                    </button>
                    <p className="text-xs text-slate-500">{company.city || '-'}</p>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">
                    {company.owner_email || company.owner_id.substring(0, 8) + '...'}
                  </td>
                  <td className="p-4">
                    {editingId === company.id ? (
                      <select 
                        value={editForm.tier} 
                        onChange={(e) => setEditForm({...editForm, tier: e.target.value})}
                        className="border border-slate-300 rounded p-1 text-sm focus:ring-primary focus:border-primary"
                      >
                        <option value="free">Free</option>
                        <option value="premium">Premium</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        company.subscription_tier === 'premium' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {company.subscription_tier.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {editingId === company.id ? (
                      <select 
                        value={editForm.status} 
                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                        className="border border-slate-300 rounded p-1 text-sm focus:ring-primary focus:border-primary"
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        company.subscription_status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {company.subscription_status.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-slate-600">
                    {new Date(company.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {editingId === company.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleUpdate(company.id)}
                          className="text-xs bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 font-bold"
                        >
                          Kaydet
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="text-xs bg-slate-200 text-slate-700 px-3 py-1.5 rounded hover:bg-slate-300 font-bold"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => openDetailsModal(company)}
                          className="text-slate-400 hover:text-primary transition-colors inline-flex p-1.5 rounded-lg hover:bg-slate-100"
                          title="Detayları Gör"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingId(company.id);
                            setEditForm({ tier: company.subscription_tier, status: company.subscription_status });
                          }}
                          className="text-slate-400 hover:text-primary transition-colors inline-flex p-1.5 rounded-lg hover:bg-slate-100"
                          title="Abonelik Düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleImpersonate(company.id)}
                          className="text-slate-400 hover:text-amber-600 transition-colors inline-flex p-1.5 rounded-lg hover:bg-slate-100"
                          title="Adına Giriş Yap (Login As)"
                        >
                          <LogIn className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              
              {companies.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Henüz kayıtlı şirket bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
        <ShieldAlert className="h-5 w-5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-semibold mb-1">"Adına Giriş Yap" Özelliği Hakkında</p>
          <p>
            Bir şirketin adına giriş yaptığınızda (Login As), sistem sizi geçici olarak o şirketin sahibi gibi tanır ve Dashboard'da o şirketin verilerini görürsünüz. Süper Admin yetkilerinizle tekrar asıl şirketinize dönmek için çıkış yapıp kendi admin hesabınızla tekrar giriş yapmalısınız.
          </p>
        </div>
      </div>

      {/* Details Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-950 text-white">
              <div>
                <h3 className="font-bold text-lg">{selectedCompany.company_name}</h3>
                <p className="text-xs text-slate-400">{selectedCompany.city || 'Şehir belirtilmemiş'}</p>
              </div>
              <button 
                onClick={closeDetailsModal}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-slate-500 mt-3 font-medium">Şirket verileri yükleniyor...</p>
                </div>
              ) : details ? (
                <div className="space-y-6">
                  {/* Info grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Kullanıcılar', value: details.users_count, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Okullar', value: details.schools_count, icon: School, color: 'text-violet-600', bg: 'bg-violet-50' },
                      { label: 'Şoförler', value: details.drivers_count, icon: Bus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Araçlar', value: details.vehicles_count, icon: Bus, color: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: 'Öğrenciler', value: details.students_count, icon: GraduationCap, color: 'text-pink-600', bg: 'bg-pink-50' },
                      { label: 'Güzergahlar', value: details.routes_count, icon: Route, color: 'text-cyan-600', bg: 'bg-cyan-50' }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${item.bg}`}>
                          <item.icon className={`h-5 w-5 ${item.color}`} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                          <h4 className="text-lg font-bold text-slate-900">{item.value}</h4>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial Overview */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                      Mali Durum
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3 border border-slate-100">
                        <p className="text-xs text-slate-500 font-medium">Toplam Tahsil Edilen (Gelir)</p>
                        <p className="text-xl font-bold text-emerald-600 mt-1">{formatMoney(details.payments_total)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-100">
                        <p className="text-xs text-slate-500 font-medium">Toplam Giderler</p>
                        <p className="text-xl font-bold text-rose-600 mt-1">{formatMoney(details.expenses_total)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Meta details */}
                  <div className="text-xs text-slate-500 border-t border-slate-100 pt-4 flex flex-col gap-1.5">
                    <p><span className="font-semibold">Şirket ID:</span> {selectedCompany.id}</p>
                    <p><span className="font-semibold">Kurucu ID:</span> {selectedCompany.owner_id}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">Detaylar yüklenemedi.</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => handleImpersonate(selectedCompany.id)}
                className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-amber-600 transition"
              >
                <LogIn className="h-4 w-4" />
                Adına Giriş Yap
              </button>
              <button 
                onClick={closeDetailsModal}
                className="bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm hover:bg-slate-300 transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
