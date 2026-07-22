import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, ShieldAlert, ShieldCheck, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface UserData {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  is_superadmin: boolean;
  company_name: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('sa_get_all_users');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (userId === currentUser?.id) {
      alert("Kendi yetkinizi kaldıramazsınız.");
      return;
    }

    const confirmMsg = currentStatus 
        ? "Bu kullanıcının Süper Admin yetkisini kaldırmak istediğinize emin misiniz?" 
        : "Bu kullanıcıya Süper Admin yetkisi vermek istediğinize emin misiniz? Sistemdeki tüm şirketleri görebilecektir.";
        
    if (window.confirm(confirmMsg)) {
      try {
        const { error } = await supabase.rpc('sa_toggle_admin', { 
            p_user_id: userId, 
            p_is_superadmin: !currentStatus 
        });
        if (error) throw error;
        
        // Update local state
        setUsers(users.map(u => u.id === userId ? { ...u, is_superadmin: !currentStatus } : u));
      } catch (err) {
        console.error('Error toggling admin:', err);
        alert('İşlem başarısız oldu.');
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="p-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Yönetici Yönetimi</h1>
          <p className="text-slate-600">Platformdaki kişilere süper admin yetkisi verin veya alın.</p>
        </div>
        
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
                type="text"
                placeholder="İsim, e-posta veya şirket ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary w-full md:w-80"
            />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-medium">Kullanıcı Adı</th>
                <th className="p-4 font-medium">E-posta</th>
                <th className="p-4 font-medium">Şirket</th>
                <th className="p-4 font-medium">Yetki Durumu</th>
                <th className="p-4 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.is_superadmin ? 'bg-amber-50/30' : ''}`}>
                  <td className="p-4 font-medium text-slate-900">
                    {u.full_name}
                    {u.id === currentUser?.id && <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">Sen</span>}
                  </td>
                  <td className="p-4 text-slate-600">{u.email || '-'}</td>
                  <td className="p-4 text-slate-600">{u.company_name}</td>
                  <td className="p-4">
                    {u.is_superadmin ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Süper Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        <Shield className="h-3.5 w-3.5" />
                        Normal Kullanıcı
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                        onClick={() => handleToggleAdmin(u.id, u.is_superadmin)}
                        disabled={u.id === currentUser?.id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            u.is_superadmin 
                                ? 'bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed'
                                : 'bg-primary text-white hover:bg-blue-600'
                        }`}
                    >
                        {u.is_superadmin ? 'Yetkiyi Al' : 'Admin Yap'}
                    </button>
                  </td>
                </tr>
              ))}
              
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Kullanıcı bulunamadı.
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
          <p className="font-semibold mb-1">Güvenlik Uyarısı</p>
          <p>
            Süper Admin yetkisi verdiğiniz kişiler sistemdeki **tüm şirketleri, araçları ve finansal verileri** görebilir ve şirketlerin aboneliklerini değiştirebilirler. Lütfen sadece güvendiğiniz kişilere yetki verin. Kendi yetkinizi yanlışlıkla kaldıramazsınız.
          </p>
        </div>
      </div>
    </div>
  );
}
