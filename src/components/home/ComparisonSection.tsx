import React from 'react';
import { Check, X, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ComparisonRow {
    feature: string;
    description: string;
    excel: string | boolean;
    gps: string | boolean;
    servisbot: string;
    highlight?: boolean;
}

const comparisonData: ComparisonRow[] = [
    {
        feature: "Ek Donanım ve Montaj",
        description: "Araçlara cihaz montajı ve aylık SIM kart faturası",
        excel: "Donanım yok (Verimsiz)",
        gps: "Pahalı cihaz + Aylık SIM veri ücreti",
        servisbot: "Sıfır Ek Donanım — Sürücünün akıllı telefonu yeterli (5 dk'da hazır)",
        highlight: true
    },
    {
        feature: "Rota Planlama & Yakıt Tasarrufu",
        description: "En az yakıt ve en kısa sürede öğrencileri toplama",
        excel: "Şoförün ezberine bağlı, plansız",
        gps: "Yalnızca geçmiş rotayı izler, optimize edemez",
        servisbot: "Yapay Zeka Destekli Rota Optimizasyonu (%25'e varan yakıt tasarrufu)",
        highlight: true
    },
    {
        feature: "Veli Bilgilendirme & Canlı Takip",
        description: "Velinin çocuğun konumunu ve iniş/binişini görmesi",
        excel: "Sürekli telefon aramaları ve WhatsApp karmaşası",
        gps: "Sadece araç nerede gösterir, çocuk bindi mi bilinmez",
        servisbot: "Uygulamasız Canlı Harita & Yaklaştı Bildirimi (SMS / WhatsApp linki)",
        highlight: true
    },
    {
        feature: "Veli Sözleşmesi ve Evraklar",
        description: "Kayıt formları, KVKK onayları ve sözleşmeler",
        excel: "Kağıt çıktılar, kaybolan formlar, imza peşinde koşma",
        gps: "Desteklenmiyor",
        servisbot: "Zaman Damgalı Dijital İmza — 30 saniyede cepten yasal e-onay",
        highlight: true
    },
    {
        feature: "Yoklama ve Otomatik Puantaj",
        description: "Aylık hak ediş ve personel/öğrenci puantaj cetveli",
        excel: "Saatlerce süren manuel veri girişi ve hesaplama hataları",
        gps: "Yoklama özelliği bulunmaz",
        servisbot: "QR & Tek Tıkla Yoklama — Tek tıkla otomatik Excel & PDF puantajı",
        highlight: true
    },
    {
        feature: "Finans & Tahsilat Takibi",
        description: "Veli ödemeleri, geciken taksitler ve kasa kontrolü",
        excel: "Karışık tablolar, unutulan alacaklar",
        gps: "Desteklenmiyor",
        servisbot: "Otomatik Hatırlatıcılar & Detaylı Gelir/Gider Muhasebe Paneli"
    }
];

export const ComparisonSection: React.FC = () => {
    return (
        <section id="karsilastirma" className="py-20 md:py-28 bg-[#0b1120] text-white relative overflow-hidden">
            {/* Arka Plan Glow Efektleri */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Başlık Alanı */}
                <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase">
                        <Zap size={14} className="text-blue-400 fill-blue-400" />
                        Neden ServisBot?
                    </div>
                    <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                        Eski Yöntemleri Bırakın, <br className="hidden sm:inline" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300">
                            Akıllı Servis Çağına
                        </span> Geçin
                    </h2>
                    <p className="text-slate-400 text-base md:text-lg">
                        Klasik araç takip sistemleri ve Excel tabloları işletmenize her ay binlerce lira zaman ve yakıt kaybettirir. ServisBot ile operasyonunuzu modernize edin.
                    </p>
                </div>

                {/* Masaüstü Karşılaştırma Tablosu */}
                <div className="hidden lg:block overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/70">
                                <th className="p-6 text-sm font-bold uppercase tracking-wider text-slate-400 w-1/4">
                                    Özellik & Kapasite
                                </th>
                                <th className="p-6 text-sm font-bold uppercase tracking-wider text-slate-400 w-1/4">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                                        Excel & WhatsApp
                                    </div>
                                </th>
                                <th className="p-6 text-sm font-bold uppercase tracking-wider text-slate-400 w-1/4">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                        Eski GPS Cihazları
                                    </div>
                                </th>
                                <th className="p-6 text-sm font-bold uppercase tracking-wider text-blue-400 w-1/4 bg-blue-600/10 border-l border-r border-blue-500/20 relative">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={16} className="text-blue-400" />
                                        ServisBot Platformu
                                    </div>
                                    <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md">
                                        Önerilen
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                            {comparisonData.map((row, idx) => (
                                <tr 
                                    key={idx}
                                    className="hover:bg-slate-800/30 transition-colors"
                                >
                                    {/* Kriter Adı & Açıklama */}
                                    <td className="p-6 align-top">
                                        <div className="font-bold text-white text-base mb-1">{row.feature}</div>
                                        <div className="text-xs text-slate-400 leading-relaxed">{row.description}</div>
                                    </td>

                                    {/* Excel / Kağıt */}
                                    <td className="p-6 align-top text-sm text-slate-400">
                                        <div className="flex items-start gap-2.5">
                                            <div className="p-1 rounded-full bg-rose-500/10 text-rose-400 mt-0.5 flex-shrink-0">
                                                <X size={14} />
                                            </div>
                                            <span>{row.excel}</span>
                                        </div>
                                    </td>

                                    {/* Eski GPS Araç Takip */}
                                    <td className="p-6 align-top text-sm text-slate-400">
                                        <div className="flex items-start gap-2.5">
                                            <div className="p-1 rounded-full bg-amber-500/10 text-amber-400 mt-0.5 flex-shrink-0">
                                                <X size={14} />
                                            </div>
                                            <span>{row.gps}</span>
                                        </div>
                                    </td>

                                    {/* ServisBot (Öne Çıkan) */}
                                    <td className="p-6 align-top text-sm bg-blue-600/5 border-l border-r border-blue-500/20 font-medium text-slate-100">
                                        <div className="flex items-start gap-2.5">
                                            <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5 flex-shrink-0">
                                                <Check size={14} className="stroke-[3]" />
                                            </div>
                                            <span className="text-white font-semibold">{row.servisbot}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobil Görünüm (Kart Tabanlı Akordeon / Liste) */}
                <div className="lg:hidden space-y-4">
                    {comparisonData.map((row, idx) => (
                        <div 
                            key={idx} 
                            className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md space-y-3"
                        >
                            <div>
                                <h3 className="font-bold text-white text-base">{row.feature}</h3>
                                <p className="text-xs text-slate-400">{row.description}</p>
                            </div>

                            {/* ServisBot Çözümü */}
                            <div className="p-3.5 rounded-xl bg-blue-600/10 border border-blue-500/30">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-1 flex items-center gap-1.5">
                                    <Sparkles size={12} /> ServisBot
                                </div>
                                <div className="flex items-start gap-2 text-xs font-semibold text-white">
                                    <Check size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <span>{row.servisbot}</span>
                                </div>
                            </div>

                            {/* Geleneksel Yollar Kıyası */}
                            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400">
                                <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
                                    <span className="font-semibold text-slate-300 block mb-0.5">Excel / Kağıt:</span>
                                    <span>{row.excel}</span>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
                                    <span className="font-semibold text-slate-300 block mb-0.5">Klasik GPS:</span>
                                    <span>{row.gps}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Alt Harekete Geçirici Çağrı (CTA) */}
                <div className="mt-12 text-center">
                    <Link to="/register">
                        <button className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-0.5">
                            Filonuzu Ücretsiz Deneyin
                            <ArrowRight size={18} />
                        </button>
                    </Link>
                    <p className="text-xs text-slate-400 mt-3 flex items-center justify-center gap-2">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        Kredi kartı gerekmez • 5 dakikada kurulur • Sıfır donanım maliyeti
                    </p>
                </div>
            </div>
        </section>
    );
};

export default ComparisonSection;
