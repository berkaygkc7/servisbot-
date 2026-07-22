import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import logo from '../../assets/yeni_navbar_logo.png';

const Navbar: React.FC = () => {
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

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    const navLinks = ['Özellikler', 'Çözümler', 'Fiyatlandırma', 'İletişim'];

    return (
        <>
            <motion.nav
                className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'
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
                                className={`h-20 w-[240px] md:w-[280px] object-contain object-left transition-all duration-300 transform md:scale-125 scale-110 ${isScrolled || isMobileMenuOpen ? 'brightness-0 opacity-80' : 'brightness-100 opacity-90'}`}
                            />
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-8">
                            {navLinks.map((item) => (
                                <a
                                    key={item}
                                    href={`#${item.toLowerCase()}`}
                                    className={`text-sm font-medium transition-colors hover:text-secondary ${isScrolled ? 'text-slate-600' : 'text-slate-100 hover:text-white'
                                        }`}
                                >
                                    {item}
                                </a>
                            ))}
                        </div>

                        {/* Auth Buttons */}
                        <div className="hidden md:flex items-center gap-4">
                            <Link to="/login">
                                <button className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${isScrolled
                                    ? 'text-slate-600 hover:text-primary'
                                    : 'text-slate-100 hover:text-white'
                                    }`}>
                                    Giriş Yap
                                </button>
                            </Link>
                            <Link to="/register">
                                <button className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${isScrolled
                                    ? 'bg-primary text-white hover:bg-slate-800 shadow-md hover:shadow-lg'
                                    : 'bg-white text-primary hover:bg-slate-50 shadow-none'
                                    }`}>
                                    Ücretsiz Dene
                                </button>
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center z-50">
                            <button 
                                onClick={toggleMobileMenu}
                                className={`p-2 rounded-lg transition-colors ${isScrolled || isMobileMenuOpen ? 'text-slate-800 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}
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
                        className="fixed inset-0 z-40 bg-white md:hidden pt-24 pb-6 px-6 flex flex-col justify-between"
                    >
                        <div className="flex flex-col space-y-2 mt-4">
                            {navLinks.map((item) => (
                                <a
                                    key={item}
                                    href={`#${item.toLowerCase()}`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-2xl font-bold text-slate-800 py-4 border-b border-slate-100 last:border-0"
                                >
                                    {item}
                                </a>
                            ))}
                        </div>

                        {/* Mobile Auth Buttons Removed by User Request */}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
