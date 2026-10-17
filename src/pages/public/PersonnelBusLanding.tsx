import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    CheckCircle2, 
    ArrowRight, 
    ShieldCheck, 
    Building2, 
    FileSpreadsheet, 
    MapPin, 
    Clock, 
    QrCode, 
    Smartphone, 
    Bell,
    PhoneCall,
    TrendingDown,
    Layers
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

const personnelFeatures = [
    {
        icon: Layers,
        title: "Çoklu Vardiya & Rota Optimizasyonu",
        desc: "08:00-16:00, 16:00-24:00, 24:00-08:00 gibi değişen vardiyalarda personel adreslerini ve fabrika giriş saatlerini analiz ederek en verimli güzergahı saniyeler içinde hesaplar.",
        color: "from-blue-500 to-indigo-600"
    },
    {
        icon: MapPin,
        title: "Uygulamasız Canlı Servis Takibi",
        desc: "Çalışanların uygulama indirmesine veya şifre ezberlemesine gerek kalmaz. SMS veya şirket içi bağlantıyla tarayıcıdan anlık servis haritası ve tahmini varış süresi (ETA) izlenir.",
        color: "from-cyan-500 to-blue-600"
    },
    {
        icon: TrendingDown,
        title: "Koltuk Doluluk & Kapasite Analizi",
        desc: "Hangi servisin kaç kişi taşıdığını, boş koltuk oranlarını ve mükerrer güzergahları tespit eder. Gereksiz araç çalıştırmayı engelleyerek filo bütçesinde anında tasarruf sağlar.",
        color: "from-emerald-500 to-teal-600"
    },
    {
        icon: FileSpreadsheet,
        title: "Otomatik Taşeron Sefer Puantajı",
        desc: "Taşeron taşımacılık firmalarının ve araç sahiplerinin aylık sefer hakedişlerini, gecikme ve sefer iptali cezalarını tek tıkla resmi Excel ve PDF puantaj raporuna dönüştürür.",
        color: "from-amber-500 to-orange-600"
    },
    {
        icon: QrCode,
        title: "QR Kodlu / Mobil Biniş Yoklaması",
        desc: "Personel araca binerken QR okutarak veya sürücü tarafından tek tıkla biniş kaydı alınır. İdari İşler ekibi hangi çalışanın servise bindiğini anlık takip eder.",
        color: "from-purple-500 to-pink-600"
    },
    {
        icon: Bell,
        title: "Otomatik 'Servis Durağa Yaklaştı' Bildirimi",
        desc: "Servis durağa 3 durak veya 5 dakika kala çalışanın telefonuna bildirim gönderilir. Kış aylarında sokakta uzun süre bekleme ve işe geç kalmalar son bulur.",
        color: "from-rose-500 to-red-600"
    }
];

const personnelFaqs = [
    {
        q: "Personel servisi takip sistemi için araçlara özel GPS takip donanımı taktırmak gerekiyor mu?",
        a: "Hayır. Servis araçlarına yüksek montaj bedelli GPS cihazları taktırmanıza veya her araç için aylık SIM kart veri ücreti ödemenize gerek yoktur. Şoförün akıllı telefonundaki ServisBot Sürücü Uygulaması, yüksek hassasiyetli canlı konum yayını için yeterlidir."
    },
    {
        q: "Fabrika çalışanlarının telefonuna mobil uygulama yüklemesi zorunlu mu?",
        a: "Kesinlikle hayır. ServisBot'un en büyük avantajı çalışanlara özel güvenli web bağlantısı sunmasıdır. Çalışanlar kendilerine iletilen bağlantıya tıklayarak haritadan servisin canlı konumunu ve durağa yaklaşma süresini tarayıcı üzerinden kolayca izleyebilir."
    },
    {
        q: "Taşeron servis firmalarının hakediş ve sefer puantajları nasıl hesaplanır?",
        a: "Sürücünün gerçekleştirdiği sabah/akşam seferleri, güzergah tamamlama süreleri ve gecikmeler sistem tarafından otomatik loglanır. Ay sonunda tek bir tıkla taşeron bazlı sefer hakediş ve ceza kesintileri hesaplanarak muhasebeye uygun Excel raporu alınır."
    },
    {
        q: "Vardiyalı çalışan personellerin rota değişimleri nasıl yönetilir?",
        a: "Haftalık veya günlük vardiya listeleri sisteme yüklendiğinde; yapay zeka algoritması o gün o vardiyada çalışan personellerin adreslerine göre en uygun durak dağılımını ve rotayı otomatik olarak yeniden optimize eder."
    },
    {
        q: "İdari İşler ve İK yöneticileri tüm filoyu tek ekrandan canlı izleyebilir mi?",
        a: "Evet. İdari İşler ve İnsan Kaynakları departmanına özel web panelinde tüm fabrika servisleri kuşbakışı canlı haritada izlenebilir, geciken araçlar ve vardiya giriş saatleri tek tıkla raporlanabilir."
    }
];

export const PersonnelBusLanding: React.FC = () => {
    useEffect(() => {
        // SEO Meta Güncellemesi
        document.title = "Personel Servisi Takip Sistemi ve Vardiya Rota Yönetimi | ServisBot";
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute(
                'content',
                'ServisBot Personel Servisi Takip Sistemi ile fabrika ve kurumsal şirket taşımacılığında canlı çalışan takibi, çoklu vardiya rota optimizasyonu ve tek tıkla otomatik taşeron puantajı sağlayın.'
            );
        }
        window.scrollTo(0, 0);
    }, []);

    const schemaData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "SoftwareApplication",
                "name": "ServisBot Personel Servisi Takip Sistemi",
                "applicationCategory": "BusinessApplication, FleetManagementApplication",
                "operatingSystem": "Web, iOS, Android",
                "url": "https://www.servisbot.pro/personel-servisi-takip-sistemi",
                "description": "Fabrikalar, sanayi tesisleri ve kurumsal şirketler için yapay zeka destekli personel servisi güzergah optimizasyonu, canlı çalışan takibi ve otomatik taşeron puantaj yazılımı.",
                "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "TRY",
                    "availability": "https://schema.org/InStock"
                }
            },
            {
                "@type": "FAQPage",
                "mainEntity": personnelFaqs.map(item => ({
                    "@type": "Question",
                    "name": item.q,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": item.a
                    }
                }))
            }
        ]
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white selection:bg-blue-500 selection:text-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
            />

            <Navbar forceSolid={true} />

            {/* Hero Bölümü */}
            <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-[#0a101f] via-slate-900 to-[#0e172a]">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="max-w-3xl mx-auto text-center space-y-6">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                            <Building2 size={14} className="text-indigo-400" />
                            Fabrika, OSB & Kurumsal Şirket Servis Operasyonları
                        </div>

                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
                            Personel Taşımacılığında <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300">
                                Akıllı Rota & Otomatik Puantaj
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
                            Vardiya gecikmelerine, gereksiz araç çalıştırmaya ve manuel Excel puantaj hesaplarına son verin. Çalışanlarınıza uygulama indirtmeden canlı servis takibi ve İK ekibinize tam filo kontrolü sunun.
                        </p>

                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/register" className="w-full sm:w-auto">
                                <button className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
                                    Hemen Ücretsiz Başla
                                    <ArrowRight size={20} />
                                </button>
                            </Link>
                            <a
                                href="https://wa.me/905054171299?text=Merhaba,%20personel%20servis%20takip%20sistemi%20hakk%C4%B1nda%20kurumsal%20bilgi%20almak%20istiyorum."
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold text-base transition-colors flex items-center justify-center gap-2"
                            >
                                <PhoneCall size={18} className="text-indigo-400" />
                                Kurumsal Bilgi Alın
                            </a>
                        </div>

                        {/* Güven Rozetleri */}
                        <div className="pt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-800/80 text-xs text-slate-400 max-w-xl mx-auto">
                            <div className="flex items-center justify-center gap-1.5">
                                <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
                                <span>Taşeron & Hakediş Denetimi</span>
                            </div>
                            <div className="flex items-center justify-center gap-1.5">
                                <Smartphone size={16} className="text-blue-400 flex-shrink-0" />
                                <span>Çalışana Uygulama Şartı Yok</span>
                            </div>
                            <div className="flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1">
                                <CheckCircle2 size={16} className="text-indigo-400 flex-shrink-0" />
                                <span>Sıfır Ek Cihaz Maliyeti</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* İstatistik & Kanıt Bannerı */}
            <section className="py-12 bg-slate-950 border-y border-slate-800/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">%28</div>
                            <div className="text-xs md:text-sm text-slate-400 mt-1 font-medium">Filo Yakıt & Araç Tasarrufu</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300">8+ Saat</div>
                            <div className="text-xs md:text-sm text-slate-400 mt-1 font-medium">Haftalık İK Puantaj Kazancı</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">0 TL</div>
                            <div className="text-xs md:text-sm text-slate-400 mt-1 font-medium">Donanım & Montaj Masrafı</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300">%99.8</div>
                            <div className="text-xs md:text-sm text-slate-400 mt-1 font-medium">Zamanında Vardiya Girişi</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Personel Servislerine Özel 6 Temel Özellik */}
            <section className="py-20 md:py-28 bg-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                            Kurumsal Filo & İdari İşler Yönetimi
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            Şirket ve Fabrika Servis Taşımacılığında <br />
                            Tüm Operasyon Tek Merkezde
                        </h2>
                        <p className="text-slate-400 text-base max-w-2xl mx-auto">
                            Hangi servis kaç personelle gidiyor, hangi araç gecikti, taşeron faturası ne kadar tuttu? Artık hepsi anında elinizin altında.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {personnelFeatures.map((feat, idx) => {
                            const IconComponent = feat.icon;
                            return (
                                <div
                                    key={idx}
                                    className="p-8 rounded-3xl bg-slate-800/40 border border-slate-700/60 hover:border-indigo-500/40 hover:bg-slate-800/70 transition-all duration-300 flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feat.color} flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-500/10 group-hover:scale-110 transition-transform`}>
                                            <IconComponent size={26} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">
                                            {feat.title}
                                        </h3>
                                        <p className="text-sm text-slate-400 leading-relaxed">
                                            {feat.desc}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Taşeron Puantajı & İK Vurgusu */}
            <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-950 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="p-8 md:p-14 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-blue-950/40 border border-indigo-500/30 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10">
                        <div className="max-w-2xl space-y-5">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                <FileSpreadsheet size={14} />
                                Muhasebe & İK Otomasyonu
                            </div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                                Ay Sonlarında Taşeron Servis Puantajı İçin Günlerce Uğraşmayın
                            </h2>
                            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                                Şirketinize hizmet veren onlarca taşeron servis aracının sefer sayılarını, gerçekleşen kilometreleri ve sefer aksaklıklarını manuel kontrol etmek yerine ServisBot'un otomatik puantaj motoruna bırakın. Tek tıkla resmi hakediş dökümü oluşturun.
                            </p>
                            <ul className="space-y-2.5 text-sm text-slate-300">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                    Tek tıkla Excel ve PDF sefer puantaj tablosu
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                    Gecikme, eksik sefer ve rota sapmalarında otomatik ceza kesintisi takibi
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                    Vardiya bazında personel biniş ve katılım oranları
                                </li>
                            </ul>
                        </div>
                        <div className="flex-shrink-0 text-center lg:text-right">
                            <Link to="/register">
                                <button className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-500/30 transition-all">
                                    Filo Modülünü İnceleyin
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Personel Servisi SSS */}
            <section className="py-20 bg-slate-950">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                            Personel Servisi Takip Sistemi Hakkında Merak Edilenler
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {personnelFaqs.map((faq, idx) => (
                            <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                                <h3 className="font-bold text-white text-base md:text-lg flex items-start gap-2">
                                    <Clock size={18} className="text-indigo-400 mt-1 flex-shrink-0" />
                                    {faq.q}
                                </h3>
                                <p className="text-sm md:text-base text-slate-400 pl-6 leading-relaxed">
                                    {faq.a}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Son CTA */}
                    <div className="mt-16 text-center p-8 rounded-3xl bg-gradient-to-r from-indigo-900/30 to-blue-900/30 border border-indigo-500/20">
                        <h3 className="text-2xl font-bold text-white mb-2">Şirket Servis Operasyonunuzu Kolaylaştırın</h3>
                        <p className="text-slate-400 text-sm mb-6 max-w-lg mx-auto">
                            15 personele kadar ücretsiz kayıt olun; vardiya rotalarınızı, canlı takip linkinizi ve puantaj cetvelinizi hemen test edin.
                        </p>
                        <Link to="/register">
                            <button className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-500/25 transition-all">
                                Ücretsiz Başlayın
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default PersonnelBusLanding;
