import React from 'react';

const MobileAppShowcase: React.FC = () => {
    return (
        <section className="py-16 md:py-24 bg-white relative overflow-hidden" id="mobile-app">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-50 to-teal-50/50 rounded-full blur-3xl opacity-50 translate-y-1/3 -translate-x-1/3"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100/50 text-blue-600 font-semibold text-sm mb-8">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </span>
                    ServisBot Mobil Uygulaması Çok Yakında
                </div>

                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight leading-tight">
                    Güç artık <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">cebinizde!</span>
                </h2>
            </div>
        </section>
    );
};

export default MobileAppShowcase;
