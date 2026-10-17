import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIos, setIsIos] = useState(false);

    useEffect(() => {
        // Zaten standalone (PWA olarak yüklü) ise gösterme
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                             (window.navigator as any).standalone === true;
        if (isStandalone) return;

        // Kullanıcı yakın zamanda kapattıysa 7 gün boyunca tekrar rahatsız etme
        const dismissedAt = localStorage.getItem('servisbot_pwa_dismissed');
        if (dismissedAt) {
            const daysSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed < 7) return;
        }

        // iOS Safari tespiti
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        const isSafari = /safari/.test(userAgent) && !/chrome|crios|firefox|fxios/.test(userAgent);

        if (isIosDevice && isSafari) {
            setIsIos(true);
            // iOS için 4 saniye sonra nazikçe göster
            const timer = setTimeout(() => setShowPrompt(true), 4000);
            return () => clearTimeout(timer);
        }

        // Android / Chrome / Edge için beforeinstallprompt dinle
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Sayfa açıldıktan 3 saniye sonra göster
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('servisbot_pwa_dismissed', Date.now().toString());
    };

    if (!showPrompt) return null;

    return (
        <aside 
            aria-label="Uygulama Yükleme Bildirimi"
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 text-white p-4 rounded-2xl shadow-2xl shadow-blue-500/10 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 flex-shrink-0 mt-0.5 border border-blue-500/30">
                    <Smartphone size={22} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-sm text-white">ServisBot Uygulaması</h4>
                        <button
                            onClick={handleDismiss}
                            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
                            aria-label="Kapat"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {isIos ? (
                            <span>
                                Ana ekrana yüklemek için alttaki <strong>Paylaş (<Share size={12} className="inline mx-0.5" />)</strong> butonuna ve ardından <strong>"Ana Ekrana Ekle"</strong> seçeneğine dokunun.
                            </span>
                        ) : (
                            'Hızlı canlı konum takibi ve bildirimler için ServisBot\'u telefonunuza uygulama olarak ekleyin.'
                        )}
                    </p>

                    {!isIos && (
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                onClick={handleInstallClick}
                                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                            >
                                <Download size={14} />
                                Hemen Yükle
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
                            >
                                Daha Sonra
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default PwaInstallPrompt;
