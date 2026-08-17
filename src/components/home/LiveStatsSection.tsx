import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { Building2, Users, Bus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Animated Counter Component
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
    const [stats, setStats] = useState({
        companies: 0,
        students: 0,
        vehicles: 0
    });
    const [isLoaded, setIsLoaded] = useState(false);
    
    // We use a ref to trigger animation only when the section is in view
    const sectionRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(sectionRef, { once: true, margin: "-100px 0px" });

    const fetchStats = async () => {
        try {
            // Fetch real stats using the existing SuperAdmin RPC function
            const { data, error } = await supabase.rpc('sa_get_advanced_stats');
            
            if (data && !error) {
                setStats({
                    companies: data.total_companies || 0,
                    students: data.total_students || 0,
                    vehicles: data.total_vehicles || 0
                });
            }
        } catch (error) {
            console.error('Error fetching live stats:', error);
        } finally {
            setIsLoaded(true);
        }
    };

    useEffect(() => {
        fetchStats();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('public_stats_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
                fetchStats(); // Re-fetch on any company change
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
                fetchStats(); // Re-fetch on any student change
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
                fetchStats(); // Re-fetch on any vehicle change
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const statCards = [
        {
            title: "Kayıtlı Firma",
            value: stats.companies,
            icon: Building2,
            color: "from-blue-500 to-indigo-600",
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
            suffix: "+"
        },
        {
            title: "Taşınan Öğrenci",
            value: stats.students,
            icon: Users,
            color: "from-emerald-400 to-teal-500",
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-600",
            suffix: "+"
        },
        {
            title: "Aktif Araç",
            value: stats.vehicles,
            icon: Bus,
            color: "from-amber-400 to-orange-500",
            iconBg: "bg-amber-100",
            iconColor: "text-amber-600",
            suffix: "+"
        }
    ];

    return (
        <section className="py-20 bg-slate-50 relative overflow-hidden" ref={sectionRef}>
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            Büyüyen <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">ServisBot</span> Ailesi
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Her gün binlerce öğrenci ve yüzlerce aracın operasyonunu güvenle yönetiyoruz.
                        </p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.title}
                                initial={{ opacity: 0, y: 30 }}
                                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                                transition={{ duration: 0.6, delay: index * 0.2 }}
                                className="relative group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-300 blur-xl"
                                     style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }}
                                ></div>
                                <div className="relative bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:border-blue-100 transition-colors hover:-translate-y-1 transform duration-300">
                                    
                                    <div className={`w-16 h-16 rounded-2xl ${stat.iconBg} flex items-center justify-center mb-6`}>
                                        <Icon size={32} className={stat.iconColor} />
                                    </div>
                                    
                                    <div className="flex items-baseline mb-2">
                                        <h3 className="text-4xl md:text-5xl font-extrabold text-slate-900">
                                            {isInView ? <AnimatedCounter value={stat.value} /> : "0"}
                                        </h3>
                                        <span className={`text-3xl font-bold ml-1 text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>
                                            {stat.suffix}
                                        </span>
                                    </div>
                                    
                                    <p className="text-slate-500 font-medium text-lg">
                                        {stat.title}
                                    </p>
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
