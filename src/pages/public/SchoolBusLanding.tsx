import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    CheckCircle2, 
    ArrowRight, 
    ShieldCheck, 
    Bus, 
    Users, 
    FileText, 
    MapPin, 
    Sparkles, 
    Clock, 
    CreditCard, 
    Smartphone, 
    Bell,
    PhoneCall
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

const schoolFeatures = [
    {
        icon: MapPin,
        title: "Uygulamasız Canlı Veli Takibi",
        desc: "Velilerin uygulama indirmesine veya şifre hatırlamasına gerek kalmaz. SMS veya WhatsApp linkiyle tarayıcıdan anlık servis konumu ve tahmini varış süresi izlenir.",
        color: "from-blue-500 to-cyan-500"
    },
    {
        icon: Bell,
        title: "Otomatik 'Servis Yaklaştı' Bildirimi",
        desc: "Servis öğrencinin evine 3 durak veya 5 dakika kala velinin telefonuna otomatik uyarı gider. Sabahları sokakta bekleme ve gecikmeler son bulur.",
        color: "from-amber-500 to-orange-500"
    },
    {
        icon: Sparkles,
        title: "AI Destekli Okul Güzergah Rotalaması",
        desc: "Yüzlerce öğrenci adresini ve okul zil saatlerini saniyeler içinde analiz ederek en az yakıt harcayan ve en kısa süren güzergahı oluşturur.",
        color: "from-indigo-500 to-purple-500"
    },
    {
        icon: FileText,
        title: "30 Saniyede Dijital Veli Sözleşmesi",
        desc: "MEB ve UKOME standartlarındaki taşıma sözleşmeleri velilere online iletilir. Veliler cep telefonundan ıslak imza kalitesinde zaman damgalı onay verir.",
        color: "from-emerald-500 to-teal-500"
    },
    {
        icon: Users,
        title: "Rehber Personel & QR Yoklama",
        desc: "Öğrenci araca bindiğinde veya indiğinde tek tıkla yoklama alınır; veliye anında 'Çocuğunuz servise bindi' ve 'Okula ulaştı' bildirimi iletilir.",
        color: "from-rose-500 to-pink-500"
    },
    {
        icon: CreditCard,
        title: "Taksit & Aylık Servis Ücreti Takibi",
        desc: "Öğrenci bazlı ödeme planları, taksitler ve geciken ödemeler otomatik takip edilir. Veliye otomatik SMS ile hatırlatma gönderilir.",
        color: "from-sky-500 to-blue-600"
    }
];

const schoolFaqs = [
    {
        q: "Okul servisi takip programı için araçlara GPS cihazı taktırmak gerekiyor mu?",
        a: "Hayır. ServisBot ile araçlarınıza pahalı araç takip cihazı taktırmanıza veya aylık SIM kart veri ücreti ödemenize gerek yoktur. Sürücünün veya rehber personelin cep telefonundaki uygulama yüksek doğrulukla canlı konum yayını yapar."
    },
    {
        q: "Velilerin telefonuna mobil uygulama indirmesi şart mı?",
        a: "Kesinlikle hayır. ServisBot'un en sevilen özelliği velilere özel güvenli takip linki sunmasıdır. Veli WhatsApp veya SMS ile gelen bağlantıya tıklayarak servisi anlık harita üzerinde tarayıcıdan izler."
    },
    {
        q: "Dijital veli sözleşmesi hukuken geçerli midir?",
        a: "Evet. 6098 sayılı Türk Borçlar Kanunu ve Elektronik Ticaret mevzuatına tam uyumlu olarak velinin telefon doğrulaması, zaman damgası ve IP adresiyle e-onay alınır ve sözleşme PDF olarak arşivlenir."
    },
    {
        q: "Özel okullar veya okul aile birlikleri sistemi denetleyebilir mi?",
        a: "Evet. Okul yönetimine özel denetim ekranı tanımlanabilir; böylece okul müdürlüğü tüm servislerin okula giriş/çıkış saatlerini ve öğrenci doluluk oranlarını gerçek zamanlı takip edebilir."
    }
];

export const SchoolBusLanding: React.FC = () => {
    useEffect(() => {
        // SEO Meta Güncellemesi
        document.title = "Okul Servisi Takip Programı ve Veli Bilgilendirme Sistemi | ServisBot";
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute(
                'content',
                'ServisBot Okul Servisi Takip Programı ile canlı veli takibi, SMS/WhatsApp bildirimleri, yapay zeka güzergah rotalaması ve dijital veli sözleşmesini tek merkezden yönetin.'
            );
        }
        window.scrollTo(0, 0);
    }, []);

    const schemaData = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "ServisBot Okul Servisi Takip Programı",
        "applicationCategory": "EducationalApplication, BusinessApplication",
        "operatingSystem": "Web, iOS, Android",
        "url": "https://www.servisbot.pro/okul-servisi-takip-programi",
        "description": "Özel kolejler, okul servis şirketleri ve şoförler için yapay zeka destekli canlı veli takibi, güzergah optimizasyonu ve dijital sözleşme platformu.",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "TRY",
            "availability": "https://schema.org/InStock"
        }
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
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="max-w-3xl mx-auto text-center space-y-6">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                            <Bus size={14} className="text-blue-400" />
                            Öğrenci & Okul Servisi Taşımacılığı İçin Özel Çözüm
                        </div>

                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
                            Okul Servislerinde <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300">
                                Sıfır Telefon Trafiği, Tam Güvenlik
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
                            Endişeli veli aramalarını sonlandırın. Öğrenci velilerine uygulama indirtmeden canlı harita takibi, 30 saniyede dijital sözleşme ve yapay zeka güzergah yönetimi sunun.
                        </p>

                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/register" className="w-full sm:w-auto">
                                <button className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
                                    Hemen Ücretsiz Başla
                                    <ArrowRight size={20} />
                                </button>
                            </Link>
                            <a
                                href="https://wa.me/905054171299?text=Merhaba,%20okul%20servis%20takip%20program%C4%B1%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold text-base transition-colors flex items-center justify-center gap-2"
                            >
                                <PhoneCall size={18} className="text-blue-400" />
                                Okulunuz İçin Bilgi Alın
                            </a>
                        </div>

                        {/* Güven Rozetleri */}
                        <div className="pt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-800/80 text-xs text-slate-400 max-w-xl mx-auto">
                            <div className="flex items-center justify-center gap-1.5">
                                <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
                                <span>MEB & UKOME Uyumlu</span>
                            </div>
                            <div className="flex items-center justify-center gap-1.5">
                                <Smartphone size={16} className="text-blue-400 flex-shrink-0" />
                                <span>Veliye Uygulama Şartı Yok</span>
                            </div>
                            <div className="flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1">
                                <CheckCircle2 size={16} className="text-indigo-400 flex-shrink-0" />
                                <span>Sıfır Donanım Maliyeti</span>
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
                            <div className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">%25</div>
                            <div className="text-xs md:text-sm text-slate-400 mt-1 font-medium">Akaryakıt Tasarrufu</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300">0 TL</div>
                            <div className="text-xs md:text-sm text-slate-400 mt-1 font-medium">Cihaz & Montaj Masrafı</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">30 sn</div>
                            <div className="text-xs md:text-sm text-slate-400 mt-1 font-medium">Dijital Sözleşme İmzalama</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300">%99</div>
                            <div className="text-xs md:text-sm text-slate-400 mt-1 font-medium">Veli Memnuniyeti</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Okul Servislerine Özel 6 Temel Özellik */}
            <section className="py-20 md:py-28 bg-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                            Öğrenci Güvenliği & Operasyon
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            Okul Servisi Taşımacılığında <br />
                            İhtiyacınız Olan Her Şey Tek Ekranda
                        </h2>
                        <p className="text-slate-400 text-base">
                            Karmaşık Excel tabloları ve sürekli çalan şoför telefonları yerine akıllı servis yönetim teknolojisine geçin.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {schoolFeatures.map((feat, idx) => {
                            const IconComponent = feat.icon;
                            return (
                                <div
                                    key={idx}
                                    className="p-8 rounded-3xl bg-slate-800/40 border border-slate-700/60 hover:border-blue-500/40 hover:bg-slate-800/70 transition-all duration-300 flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feat.color} flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform`}>
                                            <IconComponent size={26} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
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

            {/* Veli Sözleşmesi ve Hukuki Güvence Bölümü */}
            <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-950 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="p-8 md:p-14 rounded-3xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/30 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10">
                        <div className="max-w-2xl space-y-5">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                <FileText size={14} />
                                Yasal ve Hukuki Güvence
                            </div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                                Velilerinize 30 Saniyede WhatsApp'tan Sözleşme İmzalatın
                            </h2>
                            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                                Dönem başlarında yüzlerce sayfayı yazdırma, veliye ulaştırma ve imza peşinde koşma çilesine son verin. Veliniz telefonuna gelen SMS/WhatsApp bağlantısından sözleşmeyi okur, parmağıyla dijital imzasını atar. Zaman damgası ve IP kaydıyla resmi mevzuata tam uyumludur.
                            </p>
                            <ul className="space-y-2.5 text-sm text-slate-300">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                    6098 sayılı Türk Borçlar Kanunu standartlarında e-onay
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                    Tek tıkla PDF sözleşme çıktısı ve arşivleme
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                    KVKK ve veli aydınlatma metinleri hazır entegre
                                </li>
                            </ul>
                        </div>
                        <div className="flex-shrink-0 text-center lg:text-right">
                            <Link to="/register">
                                <button className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-xl shadow-blue-500/30 transition-all">
                                    Sözleşme Modülünü İnceleyin
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Okul Servisi SSS */}
            <section className="py-20 bg-slate-950">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                            Okul Servis Takip Sistemi Hakkında Merak Edilenler
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {schoolFaqs.map((faq, idx) => (
                            <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                                <h3 className="font-bold text-white text-base md:text-lg flex items-start gap-2">
                                    <Clock size={18} className="text-blue-400 mt-1 flex-shrink-0" />
                                    {faq.q}
                                </h3>
                                <p className="text-sm md:text-base text-slate-400 pl-6 leading-relaxed">
                                    {faq.a}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Son CTA */}
                    <div className="mt-16 text-center p-8 rounded-3xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/20">
                        <h3 className="text-2xl font-bold text-white mb-2">Servis Filonuzu Hemen Akıllandırın</h3>
                        <p className="text-slate-400 text-sm mb-6 max-w-lg mx-auto">
                            15 öğrenciye kadar ücretsiz kayıt olun, ilk güzergahınızı ve veli takip linkinizi 5 dakikada oluşturun.
                        </p>
                        <Link to="/register">
                            <button className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-lg shadow-blue-500/25 transition-all">
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

export default SchoolBusLanding;
