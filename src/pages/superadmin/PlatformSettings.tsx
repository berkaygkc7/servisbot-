import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, AlertCircle, ShieldAlert, CheckCircle, Mail, Settings2, ShieldCheck } from 'lucide-react';

interface PlatformSettingsData {
  premium_price: number;
  support_email: string;
  is_maintenance_mode: boolean;
  free_tier_max_users: number;
  free_tier_max_vehicles: number;
  free_tier_max_students: number;
}

export default function PlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('sa_get_platform_settings');
      if (error) throw error;
      setSettings(data as PlatformSettingsData);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.message || 'Sistem ayarları yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.rpc('sa_update_platform_settings', {
        p_premium_price: Number(settings.premium_price),
        p_support_email: settings.support_email,
        p_is_maintenance_mode: settings.is_maintenance_mode,
        p_free_tier_max_users: Number(settings.free_tier_max_users),
        p_free_tier_max_vehicles: Number(settings.free_tier_max_vehicles),
        p_free_tier_max_students: Number(settings.free_tier_max_students),
      });

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setError(err.message || 'Ayarlar kaydedilirken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sistem Ayarları</h1>
        <p className="text-slate-600">ServisBot platform-geneli global limitleri, fiyatlandırma ve durum ayarları.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>Sistem ayarları başarıyla güncellendi.</p>
        </div>
      )}

      {settings && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Settings2 className="h-6 w-6 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-900">SaaS & Fiyatlandırma Ayarları</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Premium Üyelik Aylık Ücreti (TL)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-medium">₺</span>
                  <input
                    type="number"
                    required
                    min="0"
                    value={settings.premium_price}
                    onChange={(e) => setSettings({ ...settings, premium_price: Number(e.target.value) })}
                    className="block w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Platform genelinde Premium olan şirketlerin MRR hesaplamasında baz alınır.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Platform Destek E-postası</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={settings.support_email}
                    onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <ShieldCheck className="h-6 w-6 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-900">Ücretsiz Paket (Free Tier) Limitleri</h2>
            </div>

            <p className="text-sm text-slate-600">Ücretsiz paketteki kiracı şirketlerin oluşturabileceği maksimum kayıt limitleri.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Maks. Kullanıcı Sınırı</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={settings.free_tier_max_users}
                  onChange={(e) => setSettings({ ...settings, free_tier_max_users: Number(e.target.value) })}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Maks. Araç Sınırı</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={settings.free_tier_max_vehicles}
                  onChange={(e) => setSettings({ ...settings, free_tier_max_vehicles: Number(e.target.value) })}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Maks. Öğrenci Sınırı</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={settings.free_tier_max_students}
                  onChange={(e) => setSettings({ ...settings, free_tier_max_students: Number(e.target.value) })}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <ShieldAlert className="h-6 w-6 text-red-500" />
              <h2 className="text-lg font-bold text-slate-900">Kritik Sistem Ayarları</h2>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Sistem Bakım Modu (Maintenance Mode)</h3>
                <p className="text-xs text-slate-500 mt-0.5">Açıldığında normal şirket kullanıcıları sistemde işlem yapamaz, sadece bilgi ekranı görür.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.is_maintenance_mode}
                  onChange={(e) => setSettings({ ...settings, is_maintenance_mode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-slate-950 text-white font-bold px-6 py-3 rounded-xl hover:bg-slate-850 transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
