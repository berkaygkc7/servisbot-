import React, { useState } from 'react';
import { MapPinOff, NavigationOff, AlertCircle, ExternalLink, RotateCcw, Map as MapIcon, Loader2 } from 'lucide-react';

export interface MapFallbackProps {
    type?: 'error' | 'loading' | 'no_coords' | 'auth_failure';
    title?: string;
    description?: string;
    center?: [number, number]; // [lng, lat]
    markers?: Array<{ position: [number, number]; title?: string }>;
    onRetry?: () => void;
    className?: string;
    showOsmOption?: boolean;
}

export const MapFallback: React.FC<MapFallbackProps> = ({
    type = 'error',
    title,
    description,
    center,
    markers = [],
    onRetry,
    className = 'w-full h-full min-h-[220px]',
    showOsmOption = true,
}) => {
    const [showOsm, setShowOsm] = useState(false);

    // Get primary coordinates for external map or OSM fallback
    const primaryCoord = (() => {
        if (markers && markers.length > 0 && markers[0].position && !isNaN(markers[0].position[0]) && !isNaN(markers[0].position[1])) {
            return markers[0].position; // [lng, lat]
        }
        if (center && !isNaN(center[0]) && !isNaN(center[1])) {
            return center; // [lng, lat]
        }
        return null;
    })();

    // 1. Loading State
    if (type === 'loading') {
        return (
            <div className={`relative flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 overflow-hidden ${className}`}>
                {/* Background radar animation */}
                <div className="absolute w-48 h-48 rounded-full border border-blue-200/60 animate-ping opacity-25" />
                <div className="absolute w-32 h-32 rounded-full border border-blue-300/60 animate-pulse opacity-40" />

                <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-lg shadow-blue-500/10 border border-slate-200/80 flex items-center justify-center text-blue-600 animate-bounce">
                        <MapIcon size={24} />
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                        <Loader2 size={16} className="animate-spin text-blue-600" />
                        <span>{title || 'Harita Yükleniyor...'}</span>
                    </div>
                    <p className="text-xs text-slate-400">Harita verileri ve konumlar hazırlanıyor</p>
                </div>
            </div>
        );
    }

    // 2. OpenStreetMap Interactive Fallback if toggled
    if (showOsm && primaryCoord) {
        const lng = primaryCoord[0];
        const lat = primaryCoord[1];
        const delta = 0.012;
        const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
        const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;

        return (
            <div className={`relative w-full h-full min-h-[300px] overflow-hidden bg-slate-100 ${className}`}>
                <iframe
                    title="OpenStreetMap Fallback"
                    src={osmEmbedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                />
                <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowOsm(false)}
                        className="px-3 py-1.5 bg-white/95 hover:bg-white text-slate-700 text-xs font-bold rounded-lg shadow-md border border-slate-200 backdrop-blur-sm transition-all"
                    >
                        Panele Dön
                    </button>
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
                    >
                        <ExternalLink size={12} />
                        Google Maps'te Aç
                    </a>
                </div>
            </div>
        );
    }

    // 3. Informative Fallback Card (Error, No Coords, Auth Failure)
    const isNoCoords = type === 'no_coords';
    const isAuth = type === 'auth_failure';

    const defaultTitle = isNoCoords
        ? 'Konum Bilgisi Bulunamadı'
        : isAuth
        ? 'Harita Servisi Yetkilendirme Hatası'
        : 'Harita Yüklenemedi';

    const defaultDesc = isNoCoords
        ? 'Bu kayıt için henüz geçerli bir GPS koordinatı bulunmamaktadır.'
        : isAuth
        ? 'Google Haritalar API anahtarı yapılandırılmamış veya yetkilendirilmemiş olabilir.'
        : 'Harita sağlayıcısına bağlanırken bir sorun oluştu veya ağ bağlantısı kısıtlanmış olabilir.';

    return (
        <div className={`relative flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100/90 text-center select-none overflow-hidden ${className}`}>
            {/* Subtle Map Grid Background */}
            <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(#1e293b 1px, transparent 1px)`,
                    backgroundSize: '24px 24px'
                }}
            />

            <div className="relative z-10 max-w-md w-full flex flex-col items-center">
                {/* Icon Badge */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg mb-4 border transition-transform duration-300 hover:scale-105 ${
                    isNoCoords
                        ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-amber-500/10'
                        : isAuth
                        ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-rose-500/10'
                        : 'bg-slate-100 border-slate-300 text-slate-600 shadow-slate-500/10'
                }`}>
                    {isNoCoords ? (
                        <NavigationOff size={28} />
                    ) : isAuth ? (
                        <AlertCircle size={28} />
                    ) : (
                        <MapPinOff size={28} />
                    )}
                </div>

                {/* Headings */}
                <h3 className="text-base font-bold text-slate-800 mb-1.5">
                    {title || defaultTitle}
                </h3>
                <p className="text-xs text-slate-500 mb-5 leading-relaxed max-w-sm">
                    {description || defaultDesc}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                    {onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            <RotateCcw size={13} />
                            <span>Yeniden Dene</span>
                        </button>
                    )}

                    {showOsmOption && primaryCoord && (
                        <button
                            type="button"
                            onClick={() => setShowOsm(true)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            <MapIcon size={13} />
                            <span>Alternatif Harita (OpenStreetMap)</span>
                        </button>
                    )}

                    {primaryCoord && (
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${primaryCoord[1]},${primaryCoord[0]}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-600/20 flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            <ExternalLink size={13} />
                            <span>Google Maps'te Aç</span>
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MapFallback;
