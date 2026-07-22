import React, { useState, useEffect } from 'react';
import {
    Plus, Trash2, School, MapPin, Loader2, Tag as TagIcon,
    DollarSign, Settings as SettingsIcon, ShieldCheck, CreditCard, X, Building,
    Copy, Download, ExternalLink, QrCode, Users, UserPlus, Eye, EyeOff
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { supabaseSecondary } from '../lib/supabaseSecondary';
import { useAuth } from '../contexts/AuthContext';
import { TURKISH_CITIES } from '../constants/cities';

interface SchoolData {
    id: string;
    name: string;
    district: string;
    latitude: number;
    longitude: number;
}

interface TagData {
    id: string;
    name: string;
    color?: string;
}

interface PricingRule {
    id: string;
    school_level: string;
    amount: number;
}

interface TeamMember {
    id: string;
    full_name: string;
    role: string;
    email?: string;
}

type TabType = 'schools' | 'tags' | 'pricing' | 'company' | 'users';

const Settings: React.FC = () => {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('schools');

    // Data States
    const [schools, setSchools] = useState<SchoolData[]>([]);
    const [tags, setTags] = useState<TagData[]>([]);
    const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [formData, setFormData] = useState<Partial<SchoolData>>({});
    const [tagFormData, setTagFormData] = useState<Partial<TagData>>({ color: '#3b82f6' });
    const [pricingFormData, setPricingFormData] = useState<Partial<PricingRule>>({});
    const [userFormData, setUserFormData] = useState({ full_name: '', email: '', password: '', role: 'accountant' });
    const [companyName, setCompanyName] = useState(profile?.companies?.company_name || '');
    const [city, setCity] = useState(profile?.companies?.city || '');

    // Submit States
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTagSubmitting, setIsTagSubmitting] = useState(false);
    const [isPricingSubmitting, setIsPricingSubmitting] = useState(false);
    const [isCitySubmitting, setIsCitySubmitting] = useState(false);
    const [isUserSubmitting, setIsUserSubmitting] = useState(false);
    const [showUserPassword, setShowUserPassword] = useState(false);

    useEffect(() => {
        if (profile?.company_id) {
            fetchSchools();
            fetchTags();
            fetchPricingRules();
            fetchTeamMembers();
        }
    }, [profile?.company_id]);

    useEffect(() => {
        if (profile?.companies?.city) {
            setCity(profile.companies.city);
        }
        if (profile?.companies?.company_name) {
            setCompanyName(profile.companies.company_name);
        }
    }, [profile?.companies?.city, profile?.companies?.company_name]);

    const handleUpdateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.company_id) return;
        setIsCitySubmitting(true);
        try {
            const { error } = await supabase.from('companies').update({ city, company_name: companyName }).eq('id', profile.company_id);
            if (error) throw error;
            alert('Firma ayarları başarıyla güncellendi. Sayfa yenilendiğinde değişiklikler yansıyacaktır.');
        } catch (error) {
            console.error('Error updating company settings:', error);
            alert('Firma güncellenirken bir hata oluştu.');
        } finally {
            setIsCitySubmitting(false);
        }
    };

    const fetchPricingRules = async () => {
        const { data } = await supabase.from('pricing_rules').select('*').eq('company_id', profile?.company_id).order('school_level');
        if (data) setPricingRules(data);
    };

    const fetchSchools = async () => {
        setLoading(true);
        const { data } = await supabase.from('schools').select('*').eq('company_id', profile?.company_id).order('name');
        if (data) setSchools(data);
        setLoading(false);
    };

    const fetchTags = async () => {
        const { data } = await supabase.from('tags').select('*').eq('company_id', profile?.company_id).order('name');
        if (data) setTags(data);
    };

    const fetchTeamMembers = async () => {
        if (!profile?.company_id) return;
        const { data } = await supabase
            .from('users')
            .select('id, full_name, role')
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false });
        if (data) setTeamMembers(data);
    };

    const handleAddSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { error } = await supabase.from('schools').insert([{
                company_id: profile?.company_id,
                name: formData.name,
                district: formData.district,
                latitude: formData.latitude,
                longitude: formData.longitude
            }]);

            if (error) throw error;

            setFormData({});
            await fetchSchools();
            alert('Okul başarıyla eklendi.');
        } catch (error) {
            console.error('Error adding school:', error);
            alert('Okul eklenirken bir hata oluştu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSchool = async (id: string, name: string) => {
        if (!window.confirm(`${name} okulunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
            return;
        }

        try {
            const { error } = await supabase.from('schools').delete().eq('id', id);
            if (error) throw error;
            setSchools(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting school:', error);
            alert('Silme işlemi başarısız. Lütfen önce bu okula bağlı öğrencileri kontrol edin.');
        }
    };

    const handleAddTag = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsTagSubmitting(true);

        try {
            if (!tagFormData.name) {
                alert('Etiket adı zorunludur.');
                return;
            }

            const { error } = await supabase.from('tags').insert([{
                company_id: profile?.company_id,
                name: tagFormData.name,
                color: tagFormData.color || '#3b82f6'
            }]);

            if (error) throw error;

            setTagFormData({ color: '#3b82f6' });
            await fetchTags();
            alert('Etiket başarıyla eklendi.');
        } catch (error) {
            console.error('Error adding tag:', error);
            alert('Etiket eklenirken bir hata oluştu.');
        } finally {
            setIsTagSubmitting(false);
        }
    };

    const handleDeleteTag = async (id: string, name: string) => {
        if (!window.confirm(`${name} etiketini silmek istediğinize emin misiniz?`)) {
            return;
        }

        try {
            const { error } = await supabase.from('tags').delete().eq('id', id);
            if (error) throw error;
            setTags(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting tag:', error);
            alert('Silme işlemi başarısız.');
        }
    };

    const handleAddPricing = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPricingSubmitting(true);

        try {
            if (!pricingFormData.school_level || !pricingFormData.amount) {
                alert('Lütfen seviye ve tutar bilgilerini eksiksiz girin.');
                return;
            }

            const { error } = await supabase.from('pricing_rules').upsert({
                company_id: profile?.company_id,
                school_level: pricingFormData.school_level,
                amount: pricingFormData.amount,
                updated_at: new Date().toISOString()
            }, { onConflict: 'company_id,school_level' });

            if (error) throw error;

            setPricingFormData({ ...pricingFormData, amount: undefined });
            await fetchPricingRules();
            alert('Fiyatlandırma kuralı başarıyla kaydedildi.');
        } catch (error) {
            console.error('Error saving pricing rule:', error);
            alert('Fiyatlandırma kaydedilirken bir hata oluştu.');
        } finally {
            setIsPricingSubmitting(false);
        }
    };

    const handleDeletePricing = async (id: string, level: string) => {
        if (!window.confirm(`${level} seviyesi için tanımlı standart fiyatı silmek istediğinize emin misiniz?`)) {
            return;
        }

        try {
            const { error } = await supabase.from('pricing_rules').delete().eq('id', id);
            if (error) throw error;
            setPricingRules(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting pricing rule:', error);
            alert('Silme işlemi başarısız.');
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.company_id) return;
        setIsUserSubmitting(true);

        try {
            // Password strength validation (Same as Register.tsx)
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
            if (!passwordRegex.test(userFormData.password)) {
                alert('Şifreniz en az 8 karakter uzunluğunda olmalı; en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.');
                setIsUserSubmitting(false);
                return;
            }

            // 1. Create auth user with secondary client
            const { data: authData, error: authError } = await supabaseSecondary.auth.signUp({
                email: userFormData.email,
                password: userFormData.password,
                options: {
                    emailRedirectTo: `${window.location.origin}/login`,
                    data: {
                        full_name: userFormData.full_name,
                        company_id: profile.company_id
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // Small delay to ensure Auth user is fully committed in Supabase DB
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 2. Insert into public.users
                const { error: dbError } = await supabase.from('users').insert([{
                    id: authData.user.id,
                    company_id: profile.company_id,
                    full_name: userFormData.full_name,
                    role: userFormData.role
                }]);

                if (dbError) {
                    // If it's still an FK error, it might be an existing but unlinked user
                    if (dbError.code === '23503') {
                        throw new Error('Kullanıcı doğrulama hatası. Lütfen bu e-posta adresinin daha önce kullanılmadığından emin olun veya birkaç saniye sonra tekrar deneyin.');
                    }
                    throw dbError;
                }

                alert(`Kullanıcı başarıyla eklendi! ${userFormData.email} adresine bir onay e-postası gönderildi. Kullanıcı giriş yapmadan önce mailini onaylamalıdır.`);
                setUserFormData({ full_name: '', email: '', password: '', role: 'accountant' });
                await fetchTeamMembers();
            }
        } catch (error: any) {
            console.error('Error adding user:', error);
            alert(`Kullanıcı eklenirken bir hata oluştu: ${error.message}`);
        } finally {
            setIsUserSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Premium Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <SettingsIcon className="text-secondary" size={32} />
                    Sistem Ayarları
                </h1>
                <p className="text-slate-500 mt-2 text-lg">Platformunuzun temel yapılandırmalarını buradan yönetebilirsiniz.</p>
            </div>

            {/* Main Layout containing Sidebar Tabs and Content */}
            <div className="flex flex-col lg:flex-row gap-8">

                {/* Fixed/Sticky Tab Sidebar */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sticky top-8 flex flex-col gap-2">
                        <button
                            onClick={() => setActiveTab('schools')}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'schools'
                                ? 'bg-secondary text-white shadow-md shadow-blue-500/20'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <School size={20} />
                            <span>Okullar Yönetimi</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('company')}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'company'
                                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <Building size={20} />
                            <span>Firma Ayarları</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('tags')}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'tags'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <TagIcon size={20} />
                            <span>Özel Etiketler</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('pricing')}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'pricing'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <CreditCard size={20} />
                            <span>Fiyatlandırma</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'users'
                                ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <Users size={20} />
                            <span>Ekip Yönetimi</span>
                        </button>

                        <div className="mt-8 pt-4 border-t border-slate-100 px-2 text-center">
                            <ShieldCheck size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-xs text-slate-400">Verileriniz güvenle saklanır, yapılandırma anında uygulanır.</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1">

                    {/* =======================================================
                        TAB 4: COMPANY INFO
                       ======================================================= */}
                    {activeTab === 'company' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col xl:flex-row">
                                <div className="xl:w-1/2 bg-slate-50 p-6 xl:p-8 xl:border-r border-slate-200">
                                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                            <Building size={20} />
                                        </div>
                                        Firma ve Bölge Ayarları
                                    </h2>
                                    <p className="text-sm text-slate-500 mb-6">Firma ünvanınızı ve faaliyet gösterdiğiniz şehri buradan güncelleyebilirsiniz.</p>

                                    <form onSubmit={handleUpdateCompany} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Firma Adı / Ünvanı</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Building className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={companyName}
                                                    onChange={(e) => setCompanyName(e.target.value)}
                                                    placeholder="Örn: X Turizm Taşımacılık"
                                                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-700 shadow-sm"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Faaliyet Gösterilen Şehir</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <MapPin className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <select
                                                    value={city}
                                                    onChange={(e) => setCity(e.target.value)}
                                                    className="appearance-none block w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-700 cursor-pointer shadow-sm"
                                                >
                                                    <option value="" disabled>Şehir Seçiniz</option>
                                                    {TURKISH_CITIES.map(c => (
                                                        <option key={c.name} value={c.name}>{c.name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isCitySubmitting || (!city && !companyName) || (city === profile?.companies?.city && companyName === profile?.companies?.company_name)}
                                            className="w-full py-3.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                                        >
                                            {isCitySubmitting ? <><Loader2 size={18} className="animate-spin" /> Kaydediliyor...</> : 'Değişiklikleri Kaydet'}
                                        </button>
                                    </form>
                                </div>
                                <div className="xl:w-1/2 p-6 xl:p-8 flex flex-col justify-center items-center text-center">
                                     <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                                        <MapPin size={48} className="text-amber-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Harita Konumlandırması</h3>
                                    <p className="text-slate-500 max-w-sm mx-auto">Seçtiğiniz şehir, Rotalar ve Dashboard sayfalarındaki haritalarda başlangıç noktası olarak kullanılacaktır. Böylece Türkiye genelinde değil, doğrudan bulunduğunuz ilde işlem yapmaya başlayabilirsiniz.</p>
                                    
                                    {/* Application Link Section */}
                                    <div className="mt-8 pt-8 border-t border-slate-200 w-full text-left">
                                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                                <QrCode size={20} />
                                            </div>
                                            Özel Kayıt Başvurusu Linki
                                        </h3>
                                        <p className="text-sm text-slate-500 mb-6">Velilerinizin şifresiz olarak firmanıza kayıt başvurusu yapabilmeleri için aşağıdaki linki veya QR Kodu kullanabilirsiniz.</p>
                                        
                                        {profile?.companies?.public_token ? (
                                            <div className="flex flex-col xl:flex-row gap-6 items-center xl:items-start bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                                                <div className="flex-shrink-0 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                                                    <QRCodeSVG 
                                                        id="application-qr-code"
                                                        value={`${window.location.origin}/apply/${profile.companies.public_token}`} 
                                                        size={120} 
                                                        level="H"
                                                    />
                                                </div>
                                                <div className="flex flex-col justify-center w-full space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Başvuru Formu Bağlantısı</label>
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="text" 
                                                                readOnly 
                                                                value={`${window.location.origin}/apply/${profile.companies.public_token}`}
                                                                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                            />
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(`${window.location.origin}/apply/${profile?.companies?.public_token}`);
                                                                    alert("Bağlantı kopyalandı!");
                                                                }}
                                                                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors shrink-0"
                                                                title="Kopyala"
                                                            >
                                                                <Copy size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex gap-2">
                                                        <a 
                                                            href={`/apply/${profile.companies.public_token}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors text-sm"
                                                        >
                                                            <ExternalLink size={16} /> Git
                                                        </a>
                                                        <button 
                                                            onClick={async () => {
                                                                const svg = document.getElementById('application-qr-code');
                                                                if (svg) {
                                                                    const svgData = new XMLSerializer().serializeToString(svg);
                                                                    const canvas = document.createElement('canvas');
                                                                    const ctx = canvas.getContext('2d');
                                                                    const img = new Image();
                                                                    img.onload = () => {
                                                                        canvas.width = img.width;
                                                                        canvas.height = img.height;
                                                                        if(ctx) {
                                                                            ctx.fillStyle = "white";
                                                                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                                                                            ctx.drawImage(img, 0, 0);
                                                                        }
                                                                        const a = document.createElement('a');
                                                                        a.download = `kayit-qr-${profile.companies?.company_name || 'qrcod'}.png`;
                                                                        a.href = canvas.toDataURL('image/png');
                                                                        a.click();
                                                                    };
                                                                    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                                                                }
                                                            }}
                                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm shadow-sm"
                                                        >
                                                            <Download size={16} /> QR İndir
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm font-medium flex items-center gap-3">
                                                <Loader2 size={18} className="animate-spin" /> Token verisi yükleniyor... Lütfen sayfayı yenileyiniz.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* =======================================================
                        TAB 1: SCHOOLS
                       ======================================================= */}
                    {activeTab === 'schools' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col xl:flex-row">
                                {/* Form Side */}
                                <div className="xl:w-1/3 bg-slate-50 p-6 xl:p-8 xl:border-r border-slate-200">
                                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <Plus size={20} />
                                        </div>
                                        Yeni Okul Kaydı
                                    </h2>
                                    <form onSubmit={handleAddSchool} className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Okul Adı</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all shadow-sm"
                                                placeholder="Örn: Atatürk And. Lisesi"
                                                value={formData.name || ''}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">İlçe / Bölge</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all shadow-sm"
                                                placeholder="Örn: Kadıköy"
                                                value={formData.district || ''}
                                                onChange={e => setFormData({ ...formData, district: e.target.value })}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full py-3.5 bg-secondary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                                        >
                                            {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Ekleniyor...</> : 'Okulu Kaydet'}
                                        </button>
                                    </form>
                                </div>

                                {/* List Side */}
                                <div className="xl:w-2/3 p-6 xl:p-8">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
                                        Okul Listesi
                                        <span className="text-sm font-medium bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{schools.length} Kayıt</span>
                                    </h3>

                                    {loading ? (
                                        <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-secondary" size={32} /></div>
                                    ) : schools.length === 0 ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                                <School size={32} className="text-slate-300" />
                                            </div>
                                            <p className="text-slate-500 font-medium">Sistemde henüz kayıtlı okul bulunmuyor.</p>
                                        </div>
                                    ) : (
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {schools.map((school) => (
                                                <div key={school.id} className="group p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all bg-white relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="font-bold text-slate-800 text-[15px] leading-tight mb-1 pr-8">{school.name}</h3>
                                                            {school.district && (
                                                                <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                                    <MapPin size={12} /> {school.district}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteSchool(school.id, school.name)}
                                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                            title="Sil"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* =======================================================
                        TAB 2: TAGS
                       ======================================================= */}
                    {activeTab === 'tags' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col xl:flex-row">
                                {/* Form Side */}
                                <div className="xl:w-1/3 bg-slate-50 p-6 xl:p-8 xl:border-r border-slate-200">
                                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                            <TagIcon size={20} />
                                        </div>
                                        Yeni Etiket Fırsatı
                                    </h2>
                                    <form onSubmit={handleAddTag} className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Etiket Adı</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                                placeholder="Örn: Sabah Servisi, VIP..."
                                                value={tagFormData.name || ''}
                                                onChange={e => setTagFormData({ ...tagFormData, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Renk Belirle (HEX)</label>
                                            <div className="flex gap-3">
                                                <input
                                                    type="color"
                                                    className="h-12 w-16 p-1 bg-white border border-slate-200 rounded-xl cursor-pointer"
                                                    value={tagFormData.color || '#3b82f6'}
                                                    onChange={e => setTagFormData({ ...tagFormData, color: e.target.value })}
                                                />
                                                <input
                                                    type="text"
                                                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm"
                                                    value={tagFormData.color || '#3b82f6'}
                                                    onChange={e => setTagFormData({ ...tagFormData, color: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isTagSubmitting}
                                            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                                        >
                                            {isTagSubmitting ? <><Loader2 size={18} className="animate-spin" /> Ekleniyor...</> : 'Etiketi Kaydet'}
                                        </button>
                                    </form>
                                </div>

                                {/* List Side */}
                                <div className="xl:w-2/3 p-6 xl:p-8">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
                                        Özel Etiketler
                                        <span className="text-sm font-medium bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{tags.length} Adet</span>
                                    </h3>

                                    {tags.length === 0 ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                                <TagIcon size={32} className="text-slate-300" />
                                            </div>
                                            <p className="text-slate-500 font-medium">Henüz hiç etiket oluşturulmadı.</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-3">
                                            {tags.map((tag) => (
                                                <div
                                                    key={tag.id}
                                                    className="group flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-sm transition-all hover:-translate-y-0.5"
                                                    style={{
                                                        backgroundColor: `${tag.color}10`, // very transparent background
                                                        borderColor: `${tag.color}30`,
                                                        color: tag.color || '#333'
                                                    }}
                                                >
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }}></span>
                                                    <span className="font-bold text-sm tracking-wide">{tag.name}</span>
                                                    <button
                                                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                                                        className="ml-2 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 hover:bg-red-500 hover:text-white"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* =======================================================
                        TAB 3: PRICING
                       ======================================================= */}
                    {activeTab === 'pricing' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col xl:flex-row">
                                {/* Form Side */}
                                <div className="xl:w-1/3 bg-slate-50 p-6 xl:p-8 xl:border-r border-slate-200">
                                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                            <DollarSign size={20} />
                                        </div>
                                        Fiyatlandırma Kuralı
                                    </h2>
                                    <p className="text-sm text-slate-500 mb-6">Öğrenciler eklendiğinde "Okul Seviyesi"ne göre otomatik atanacak başlangıç fiyatları belirleyin.</p>

                                    <form onSubmit={handleAddPricing} className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Okul Seviyesi (Şablon)</label>
                                            <select
                                                required
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 cursor-pointer appearance-none shadow-sm"
                                                value={pricingFormData.school_level || ''}
                                                onChange={e => setPricingFormData({ ...pricingFormData, school_level: e.target.value })}
                                            >
                                                <option value="" disabled>Seviye Seçiniz</option>
                                                <option value="Anaokulu">Anaokulu</option>
                                                <option value="İlkokul">İlkokul</option>
                                                <option value="Ortaokul">Ortaokul</option>
                                                <option value="Lise">Lise</option>
                                                <option value="Üniversite / Personel">Üniversite / Personel</option>
                                                <option value="Diğer">Diğer</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Standart Aylık Tutar (₺)</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <span className="text-slate-400 font-bold">₺</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-slate-900 shadow-sm"
                                                    value={pricingFormData.amount || ''}
                                                    onChange={e => setPricingFormData({ ...pricingFormData, amount: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isPricingSubmitting}
                                            className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                                        >
                                            {isPricingSubmitting ? <><Loader2 size={18} className="animate-spin" /> Kaydediliyor...</> : 'Kuralı Kaydet'}
                                        </button>
                                    </form>
                                </div>

                                {/* List Side */}
                                <div className="xl:w-2/3 p-6 xl:p-8">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
                                        Mevcut Kurallar
                                        <span className="text-sm font-medium bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{pricingRules.length} Şablon</span>
                                    </h3>

                                    {pricingRules.length === 0 ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                                <CreditCard size={32} className="text-slate-300" />
                                            </div>
                                            <p className="text-slate-500 font-medium">Tanımlı bir standart fiyat kuralı bulunmuyor.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-hidden border border-slate-200 rounded-2xl">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200">
                                                        <th className="p-4 font-bold text-slate-600 text-sm">Okul Seviyesi</th>
                                                        <th className="p-4 font-bold text-slate-600 text-sm">Aylık Tutar</th>
                                                        <th className="p-4 font-bold text-slate-600 text-sm text-right">İşlem</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {pricingRules.map((rule) => (
                                                        <tr key={rule.id} className="hover:bg-emerald-50/30 transition-colors group">
                                                            <td className="p-4 font-bold text-slate-800">
                                                                {rule.school_level}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="inline-flex py-1 px-3 bg-slate-100 text-slate-800 font-bold rounded-lg text-sm border border-slate-200">
                                                                    {Number(rule.amount).toLocaleString('tr-TR')} ₺
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <button
                                                                    onClick={() => handleDeletePricing(rule.id, rule.school_level)}
                                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                                    title="Kuralı Sil"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* =======================================================
                        TAB 5: USERS (TEAM MANAGEMENT)
                       ======================================================= */}
                    {activeTab === 'users' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col xl:flex-row">
                                {/* Form Side */}
                                <div className="xl:w-1/3 bg-slate-50 p-6 xl:p-8 xl:border-r border-slate-200">
                                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                                            <UserPlus size={20} />
                                        </div>
                                        Yeni Ekip Üyesi
                                    </h2>
                                    <p className="text-sm text-slate-500 mb-6">Muhasebeci veya yönetici gibi alt kullanıcılar oluşturarak onlara kısıtlı erişim yetkisi verin.</p>

                                    <form onSubmit={handleAddUser} className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Ad Soyad</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
                                                placeholder="Örn: Ayşe Yılmaz"
                                                value={userFormData.full_name}
                                                onChange={e => setUserFormData({ ...userFormData, full_name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">E-posta</label>
                                            <input
                                                type="email"
                                                required
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
                                                placeholder="muhasebe@firma.com"
                                                value={userFormData.email}
                                                onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Şifre</label>
                                            <div className="relative">
                                                <input
                                                    type={showUserPassword ? 'text' : 'password'}
                                                    required
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm pr-12"
                                                    placeholder="En az 8 karakter, büyük/küçük harf ve rakam"
                                                    value={userFormData.password}
                                                    onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowUserPassword(!showUserPassword)}
                                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    {showUserPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Yetki Rolü</label>
                                            <select
                                                required
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-700 cursor-pointer appearance-none shadow-sm"
                                                value={userFormData.role}
                                                onChange={e => setUserFormData({ ...userFormData, role: e.target.value })}
                                            >
                                                <option value="accountant">Muhasebeci (Sadece Finans)</option>
                                                <option value="dispatcher">Operasyon Sorumlusu</option>
                                                <option value="admin">Yönetici (Tam Yetki)</option>
                                            </select>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isUserSubmitting}
                                            className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                                        >
                                            {isUserSubmitting ? <><Loader2 size={18} className="animate-spin" /> Ekleniyor...</> : 'Kullanıcıyı Kaydet'}
                                        </button>
                                    </form>
                                </div>

                                {/* List Side */}
                                <div className="xl:w-2/3 p-6 xl:p-8">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
                                        Mevcut Ekip Üyeleri
                                        <span className="text-sm font-medium bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{teamMembers.length} Kişi</span>
                                    </h3>

                                    {teamMembers.length === 0 ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                                <Users size={32} className="text-slate-300" />
                                            </div>
                                            <p className="text-slate-500 font-medium">Sistemde henüz başka kullanıcı bulunmuyor.</p>
                                        </div>
                                    ) : (
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {teamMembers.map((member) => (
                                                <div key={member.id} className="group p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all bg-white relative overflow-hidden flex items-center gap-4">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold flex-shrink-0">
                                                        {member.full_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-slate-800 text-sm truncate">{member.full_name}</h3>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {member.role === 'owner' ? 'Firma Sahibi' :
                                                             member.role === 'accountant' ? 'Muhasebeci' :
                                                             member.role === 'dispatcher' ? 'Operasyon Sorumlusu' :
                                                             member.role === 'admin' ? 'Yönetici' : member.role}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
