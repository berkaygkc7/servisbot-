import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, Phone, Lock } from 'lucide-react';
import logo from '../../assets/servisbot_bus_logo.png';

const Register = () => {
    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Side: Notice */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-[480px] xl:w-[560px] lg:px-20 xl:px-24 border-r border-slate-100 relative py-12 lg:py-0 overflow-y-auto">
                <div className="absolute top-8 left-8 sm:left-10 lg:left-12 hidden lg:block">
                    <img src={logo} alt="ServisBot Logo" className="h-10 w-auto object-contain brightness-0" />
                </div>
                
                <div className="mx-auto w-full max-w-sm lg:w-[380px] my-auto">
                    <div className="lg:hidden mb-8 flex justify-center">
                        <img src={logo} alt="ServisBot Logo" className="h-12 w-auto object-contain brightness-0" />
                    </div>
                    
                    <div className="text-center sm:text-left">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-slate-100 mb-6">
                            <Lock className="w-8 h-8 text-slate-700" />
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">
                            Özel Kurumsal Sistem
                        </h2>
                        <p className="mt-2 text-base text-slate-600 leading-relaxed">
                            ServisBot, güvenlik ve veri bütünlüğünü sağlamak amacıyla sadece <span className="font-bold text-slate-900">yetkili satış temsilcileri</span> üzerinden lisanslanmaktadır. Dışarıdan otomatik hesap oluşturma işlemi kapalıdır.
                        </p>
                    </div>

                    <div className="mt-8 space-y-6">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                            <h3 className="font-bold text-slate-900 mb-4">Sistemi Satın Almak veya Demo Görmek İçin:</h3>
                            <div className="space-y-4">
                                <a href="mailto:info@servisbot.pro" className="flex items-center gap-3 text-slate-600 hover:text-primary transition-colors">
                                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium">info@servisbot.pro</span>
                                </a>
                                <a href="https://wa.me/905050451711?text=Merhaba,%20ServisBot%20hakkında%20detaylı%20bilgi%20almak%20istiyorum." target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-600 hover:text-green-600 transition-colors">
                                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900">Eren Canıkatı</div>
                                        <div className="text-sm">0505 045 17 11 <span className="text-xs text-green-600 font-semibold ml-1">(WhatsApp)</span></div>
                                    </div>
                                </a>
                                <a href="https://wa.me/905054171299?text=Merhaba,%20ServisBot%20hakkında%20detaylı%20bilgi%20almak%20istiyorum." target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-600 hover:text-green-600 transition-colors">
                                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900">Berkay Gökçe</div>
                                        <div className="text-sm">0505 417 12 99 <span className="text-xs text-green-600 font-semibold ml-1">(WhatsApp)</span></div>
                                    </div>
                                </a>
                            </div>
                        </div>

                        <div className="pt-4 text-center sm:text-left">
                            <p className="text-sm text-slate-600">
                                Zaten lisanslı bir hesabınız var mı?{' '}
                                <Link to="/login" className="font-bold text-primary hover:text-blue-600 transition-colors">
                                    Sisteme Giriş Yapın
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Hero Visual */}
            <div className="hidden lg:flex flex-1 relative bg-slate-900 overflow-hidden items-center justify-center">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[100px] pointer-events-none mix-blend-screen" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[80px] pointer-events-none mix-blend-screen" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />

                <div className="relative z-10 max-w-2xl px-12 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 mb-8 shadow-2xl">
                        <ShieldCheck className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
                        Servis taşımacılığında kapalı devre güvenlik.
                    </h1>
                    
                    <div className="grid grid-cols-2 gap-6 mt-12 text-left">
                         <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <h3 className="text-white font-bold text-lg mb-2">Sıfır Risk</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">Yetkisiz kişilerin erişimi kapalıdır. Kurumunuza özel izole veri alanları ile çalışırsınız.</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <h3 className="text-white font-bold text-lg mb-2">Özel Kurulum</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">Hesabınız uzman ekibimiz tarafından ihtiyaçlarınıza göre yapılandırılarak size teslim edilir.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
