import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import logo from '../../assets/yeni_navbar_logo.png';

interface NavbarProps {
    forceSolid?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ forceSolid = false }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { scrollY } = useScroll();
    const location = useLocation();

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    useMotionValueEvent(scrollY, "change", (latest) => {
        setIsScrolled(latest > 50);
    });

    const solid = isScrolled || forceSolid;

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    type NavItem = {
        title: string;
        items: {
            label: string;
            desc: string;
            href?: string;
        }[];
    };

    const navItems: NavItem[] = [
        {
            title: 'Özellikler',
            items: [
                { label: 'Öğrenci Yönetimi', desc: 'Öğrenci kayıtları ve devamsızlık takibi' },
                { label: 'Puantaj ve Hakediş', desc: 'Otomatik hakediş ve maaş hesaplamaları' },
                { label: 'Finans ve Muhasebe', desc: 'Fatura, gelir/gider ve ödeme takibi' },
                { label: 'Araç & Şoför Kayıtları', desc: 'Filo ve personel bilgilerini yönetin' },
            ]
        },
        {
            title: 'Çözümler',
            items: [
                { label: 'Okul Servisleri', desc: 'Okul ve kreş taşımacılığı' },
                { label: 'Personel Servisleri', desc: 'Fabrika ve şirket taşımacılığı' },
                { label: 'Kurumsal Firmalar', desc: 'Geniş filoya sahip operasyonlar' },
            ]
        },
        {
            title: 'İletişim',
            items: [
                { label: 'Eren Canıkatı', desc: '0505 045 17 11', href: 'tel:+905050451711' },
                { label: 'Berkay Gökçe', desc: '0505 417 12 99', href: 'tel:+905054171299' },
            ]
        }
    ];

    return (
        <>
            <motion.nav
                className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${solid ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'
                    }`}
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-2 cursor-pointer outline-none z-50">
                            <img
                                src={logo}
                                alt="ServisBot Logo"
                                className={`h-20 w-[240px] md:w-[280px] object-contain object-left transition-all duration-300 transform md:scale-125 scale-110 ${solid || isMobileMenuOpen ? 'brightness-0 opacity-80' : 'brightness-100 opacity-90'}`}
                            />
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-6">
                            {navItems.map((menu) => (
                                <div key={menu.title} className="relative group">
                                    <button className={`flex items-center gap-1 text-sm font-semibold transition-colors hover:text-secondary py-6 ${solid ? 'text-slate-700' : 'text-slate-100 hover:text-white'}`}>
                                        {menu.title}
                                        <ChevronDown size={14} className="opacity-70 group-hover:rotate-180 transition-transform duration-200" />
                                    </button>

                                    {/* Dropdown */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-4">
                                        {menu.items.map((item, idx) => (
                                            <a 
                                                key={idx} 
                                                href={item.href || '#'} 
                                                className="block p-3 rounded-xl hover:bg-slate-50 transition-colors group/item"
                                            >
                                                <div className="text-sm font-bold text-slate-800 group-hover/item:text-primary transition-colors">{item.label}</div>
                                                <div className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Auth Buttons */}
                        <div className="hidden md:flex items-center gap-4">
                            <Link to="/login">
                                <button className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${solid
                                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg'
                                    : 'bg-white text-primary hover:bg-slate-50 shadow-none'
                                    }`}>
                                    Giriş Yap
                                </button>
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center z-50">
                            <button 
                                onClick={toggleMobileMenu}
                                className={`p-2 rounded-lg transition-colors ${solid || isMobileMenuOpen ? 'text-slate-800 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}
                                aria-label="Toggle mobile menu"
                            >
                                {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-white md:hidden pt-24 pb-6 px-6 overflow-y-auto"
                    >
                        <div className="flex flex-col space-y-6 mt-4">
                            {navItems.map((menu) => (
                                <div key={menu.title} className="flex flex-col">
                                    <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                                        {menu.title}
                                    </div>
                                    <div className="flex flex-col space-y-4 border-l-2 border-slate-100 pl-4">
                                        {menu.items.map((item, idx) => (
                                            <a 
                                                key={idx}
                                                href={item.href || '#'}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="flex flex-col"
                                            >
                                                <span className="text-lg font-bold text-slate-800">{item.label}</span>
                                                <span className="text-sm text-slate-500 mt-0.5">{item.desc}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-10 pt-6 border-t border-slate-100">
                             <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                <button className="w-full px-5 py-4 rounded-xl font-bold text-white bg-slate-900 shadow-md">
                                    Sisteme Giriş Yap
                                </button>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
