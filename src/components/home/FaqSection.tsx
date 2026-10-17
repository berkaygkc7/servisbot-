import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Sparkles, MessageCircleQuestion } from 'lucide-react';

interface FaqItem {
    question: string;
    answer: string;
    category?: string;
}

const faqs: FaqItem[] = [
    {
        question: "ServisBot nedir ve kimler için uygundur?",
        answer: "ServisBot; öğrenci ve personel servis taşımacılığı yapan servis kooperatifleri, servis şirketleri, özel okullar ve kurumsal fabrika filo yöneticileri için geliştirilmiş yeni nesil yapay zeka destekli servis yönetim platformudur. Akıllı rota optimizasyonu, canlı veli/yolcu takibi, dijital sözleşme yönetimi ve otomatik puantaj işlemlerini tek merkezden yönetmenizi sağlar.",
        category: "Genel"
    },
    {
        question: "Öğrenci velilerinin mobil uygulama indirmesi zorunlu mu?",
        answer: "Hayır, velilerin herhangi bir mobil uygulama indirmesi zorunlu değildir. Veliler kendilerine SMS veya WhatsApp ile iletilen güvenli takip linkine tıklayarak servisin canlı konumunu, öğrencinin biniş/iniş durumunu ve servisin durağa yaklaşma süresini tarayıcı üzerinden kolayca takip edebilir.",
        category: "Veli & Öğrenci"
    },
    {
        question: "Dijital veli sözleşmesi hukuken geçerli midir?",
        answer: "Evet. ServisBot üzerinden velilere iletilen sözleşmeler; 6098 sayılı Türk Borçlar Kanunu ve Elektronik Ticaret mevzuatına uygun olarak zaman damgası, IP kaydı ve dijital e-imza onay altyapısıyla kayıt altına alınır. Kağıt sözleşme karmaşasını ve evrak kayıplarını tamamen ortadan kaldırır.",
        category: "Sözleşme & Hukuk"
    },
    {
        question: "Yapay zeka rota optimizasyonu ne kadar yakıt ve zaman tasarrufu sağlar?",
        answer: "ServisBot'un yapay zeka algoritması; öğrenci adreslerini, okul/fabrika giriş saatlerini ve canlı trafik yoğunluğunu analiz ederek en ideal rotayı saniyeler içinde hesaplar. Bu sayede servis araçlarında ortalama %22 ila %28 oranında akaryakıt tasarrufu ve sefer başına 35-40 dakikaya varan zaman kazancı sağlanır.",
        category: "Rota & AI"
    },
    {
        question: "Sistemi kullanmak için araçlara özel GPS takip cihazı taktırmak gerekir mi?",
        answer: "Hayır. Servis araçlarına yüksek maliyetli araç takip donanımları veya aylık SIM kart abonelikleri bağlamanıza gerek yoktur. Sürücünün veya rehber personelin akıllı telefonundaki ServisBot Mobil Uygulaması (Android & iOS), yüksek hassasiyetli canlı konum takibi için yeterlidir.",
        category: "Donanım"
    },
    {
        question: "Otomatik puantaj ve hakediş sistemi nasıl çalışır?",
        answer: "Sürücünün gerçekleştirdiği günlük seferler ve öğrenci yoklamaları sisteme gerçek zamanlı kaydedilir. Ay sonunda tek bir tıkla şoför hak edişleri, firma faturalandırmaları ve öğrenci/personel puantaj cetvelleri Excel ve PDF formatında otomatik olarak oluşturulur.",
        category: "Muhasebe"
    },
    {
        question: "ServisBot'u ücretsiz deneyebilir miyim?",
        answer: "Evet! ServisBot'a kredi kartı gerekmeden hemen ücretsiz üye olabilir; 15 öğrenciye kadar araçlarınızı, rotalarınızı ve veli takip özelliklerini hemen ücretsiz deneyimleyebilirsiniz.",
        category: "Fiyatlandırma"
    }
];

export const FaqSection: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggleFaq = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    // Schema.org FAQPage JSON-LD for Search Engines & Generative AI Engines (GEO)
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(item => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer
            }
        }))
    };

    return (
        <section id="sss" className="py-24 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white relative overflow-hidden">
            {/* SEO/GEO FAQPage Schema Script */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            {/* Arka Plan Işık Efektleri */}
            <div className="absolute top-1/4 left-0 -ml-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-0 -mr-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Başlık Alanı */}
                <div className="text-center space-y-4 mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase">
                        <Sparkles size={14} className="text-blue-400" />
                        Merak Edilenler & Rehber
                    </div>
                    <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
                        Sıkça Sorulan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Sorular</span>
                    </h2>
                    <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
                        Servis taşımacılığında dijital dönüşüm, rota yapay zekası ve sözleşme süreçleri hakkında tüm merak edilenleri derledik.
                    </p>
                </div>

                {/* Soru-Cevap Akordeon Listesi */}
                <div className="space-y-4">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                                    isOpen
                                        ? 'bg-slate-800/80 border-blue-500/40 shadow-lg shadow-blue-500/10'
                                        : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600'
                                }`}
                            >
                                <button
                                    onClick={() => toggleFaq(index)}
                                    className="w-full py-5 px-6 flex items-center justify-between gap-4 text-left cursor-pointer focus:outline-none"
                                    aria-expanded={isOpen}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl transition-colors ${
                                            isOpen ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/40 text-slate-400'
                                        }`}>
                                            <HelpCircle size={18} />
                                        </div>
                                        <span className="font-semibold text-base md:text-lg text-slate-100">
                                            {faq.question}
                                        </span>
                                    </div>
                                    <div className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-400' : 'text-slate-400'}`}>
                                        <ChevronDown size={20} />
                                    </div>
                                </button>

                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            key="content"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                        >
                                            <div className="px-6 pb-6 pt-1 text-slate-300 text-sm md:text-base leading-relaxed border-t border-slate-700/40">
                                                {faq.answer}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Ek Destek / Çağrı Kutusu */}
                <div className="mt-12 text-center p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-left">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                            <MessageCircleQuestion size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-base">Farklı bir sorunuz mu var?</h4>
                            <p className="text-slate-400 text-xs sm:text-sm">Filo operasyonunuza özel detaylar için ekibimizle anında görüşün.</p>
                        </div>
                    </div>
                    <a
                        href="https://wa.me/905054171299?text=Merhaba,%20ServisBot%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors shadow-md shadow-blue-500/20 whitespace-nowrap"
                    >
                        WhatsApp'tan Sorun
                    </a>
                </div>
            </div>
        </section>
    );
};

export default FaqSection;
