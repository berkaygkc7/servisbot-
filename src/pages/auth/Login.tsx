import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { KeyRound, Mail, AlertCircle, Eye, EyeOff, BusFront } from 'lucide-react';
import logo from '../../assets/servisbot_bus_logo.png';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                if (authError.message.includes('Email not confirmed')) {
                    throw new Error('Lütfen e-posta adresinizi doğrulayın. Gelen kutunuzu kontrol edin.');
                }
                if (authError.message === 'Invalid login credentials') {
                    throw new Error('E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.');
                }
                throw authError;
            }
            
            // Check if user is superadmin
            if (authData?.user) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('is_superadmin')
                    .eq('id', authData.user.id)
                    .single();
                    
                if (userData?.is_superadmin) {
                    navigate('/superadmin');
                    return;
                }
            }

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Giriş yapılırken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Side: Login Form */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-[480px] xl:w-[560px] lg:px-20 xl:px-24 border-r border-slate-100 relative">
                <div className="absolute top-8 left-8 sm:left-10 lg:left-12">
                    <img src={logo} alt="ServisBot Logo" className="h-10 w-auto object-contain brightness-0" />
                </div>
                
                <div className="mx-auto w-full max-w-sm lg:w-[380px]">
                    <div>
                        <h2 className="mt-8 text-3xl font-extrabold tracking-tight text-slate-900">
                            Tekrar Hoş Geldiniz
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Hesabınıza giriş yapın veya{' '}
                            <Link to="/register" className="font-semibold text-primary hover:text-blue-600 transition-colors">
                                ücretsiz deneme başlatın
                            </Link>
                        </p>
                    </div>

                    <div className="mt-8">
                        <form className="space-y-5" onSubmit={handleLogin}>
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <p>{error}</p>
                                </div>
                            )}

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
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-11 pr-11 py-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-all text-slate-900 placeholder:text-slate-400"
                                        placeholder="••••••••"
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

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded cursor-pointer"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer select-none">
                                        Beni hatırla
                                    </label>
                                </div>

                                <div className="text-sm">
                                    <a href="#" className="font-semibold text-primary hover:text-blue-600 transition-colors">
                                        Şifremi unuttum
                                    </a>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                                </button>
                            </div>
                        </form>
                        
                        <div className="mt-8 relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-slate-500">Güvenli Giriş</span>
                            </div>
                        </div>
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
                        <BusFront className="w-10 h-10 text-blue-400" />
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
                        Servis operasyonlarınızı tek bir yerden yönetin.
                    </h1>
                    <p className="text-lg text-slate-300 mb-10 max-w-xl mx-auto">
                        Güzergah planlama, personel takibi, puantaj ve hakediş hesaplamaları artık çok daha kolay ve profesyonel.
                    </p>
                    
                    {/* Glassmorphic Stats/Testimonial Card */}
                    <div className="mx-auto max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-left shadow-2xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                                SK
                            </div>
                            <div>
                                <h4 className="text-white font-medium">Sistem Kontrolü</h4>
                                <p className="text-slate-400 text-sm">%99.9 Uptime</p>
                            </div>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            "ServisBot ile tüm operasyonel yükümüz azaldı. Şoförler, araçlar ve rotalar tamamen kontrol altında."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
