import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { ChevronRight, Activity } from 'lucide-react';
import Lottie from 'lottie-react';
import type { LottieRefCurrentProps } from 'lottie-react';

const features = [
    {
        iconData: '/assets/lottie/route-ai.json',
        title: 'Otomatik Rota Oluşturma',
        description: 'AI algoritmamız ile en hızlı ve en verimli rotaları saniyeler içinde oluşturun. Trafik, öğrenci konumu ve okul saati gibi değişkenleri anlık analiz eder.',
        color: 'from-blue-500 to-cyan-500',
        textColor: 'text-blue-500',
        borderColor: 'group-hover:border-blue-500/50',
        shadowColor: 'group-hover:shadow-blue-500/20',
        delay: 0,
        span: 'md:col-span-2',
        gif: '/assets/features/otomatik-rota.gif'
    },
    {
        iconData: '/assets/lottie/route-manual.json',
        title: 'Manuel Rota Çizimi',
        description: 'İstisnai durumlar için harita üzerinde kendi servis güzergahlarınızı tıklayarak özgürce çizin.',
        color: 'from-fuchsia-500 to-pink-500',
        textColor: 'text-fuchsia-500',
        borderColor: 'group-hover:border-fuchsia-500/50',
        shadowColor: 'group-hover:shadow-fuchsia-500/20',
        delay: 0.1,
        span: 'md:col-span-1',
        gif: '/assets/features/manuel-rota.gif'
    },
    {
        iconData: '/assets/lottie/students.json',
        title: 'Kapsamlı Öğrenci Yönetimi',
        description: 'Öğrenci adresleri, veli iletişim numaraları, sağlık durumları (alerji/kan grubu) ve okul programlarını tek merkezden kusursuz yönetin. Harita üzerinden pin ile ev konumu atayın.',
        color: 'from-emerald-500 to-teal-500',
        textColor: 'text-emerald-500',
        borderColor: 'group-hover:border-emerald-500/50',
        shadowColor: 'group-hover:shadow-emerald-500/20',
        delay: 0.2,
        span: 'md:col-span-1'
    },
    {
        iconData: '/assets/lottie/finance.json',
        title: 'Dinamik Fiyatlandırma & Tahsilat',
        description: 'Ödemeleri kolayca takip edin. İlkokul, ortaokul, lise veya bireysel özel fiyatlandırma tanımlamaları yaparak gelişmiş finans takibi gerçekleştirin.',
        color: 'from-indigo-500 to-violet-500',
        textColor: 'text-indigo-500',
        borderColor: 'group-hover:border-indigo-500/50',
        shadowColor: 'group-hover:shadow-indigo-500/20',
        delay: 0.3,
        span: 'md:col-span-1'
    },
    {
        iconData: '/assets/lottie/bus.json',
        title: 'Araç ve Sürücü Eşleştirme',
        description: 'Servis filonuzun bakım evraklarını takip edin. Şoförleri rotalara atayın ve araç kapasite aşımlarına karşı otomatik sistem uyarısıyla güvenliği sağlayın.',
        color: 'from-amber-500 to-orange-500',
        textColor: 'text-amber-500',
        borderColor: 'group-hover:border-amber-500/50',
        shadowColor: 'group-hover:shadow-amber-500/20',
        delay: 0.4,
        span: 'md:col-span-1'
    },
    {
        iconData: '/assets/lottie/dashboard.json',
        title: 'Detaylı Analitik Dashboard',
        description: 'Gerçek zamanlı gösterge paneli sayesinde filonuzdaki tüm işlemlere anlık olarak hakim olun, araç doluluğunu, gecikmeleri ve finansal akışı bir bakışta görselleştirin.',
        color: 'from-sky-500 to-blue-600',
        textColor: 'text-sky-500',
        borderColor: 'group-hover:border-sky-500/50',
        shadowColor: 'group-hover:shadow-sky-500/20',
        delay: 0.5,
        span: 'md:col-span-2',
        lottieClassName: 'w-56 h-56 -mt-8'
    },
    {
        iconData: '/assets/lottie/mobileApp.json',
        title: 'Sürücü & Veli Mobil Uygulaması',
        description: 'Veliler cep telefonlarından öğrencilerin eve yaklaştığını anlık görebilirken, şoförler telefonlarındaki yapay zeka destekli navigasyon ile adreslere kolayca ulaşır.',
        color: 'from-rose-500 to-pink-600',
        textColor: 'text-rose-500',
        borderColor: 'group-hover:border-rose-500/50',
        shadowColor: 'group-hover:shadow-rose-500/20',
        delay: 0.6,
        span: 'md:col-span-1'
    }
];

const FeatureCard = ({ feature }: { feature: any }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const lottieRef = useRef<LottieRefCurrentProps>(null);
    const [animationData, setAnimationData] = useState<any>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

    useEffect(() => {
        fetch(feature.iconData)
            .then((res) => res.json())
            .then((data) => setAnimationData(data))
            .catch((err) => console.error("Could not load Lottie JSON: ", err));
    }, [feature.iconData]);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        x.set(clientX - left);
        y.set(clientY - top);
    }

    const handleMouseEnter = () => {
        if (lottieRef.current) {
            lottieRef.current.play();
        }
    };

    const handleMouseLeave = () => {
        if (lottieRef.current) {
            lottieRef.current.stop();
        }
    };

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: feature.delay }}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`${feature.span} group relative rounded-3xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors duration-300`}
        >
            {/* Background Effects Container */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
                {/* Animated Gradient Border Effect */}
                <motion.div
                    className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-500 group-hover:opacity-100"
                    style={{
                        background: useMotionTemplate`
                            radial-gradient(
                                800px circle at ${mouseX}px ${mouseY}px,
                                var(--tw-gradient-from),
                                transparent 40%
                            )
                        `,
                    }}
                />

                {/* Strong Spotlight */}
                <motion.div
                    className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-500 group-hover:opacity-100 mix-blend-overlay"
                    style={{
                        background: useMotionTemplate`
                            radial-gradient(
                                400px circle at ${mouseX}px ${mouseY}px,
                                rgba(255, 255, 255, 0.4),
                                transparent 80%
                            )
                        `,
                    }}
                />
            </div>

            {/* Hover Popup GIF Tooltip */}
            {feature.gif && (
                <div className="absolute z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] max-w-[95vw] rounded-[24px] bg-white shadow-2xl shadow-slate-900/40 border border-slate-200 p-3 opacity-0 hidden md:group-hover:block md:group-hover:opacity-100 transition-all duration-300 pointer-events-none scale-95 md:group-hover:scale-100 origin-center">
                    <div className="rounded-xl overflow-hidden bg-slate-100 relative shadow-inner ring-1 ring-slate-900/5">
                        <img
                            src={feature.gif}
                            alt={`${feature.title} Preview`}
                            className="w-full h-auto object-cover"
                        />
                    </div>
                </div>
            )}

            <div className={`relative h-full p-6 md:p-8 flex flex-col justify-between z-10 border border-transparent ${feature.borderColor} rounded-3xl transition-colors duration-300`}>
                {/* Icon Background Blob */}
                <div className={`absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 rounded-full bg-gradient-to-br ${feature.color} opacity-5 blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-20 pointer-events-none z-0`}></div>

                <div className={`mb-6 transform transition-all duration-500 group-hover:-translate-y-3 relative z-10 flex w-full`}>
                    {animationData ? (
                        <div className={`${feature.lottieClassName || 'w-32 h-32'} group-hover:scale-110 transition-transform duration-500 drop-shadow-lg group-hover:drop-shadow-2xl`}>
                            <Lottie
                                lottieRef={lottieRef}
                                animationData={animationData}
                                loop={true}
                                autoplay={false}
                                className="w-full h-full"
                            />
                        </div>
                    ) : (
                        <div className={`${feature.lottieClassName || 'w-32 h-32'} flex items-center justify-start pl-4`}>
                            <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                        {feature.title}
                        <ChevronRight className="w-5 h-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-blue-500" />
                    </h3>
                    <p className="text-slate-500 leading-relaxed text-sm font-medium group-hover:text-slate-600 transition-colors">
                        {feature.description}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

const FeatureSection: React.FC = () => {
    return (
        <div id="özellikler" className="py-16 md:py-24 bg-slate-50/50 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-20 relative">
                    {/* Floating Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span>Premium Özellikler</span>
                    </motion.div>

                    <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 md:mb-6 tracking-tight tight-letter-spacing">
                        Her Şey <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Tek Platformda</span>
                    </h2>
                    <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-light">
                        Servis yönetiminin karmaşıklığını modern araçlarla sadeleştirin.
                        İşinizi büyütmeniz için gereken tüm özellikler burada.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(280px,auto)] perspective-1000">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} feature={feature} />
                    ))}
                </div>


            </div>
        </div>
    );
};

export default FeatureSection;
