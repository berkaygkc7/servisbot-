import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { supabaseSecondary } from '../../lib/supabaseSecondary';
import { LogIn, Edit, ShieldAlert, Eye, X, Users, Bus, GraduationCap, School, Route, DollarSign, Plus, Loader2, Building, Mail, User, KeyRound, MapPin } from 'lucide-react';
import { TURKISH_CITIES } from '../../constants/cities';

interface Company {
  id: string;
  company_name: string;
  city: string | null;
  subscription_status: string;
  subscription_tier: string;
  created_at: string;
  owner_id: string;
  owner_email: string;
  details?: CompanyDetails; // Added to store details directly on the company object
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

  // New Client Modal State
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isSubmittingNewClient, setIsSubmittingNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    companyName: '',
    fullName: '',
    email: '',
    password: '',
    city: '',
    subscriptionTier: 'premium'
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('sa_get_all_companies');
      if (error) throw error;
      
      const rawCompanies = data || [];
      
      // Fetch details for all companies in parallel
      const companiesWithDetails = await Promise.all(
        rawCompanies.map(async (company: Company) => {
          try {
            const { data: detailsData, error: detailsError } = await supabase.rpc('sa_get_company_details', { p_company_id: company.id });
            if (!detailsError && detailsData) {
              return { ...company, details: detailsData as CompanyDetails };
            }
          } catch (e) {
            console.error(`Error fetching details for company ${company.id}`, e);
          }
          return company;
        })
      );
      
      setCompanies(companiesWithDetails);
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

  const handleCreateNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingNewClient(true);

    try {
      // 1. Create auth user with secondary client to avoid logging out Super Admin
      const { data: authData, error: authError } = await supabaseSecondary.auth.signUp({
          email: newClientForm.email,
          password: newClientForm.password,
          options: {
              data: {
                  full_name: newClientForm.fullName
              }
          }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Kullanıcı oluşturulamadı.");

      // Small delay to ensure Auth user is fully committed in Supabase DB
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. Call the RPC to create Company and Profile atomically
      const { error: registrationError } = await supabase.rpc('register_company', {
          p_user_id: authData.user.id,
          p_company_name: newClientForm.companyName,
          p_full_name: newClientForm.fullName,
          p_city: newClientForm.city,
          p_subscription_tier: newClientForm.subscriptionTier
      });

      if (registrationError) throw registrationError;

      alert(`Başarılı! ${newClientForm.companyName} firması sisteme eklendi ve müşteri hesabı oluşturuldu.`);
      
      setIsNewClientModalOpen(false);
      setNewClientForm({
        companyName: '', fullName: '', email: '', password: '', city: '', subscriptionTier: 'premium'
      });
      
      fetchCompanies();

    } catch (error: any) {
      console.error('Error creating new client:', error);
      alert(`Müşteri hesabı oluşturulurken bir hata meydana geldi: ${error.message || 'Bilinmeyen Hata'}`);
    } finally {
      setIsSubmittingNewClient(false);
    }
  };

  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-600 font-medium">Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Şirket Yönetimi</h1>
          <p className="text-slate-600">Sistemi lisansladığınız müşterilerinizi (şirketleri) ekleyin ve yönetin.</p>
        </div>
        <button 
          onClick={() => setIsNewClientModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Yeni Müşteri Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-medium">Şirket / Kurucu</th>
                <th className="p-4 font-medium">Paket & Durum</th>
                <th className="p-4 font-medium">Operasyon (Kapasite)</th>
                <th className="p-4 font-medium">Finans (Gelir / Gider)</th>
                <th className="p-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <button 
                      onClick={() => openDetailsModal(company)}
                      className="font-bold text-slate-900 hover:text-primary transition-colors text-left outline-none text-base block"
                    >
                      {company.company_name}
                    </button>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <MapPin size={12} /> {company.city || 'Şehir Yok'}
                      </span>
                      <span className="text-xs text-slate-400" title="Kayıt Tarihi">
                        {new Date(company.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                      <User size={12} />
                      {company.owner_email || company.owner_id.substring(0, 8) + '...'}
                    </p>
                  </td>
                  
                  <td className="p-4 space-y-2">
                    {editingId === company.id ? (
                      <div className="flex flex-col gap-2">
                        <select 
                          value={editForm.tier} 
                          onChange={(e) => setEditForm({...editForm, tier: e.target.value})}
                          className="border border-slate-300 rounded p-1 text-sm focus:ring-primary focus:border-primary"
                        >
                          <option value="free">Free</option>
                          <option value="premium">Premium</option>
                        </select>
                        <select 
                          value={editForm.status} 
                          onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                          className="border border-slate-300 rounded p-1 text-sm focus:ring-primary focus:border-primary"
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider font-bold ${
                          company.subscription_tier === 'premium' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {company.subscription_tier}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider font-bold ${
                          company.subscription_status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {company.subscription_status}
                        </span>
                      </div>
                    )}
                  </td>
                  
                  <td className="p-4">
                    {company.details ? (
                      <div className="flex flex-wrap gap-2 max-w-[250px]">
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-100" title="Öğrenci Sayısı">
                          <GraduationCap size={14} />
                          {company.details.students_count}
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-semibold border border-emerald-100" title="Araç Sayısı">
                          <Bus size={14} />
                          {company.details.vehicles_count}
                        </div>
                        <div className="flex items-center gap-1.5 bg-violet-50 text-violet-700 px-2.5 py-1 rounded-lg text-xs font-semibold border border-violet-100" title="Şoför Sayısı">
                          <Users size={14} />
                          {company.details.drivers_count}
                        </div>
                        <div className="flex items-center gap-1.5 bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-lg text-xs font-semibold border border-cyan-100" title="Güzergah Sayısı">
                          <Route size={14} />
                          {company.details.routes_count}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Veri yok</span>
                    )}
                  </td>
                  
                  <td className="p-4">
                     {company.details ? (
                      <div className="space-y-1.5">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Gelir (Tahsilat)</span>
                          <span className="text-sm font-extrabold text-emerald-600">{formatMoney(company.details.payments_total)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Giderler</span>
                          <span className="text-sm font-extrabold text-rose-600">{formatMoney(company.details.expenses_total)}</span>
                        </div>
                      </div>
                     ) : (
                      <span className="text-xs text-slate-400">Veri yok</span>
                     )}
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
                    Henüz kayıtlı şirket bulunmuyor. Yeni bir müşteri ekleyerek başlayın.
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

      {/* New Client Modal */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-950 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Yeni Müşteri (Şirket) Ekle
              </h3>
              <button 
                onClick={() => setIsNewClientModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
                <form onSubmit={handleCreateNewClient} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Firma Adı</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Building className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                required
                                value={newClientForm.companyName}
                                onChange={(e) => setNewClientForm({...newClientForm, companyName: e.target.value})}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900"
                                placeholder="Örn: Yıldız Turizm"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Firma Sahibi</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={newClientForm.fullName}
                                    onChange={(e) => setNewClientForm({...newClientForm, fullName: e.target.value})}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900"
                                    placeholder="Ad Soyad"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Şehir</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin className="h-5 w-5 text-slate-400" />
                                </div>
                                <select
                                    required
                                    value={newClientForm.city}
                                    onChange={(e) => setNewClientForm({...newClientForm, city: e.target.value})}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900"
                                >
                                    <option value="" disabled>Seçiniz</option>
                                    {TURKISH_CITIES.map(c => (
                                        <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">E-posta (Giriş ID)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="email"
                                required
                                value={newClientForm.email}
                                onChange={(e) => setNewClientForm({...newClientForm, email: e.target.value})}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900"
                                placeholder="musteri@firma.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Geçici Şifre</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <KeyRound className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                required
                                minLength={8}
                                value={newClientForm.password}
                                onChange={(e) => setNewClientForm({...newClientForm, password: e.target.value})}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900"
                                placeholder="En az 8 karakter"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 ml-1">Müşterinize bu şifreyi iletiniz. Giriş yaptıktan sonra değiştirebilirler.</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex gap-3 justify-end">
                        <button 
                            type="button"
                            onClick={() => setIsNewClientModalOpen(false)}
                            className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition"
                        >
                            İptal
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmittingNewClient}
                            className="flex items-center gap-2 bg-primary text-white font-bold px-6 py-2 rounded-xl hover:bg-blue-600 transition shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {isSubmittingNewClient ? <><Loader2 size={18} className="animate-spin" /> Oluşturuluyor</> : 'Müşteriyi Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
          </div>
        </div>
      )}

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
