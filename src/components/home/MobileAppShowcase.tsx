import React from 'react';
import { Smartphone, BellRing, Route, ShieldCheck } from 'lucide-react';

const MobileAppShowcase: React.FC = () => {
    return (
        <section className="py-16 md:py-24 bg-white relative overflow-hidden" id="mobile-app">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-50 to-teal-50/50 rounded-full blur-3xl opacity-50 translate-y-1/3 -translate-x-1/3"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Text Column */}
                    <div className="order-1 space-y-8 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100/50 text-blue-600 font-semibold text-sm">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                            </span>
                            ServisBot Mobil Uygulaması Çok Yakında
                        </div>

                        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight leading-tight">
                            Güç artık <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">cebinizde!</span>
                        </h2>

                        <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                            Veli, şoför ve öğrenci uygulamamız sayesinde rotaları anlık takip edin, bindirme-indirme işlemlerini dijitalleştirin ve anlık bildirimlerle kontrolü elden bırakmayın.
                        </p>

                        <div className="space-y-6 pt-4">
                            {
                                [
                                    {
                                        icon: <Route className="text-blue-500" size={24} />,
                                        title: "Canlı Rota ve Konum Takibi",
                                        desc: "Veliler, öğrencilerin bindiği aracın konumunu anlık olarak harita üzerinden izleyebilir."
                                    },
                                    {
                                        icon: <BellRing className="text-orange-500" size={24} />,
                                        title: "Anında Bildirim Sistemi",
                                        desc: "Araç yaklaştığında, öğrenci bindiğinde veya indiğinde otomatik SMS/uygulama bildirimleri."
                                    },
                                    {
                                        icon: <ShieldCheck className="text-emerald-500" size={24} />,
                                        title: "Şoförler için Kolay Yönetim",
                                        desc: "Karmaşık listeler yerine, sıradaki durağı ve binecek öğrencileri ekranında kolayca gör."
                                    }
                                ].map((feature, idx) => (
                                    <div key={idx} className="flex gap-4 items-start text-left bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg mb-1">{feature.title}</h4>
                                            <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>

                        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-2">
                            {/* App Store Button */}
                            <button className="relative group overflow-hidden px-6 py-3.5 rounded-2xl bg-[#0f172a] text-white transition-all duration-300 shadow-xl shadow-slate-200/50 flex items-center justify-center gap-4 hover:-translate-y-1 hover:shadow-2xl hover:bg-[#1e293b] border border-slate-700/50">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <svg className="w-8 h-8 text-white relative z-10" viewBox="0 0 384 512" fill="currentColor">
                                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 24.7 172.9 8.7 220.3c-28.5 86.8 5.7 197.8 45.4 252 23.3 32 51.6 68.3 88 68.3 35.3 0 49-21.7 89.6-21.7 39.8 0 52.1 21.7 89.6 21.7 34.3 0 58.7-32.5 83.2-67.9 28.5-41.1 39.7-81.5 40.8-83.6-1.5-.7-66.2-24.8-66.6-100.4zM245.5 106.8c19-21.4 32.2-51.5 28.6-82.6-24.1 1.6-56.1 16.5-76.2 38.6-17.1 18.7-32.9 49.6-28.5 79.5 27.2 2 57.1-15 76.1-35.5z" />
                                </svg>
                                <div className="text-left flex flex-col relative z-10">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Çok Yakında</span>
                                    <span className="text-xl font-bold leading-none tracking-tight mt-0.5">App Store</span>
                                </div>
                            </button>

                            {/* Google Play Button */}
                            <button className="relative group overflow-hidden px-6 py-3.5 rounded-2xl bg-[#0f172a] text-white transition-all duration-300 shadow-xl shadow-slate-200/50 flex items-center justify-center gap-4 hover:-translate-y-1 hover:shadow-2xl hover:bg-[#1e293b] border border-slate-700/50">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <svg className="w-8 h-8 text-white relative z-10" viewBox="0 0 512 512" fill="currentColor">
                                    <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
                                </svg>
                                <div className="text-left flex flex-col relative z-10">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Çok Yakında</span>
                                    <span className="text-xl font-bold leading-none tracking-tight mt-0.5">Google Play</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Image Column */}
                    <div className="order-2 relative flex justify-center lg:justify-end">
                        <div className="relative w-full max-w-2xl lg:scale-125 lg:origin-right mt-10 lg:mt-0">
                            {/* Decorative background circle behind phone */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-indigo-50 rounded-full blur-3xl scale-95 opacity-80 animate-pulse-slow"></div>

                            {/* The App Image */}
                            <img
                                src="/app-showcase.png"
                                alt="ServisBot Mobil Uygulama Arayüzü"
                                className="relative z-10 w-full h-auto drop-shadow-2xl hover:-translate-y-2 transition-transform duration-500 rounded-[3rem]"
                            />

                            {/* Floating Badges */}
                            <div className="absolute top-[12%] -right-4 md:-right-8 z-20 bg-white p-3 sm:p-4 rounded-2xl shadow-xl border border-slate-100 animate-bounce-slow flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <ShieldCheck className="text-emerald-600" size={20} />
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-xs text-slate-500 font-medium">Güvenlik</p>
                                    <p className="text-sm font-bold text-slate-800">Tam Kontrol</p>
                                </div>
                            </div>

                            <div className="absolute bottom-[25%] -right-8 md:-right-12 z-20 bg-white p-3 sm:p-4 rounded-2xl shadow-xl border border-slate-100 animate-bounce-slow delay-150 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Smartphone className="text-blue-600" size={20} />
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-xs text-slate-500 font-medium">Kullanım</p>
                                    <p className="text-sm font-bold text-slate-800">Çok Kolay</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default MobileAppShowcase;
