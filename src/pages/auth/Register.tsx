import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { KeyRound, Mail, AlertCircle, Building, User, MapPin, EyeOff, Eye, CheckCircle2, ShieldCheck } from 'lucide-react';
import { TURKISH_CITIES } from '../../constants/cities';
import logo from '../../assets/servisbot_bus_logo.png';

const Register = () => {
    const [searchParams] = useSearchParams();
    const selectedPlan = searchParams.get('plan') || 'free';

    const [fullName, setFullName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [city, setCity] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
        if (!passwordRegex.test(password)) {
            setError('Şifreniz en az 8 karakter uzunluğunda olmalı; en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.');
            setLoading(false);
            return;
        }

        try {
            // 1. Sign up the user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Kullanıcı oluşturulamadı.");

            // 2. Call the RPC to create Company and Profile atomically (Bypasses RLS during creation)
            const { data: registrationData, error: registrationError } = await supabase.rpc('register_company', {
                p_user_id: authData.user.id,
                p_company_name: companyName,
                p_full_name: fullName,
                p_city: city,
                p_subscription_tier: selectedPlan
            });

            if (registrationError) {
                console.error("Registration RPC error details:", {
                    code: registrationError.code,
                    message: registrationError.message,
                    details: registrationError.details,
                    hint: registrationError.hint
                });
                throw registrationError;
            }

            console.log("Registration RPC successful:", registrationData);

            // Successfully registered and profile created, wait for email confirmation
            setRegistrationSuccess(true);

        } catch (err: any) {
            let message = 'Kayıt sırasında bir hata oluştu.';
            if (err.message?.includes('Email rate limit exceeded')) {
                message = 'Çok fazla kayıt denemesi yapıldı. Lütfen biraz bekleyin veya sistem ayarlarından e-posta doğrulamasını kapatın.';
            } else if (err.message) {
                message = err.message;
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    if (registrationSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
                    <div className="bg-white py-12 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100 text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Kayıt Başarılı!</h2>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            Hesabınız başarıyla oluşturuldu. Güvenliğiniz için lütfen <span className="font-semibold text-slate-900">{email}</span> adresine gönderdiğimiz doğrulama bağlantısına tıklayın.
                        </p>
                        <Link
                            to="/login"
                            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all"
                        >
                            Giriş Sayfasına Dön
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Side: Register Form */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-[480px] xl:w-[560px] lg:px-20 xl:px-24 border-r border-slate-100 relative py-12 lg:py-0 overflow-y-auto">
                <div className="absolute top-8 left-8 sm:left-10 lg:left-12 hidden lg:block">
                    <img src={logo} alt="ServisBot Logo" className="h-10 w-auto object-contain brightness-0" />
                </div>
                
                <div className="mx-auto w-full max-w-sm lg:w-[380px] my-auto">
                    <div className="lg:hidden mb-8 flex justify-center">
                        <img src={logo} alt="ServisBot Logo" className="h-12 w-auto object-contain brightness-0" />
                    </div>
                    
                    <div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                            Ücretsiz Kayıt Olun
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Zaten hesabınız var mı?{' '}
                            <Link to="/login" className="font-semibold text-primary hover:text-blue-600 transition-colors">
                                Giriş yapın
                            </Link>
                        </p>
                    </div>

                    <div className="mt-8">
                        <form className="space-y-4" onSubmit={handleRegister}>
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Firma Adı</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Building className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="block w-full pl-11 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-all text-slate-900 placeholder:text-slate-400"
                                        placeholder="Örn: Yıldız Taşımacılık"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Ad Soyad</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="block w-full pl-11 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-all text-slate-900 placeholder:text-slate-400"
                                            placeholder="Ad Soyad"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Şehir</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <MapPin className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <select
                                            required
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="block w-full pl-11 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-all text-slate-900 cursor-pointer"
                                        >
                                            <option value="" disabled className="text-slate-400">Seçiniz</option>
                                            {TURKISH_CITIES.map(c => (
                                                <option key={c.name} value={c.name} className="text-slate-900">{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">E-posta Adresi</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-11 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-all text-slate-900 placeholder:text-slate-400"
                                        placeholder="ornek@firma.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Şifre</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <KeyRound className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-11 pr-11 py-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-all text-slate-900 placeholder:text-slate-400"
                                        placeholder="En az 6 karakter"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
                                </button>
                            </div>
                            
                            <p className="text-xs text-center text-slate-500 mt-4">
                                Kayıt olarak <a href="#" className="underline hover:text-slate-700">Kullanım Koşulları</a> ve <a href="#" className="underline hover:text-slate-700">Gizlilik Politikası</a>'nı kabul etmiş olursunuz.
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            {/* Right Side: Hero Visual */}
            <div className="hidden lg:flex flex-1 relative bg-slate-900 overflow-hidden items-center justify-center">
                {/* Abstract Background Elements */}
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[100px] pointer-events-none mix-blend-screen" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[80px] pointer-events-none mix-blend-screen" />
                
                {/* Dot Grid Pattern */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />

                <div className="relative z-10 max-w-2xl px-12 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 mb-8 shadow-2xl">
                        <ShieldCheck className="w-10 h-10 text-blue-400" />
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
                        Servis taşımacılığında yeni nesil yönetim.
                    </h1>
                    
                    <div className="grid grid-cols-2 gap-6 mt-12 text-left">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <h3 className="text-white font-bold text-lg mb-2">Kolay Planlama</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">Rotaları optimize edin, maliyetleri düşürün. Akıllı planlama ile zaman kazanın.</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <h3 className="text-white font-bold text-lg mb-2">Puantaj ve Hakediş</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">Otomatik hesaplamalar ile hata payını sıfıra indirin. Finansal süreçlerinizi hızlandırın.</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <h3 className="text-white font-bold text-lg mb-2">Canlı Takip</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">Araçlarınızı harita üzerinden gerçek zamanlı izleyin. Gecikmelere anında müdahale edin.</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <h3 className="text-white font-bold text-lg mb-2">Güvenli Veri</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">Tüm verileriniz uçtan uca şifrelenmiş sunucularda güvenle saklanır.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
