import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import logo from '../../assets/yeni_navbar_logo.png';

const Footer: React.FC = () => {
    return (
        <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                            <img src={logo} alt="ServisBot Logo" className="h-10 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-sm leading-relaxed max-w-sm mx-auto md:mx-0">
                            Türkiye'deki öğrenci servis şirketleri için akıllı rota optimizasyonu ve yönetim platformu.
                        </p>
                    </div>

                    {/* Platform */}
                    <div className="text-center md:text-left">
                        <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Platform</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#özellikler" className="hover:text-secondary transition-colors">Özellikler</a></li>
                            <li><a href="#fiyatlandırma" className="hover:text-secondary transition-colors">Fiyatlandırma</a></li>
                            <li><a href="/dashboard" className="hover:text-secondary transition-colors">Yönetim Paneli</a></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="text-center md:text-left">
                        <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Yasal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-secondary transition-colors">Gizlilik Politikası</a></li>
                            <li><a href="#" className="hover:text-secondary transition-colors">Kullanım Şartları</a></li>
                            <li><a href="#" className="hover:text-secondary transition-colors">KVKK Aydınlatma</a></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="text-center md:text-left">
                        <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">İletişim</h4>
                        <ul className="space-y-3 text-sm flex flex-col items-center md:items-start">
                            <li className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-secondary" />
                                <span>info@servisbot.com.tr</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-secondary" />
                                <span>0312 555 00 00</span>
                            </li>
                            <li className="flex items-start gap-3 justify-center md:justify-start">
                                <MapPin className="w-5 h-5 text-secondary flex-shrink-0" />
                                <span>Çankaya, Ankara, Türkiye</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-800 mt-12 pt-8 text-center text-sm text-slate-600">
                    &copy; {new Date().getFullYear()} ServisBot Teknoloji A.Ş. Tüm hakları saklıdır.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
