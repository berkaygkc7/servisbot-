import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
    {
        name: 'Ücretsiz',
        monthlyPrice: 0,
        yearlyPrice: 0,
        description: 'Sistemi ücretsiz deneyerek ServisBot\'un temel özelliklerini hemen keşfedin.',
        features: [
            { name: '1 Araç ve 1 Şoför Ekleme', included: true },
            { name: '15 Öğrenciye Kadar Kayıt', included: true },
            { name: '1 Aktif Rota ve Sefer Takibi', included: true },
            { name: 'Temel Tahsilat ve Gider Yönetimi', included: false },
            { name: 'Telefon Desteği', included: false },
            { name: 'Sürücü Mobil App & QR Yoklama', included: false },
            { name: 'Canlı Rota Takibi ve Harita', included: false },
            { name: 'Veli Bilgilendirme (SMS/App)', included: false },
            { name: 'Personel İzin & Mesai Yönetimi', included: false },
            { name: 'Otomatik Akıllı Rotalama', included: false },
        ],
        buttonText: 'Ücretsiz Başla',
        buttonVariant: 'outline',
        recommended: false
    },
    {
        name: 'Profesyonel',
        monthlyPrice: 1999,
        yearlyPrice: 1599,
        description: 'Büyüyen ve profesyonelleşen servis filoları için tüm sınırları kaldıran tam kontrol.',
        features: [
            { name: 'Sınırsız Araç ve Şoför Yönetimi', included: true },
            { name: 'Sınırsız Öğrenci ve Rota Kaydı', included: true },
            { name: 'Tüm Gelişmiş Finans & Ön Muhasebe', included: true },
            { name: 'Sürücü Mobil App & QR ile Yoklama', included: true },
            { name: 'Canlı Rota Takibi ve Canlı Harita', included: true },
            { name: 'Gelişmiş Veli Bilgilendirme Sistemi', included: true },
            { name: 'Şoför İzinleri ve Mesai Takibi', included: true },
            { name: 'Akıllı Otomatik Rotalama Sistemi', included: true },
            { name: '7/24 Öncelikli Teknik Destek', included: true },
            { name: 'Kurumsal Raporlama ve Analizler', included: true },
        ],
        buttonText: 'Hemen Yükselt',
        buttonVariant: 'primary',
        recommended: true,
        badge: 'En Popüler'
    }
];

const Pricing: React.FC = () => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    return (
        <div id="fiyatlandırma" className="py-16 md:py-24 bg-white relative">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-50 to-white"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">
                        İhtiyacınıza Uygun <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Esnek Planlar</span>
                    </h2>
                    <p className="text-lg text-slate-600 mb-8">
                        Şeffaf fiyatlandırma, gizli ücret yok. İşinizi büyütürken karlılığınızı koruyun.
                    </p>

                    {/* Toggle Switch */}
                    <div className="flex items-center justify-center gap-4">
                        <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-500'}`}>Aylık</span>
                        <button
                            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                            className="relative w-16 h-8 bg-slate-200 rounded-full p-1 cursor-pointer transition-colors hover:bg-slate-300"
                        >
                            <motion.div
                                className="w-6 h-6 bg-white rounded-full shadow-md"
                                layout
                                transition={{ type: "spring", stiffness: 700, damping: 30 }}
                                style={{
                                    x: billingCycle === 'monthly' ? 0 : 32
                                }}
                            />
                        </button>
                        <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-500'}`}>
                            Yıllık <span className="ml-1 text-green-600 text-xs font-bold bg-green-100 px-2 py-0.5 rounded-full">%20 İndirim</span>
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative rounded-3xl p-6 md:p-8 flex flex-col transition-all duration-300 ${plan.recommended
                                ? 'bg-white border-2 border-blue-500 shadow-2xl md:scale-105 z-10 ring-4 ring-blue-500/10'
                                : 'bg-slate-50 border border-slate-200 hover:border-blue-200 hover:shadow-xl'
                                }`}
                        >
                            {plan.recommended && (
                                <div className="absolute top-0 right-0 left-0 flex justify-center -mt-4">
                                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wider">
                                        {plan.badge}
                                    </span>
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{plan.description}</p>
                            </div>

                            <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                <div className="flex items-end justify-center gap-1">
                                    <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                                        {plan.monthlyPrice === 0 ? 'Ücretsiz' : `₺${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}`}
                                    </span>
                                    {plan.monthlyPrice !== 0 && (
                                        <span className="text-slate-500 font-medium mb-1">/ay</span>
                                    )}
                                </div>
                                {billingCycle === 'yearly' && plan.monthlyPrice !== 0 && (
                                    <p className="text-xs text-green-600 font-bold mt-2">
                                        ₺{(plan.monthlyPrice * 12) - (plan.yearlyPrice * 12)} tasarruf et
                                    </p>
                                )}
                            </div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start text-sm">
                                        {feature.included ? (
                                            <div className="p-0.5 rounded-full bg-blue-100 text-blue-600 mr-3 mt-0.5">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                        ) : (
                                            <div className="p-0.5 rounded-full bg-slate-100 text-slate-300 mr-3 mt-0.5">
                                                <X className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                        <span className={feature.included ? 'text-slate-700 font-medium' : 'text-slate-400 line-through decoration-slate-300'}>
                                            {feature.name}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <Link to={`/register?plan=${plan.name.toLowerCase()}`} className="w-full">
                                <button className={`w-full py-4 rounded-xl font-bold transition-all duration-300 ${plan.buttonVariant === 'primary'
                                    ? 'bg-slate-900 text-white hover:bg-blue-600 shadow-lg hover:shadow-blue-500/30 hover:-translate-y-1'
                                    : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                    }`}>
                                    {plan.buttonText}
                                </button>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-16 bg-slate-50 rounded-2xl p-6 border border-slate-200 flex items-start gap-4 max-w-4xl mx-auto">
                    <Info className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                    <div>
                        <h4 className="font-bold text-slate-900 mb-1">Kurumsal İhtiyaçlarınız mı Var?</h4>
                        <p className="text-sm text-slate-600">
                            Çoklu şube, özel entegrasyonlar veya on-premise kurulum gereksinimleriniz için satış ekibimizle görüşebilirsiniz. Size özel bir teklif hazırlayalım.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Pricing;
