import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { Building2, GraduationCap, BusFront } from 'lucide-react';
const AnimatedCounter = ({ value, duration = 2 }: { value: number, duration?: number }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, {
        duration: duration * 1000,
        bounce: 0,
    });

    useEffect(() => {
        motionValue.set(value);
    }, [motionValue, value]);

    useEffect(() => {
        return springValue.on("change", (latest) => {
            if (ref.current) {
                ref.current.textContent = Intl.NumberFormat("tr-TR").format(Math.floor(latest));
            }
        });
    }, [springValue]);

    return <span ref={ref}>0</span>;
};

const LiveStatsSection: React.FC = () => {
    const [stats] = useState({
        companies: 120,
        students: 5400,
        vehicles: 850
    });
    
    // We use a ref to trigger animation only when the section is in view
    const sectionRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(sectionRef, { once: true, margin: "-100px 0px" });

    const statCards = [
        {
            title: "Kurumsal Firma",
            value: stats.companies,
            icon: Building2,
            color: "from-blue-600 to-indigo-600",
            iconBg: "bg-gradient-to-br from-blue-50 to-indigo-100",
            iconColor: "text-blue-600",
            glow: "group-hover:shadow-blue-500/20 group-hover:border-blue-200",
            suffix: "+"
        },
        {
            title: "Mutlu Öğrenci",
            value: stats.students,
            icon: GraduationCap,
            color: "from-emerald-500 to-teal-500",
            iconBg: "bg-gradient-to-br from-emerald-50 to-teal-100",
            iconColor: "text-emerald-600",
            glow: "group-hover:shadow-emerald-500/20 group-hover:border-emerald-200",
            suffix: "+"
        },
        {
            title: "Aktif Araç",
            value: stats.vehicles,
            icon: BusFront,
            color: "from-amber-500 to-orange-500",
            iconBg: "bg-gradient-to-br from-amber-50 to-orange-100",
            iconColor: "text-amber-600",
            glow: "group-hover:shadow-amber-500/20 group-hover:border-amber-200",
            suffix: "+"
        }
    ];

    return (
        <section className="py-24 bg-slate-50 relative overflow-hidden" ref={sectionRef}>
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="absolute top-[60%] left-[40%] w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                            Büyüyen <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">ServisBot</span> Ailesi
                        </h2>
                        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                            Her gün binlerce öğrenci ve yüzlerce aracın operasyonunu güvenle yönetiyoruz. Operasyonunuzu dijitalleştirin, yükünüzü hafifletin.
                        </p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 xl:gap-12">
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.title}
                                initial={{ opacity: 0, y: 30 }}
                                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                                transition={{ duration: 0.6, delay: index * 0.2 }}
                                className="relative group cursor-default"
                            >
                                {/* Animated background glow */}
                                <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-10 rounded-[2rem] transition-opacity duration-500 blur-2xl`} />
                                
                                <div className={`relative bg-white/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-sm border border-slate-200 transition-all duration-500 group-hover:-translate-y-2 ${stat.glow} group-hover:shadow-2xl h-full flex flex-col justify-between`}>
                                    
                                    {/* Floating Icon Container */}
                                    <div className="relative mb-8">
                                        <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-20 blur-xl rounded-full group-hover:opacity-40 transition-opacity duration-500 scale-150`} />
                                        <div className={`relative w-20 h-20 rounded-2xl ${stat.iconBg} border border-white flex items-center justify-center shadow-sm transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`}>
                                            <Icon size={40} strokeWidth={1.5} className={stat.iconColor} />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div className="flex items-baseline mb-3">
                                            <h3 className="text-5xl font-black text-slate-900 tracking-tighter">
                                                {isInView ? <AnimatedCounter value={stat.value} /> : "0"}
                                            </h3>
                                            <span className={`text-4xl font-bold ml-1 text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>
                                                {stat.suffix}
                                            </span>
                                        </div>
                                        
                                        <p className="text-slate-500 font-bold uppercase tracking-wider text-sm">
                                            {stat.title}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default LiveStatsSection;
