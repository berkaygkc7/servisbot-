import React from 'react';
import { Send } from 'lucide-react';

const DemoRequest: React.FC = () => {
    return (
        <div id="demo" className="py-24 bg-slate-900 text-white relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl bg-blue-500/10 blur-[100px] rounded-full pointing-events-none"></div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                <h2 className="text-3xl font-bold sm:text-5xl mb-6">
                    Hemen <span className="text-secondary">Demo İsteyin</span>
                </h2>
                <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
                    Platformumuzu size özel bir demo ile keşfedin. Ekibimiz 24 saat içinde sizinle iletişime geçecek.
                </p>

                <form className="max-w-xl mx-auto space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Şirket Adı"
                            className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary w-full transition-all"
                        />
                        <input
                            type="text"
                            placeholder="Ad Soyad"
                            className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary w-full transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="email"
                            placeholder="E-posta Adresi"
                            className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary w-full transition-all"
                        />
                        <input
                            type="tel"
                            placeholder="Telefon Numarası"
                            className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary w-full transition-all"
                        />
                    </div>

                    <button className="w-full bg-secondary text-slate-900 font-bold py-4 rounded-xl hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 group">
                        Demo Talep Et
                        <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DemoRequest;
