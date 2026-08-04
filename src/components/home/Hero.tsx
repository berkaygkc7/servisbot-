import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import MapScene from '../map/MapScene';

const Hero: React.FC = () => {
    // Ankara Center (Longitude, Latitude)
    const baseCenter = useMemo<[number, number]>(() => [32.8597, 39.9334], []);

    return (
        <div className="relative bg-[#0f172a] min-h-screen flex items-center pt-20 overflow-hidden">
            {/* Background Overlay */}
            <div className="absolute inset-0 opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

            {/* Abstract Shapes */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl opacity-20"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                    {/* Left Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="space-y-6 md:space-y-8 pb-12 lg:pb-0"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-blue-200 text-xs font-semibold tracking-wide uppercase">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                            Yeni Nesil Servis Yönetimi
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
                            Servis Taşımacılığında <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                                Dijital Dönüşüm
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-300 max-w-lg leading-relaxed">
                            Öğrenci ve personel taşımacılığını yapay zeka destekli rotalar, canlı takip ve akıllı bildirimlerle yönetin. Kağıt işlerini unutun.
                        </p>

                        <div className="hidden md:flex flex-col sm:flex-row gap-4">
                            <Link to="/register">
                                <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-secondary text-white font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:bg-blue-600 transition-all duration-300 flex items-center justify-center gap-2 group">
                                    Hemen Başla
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </Link>
                        </div>

                        <div className="pt-8 grid grid-cols-2 gap-4 border-t border-white/10">
                            {['Öğrenci Yönetimi', 'Personel Kayıtları', 'Otomatik Puantaj', 'Fatura Yönetimi'].map((item) => (
                                <div key={item} className="flex items-center gap-2 text-slate-300 text-sm">
                                    <CheckCircle2 size={16} className="text-secondary" />
                                    {item}
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right Content - Map Visualization */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative h-[600px] hidden lg:block"
                    >
                        {/* Map Container Frame */}
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-2 border border-slate-700 shadow-2xl skew-y-3 transform hover:skew-y-0 transition-transform duration-700 ease-out">
                            <div className="absolute inset-0 rounded-3xl overflow-hidden opacity-90">
                                <MapScene
                                    className="h-full w-full"
                                    center={baseCenter}
                                    zoom={11}
                                    hideControls={true}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Hero;
