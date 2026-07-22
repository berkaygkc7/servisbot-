/// <reference types="@types/google.maps" />
import React, { useEffect, useState } from 'react';
import { Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useAuth } from '../../contexts/AuthContext';
import { getCityCoordinates } from '../../constants/cities';
import VehicleMarker from './VehicleMarker';
import { darkMapStyle } from './mapStyles';

interface MapSceneProps {
    className?: string;
    routeGeoJson?: any;
    routesGeoJson?: any;
    colorfulRoutesGeoJson?: any;
    markers?: { id: string | number; position: [number, number]; title: string; type?: 'vehicle' | 'stop' | 'student_home' | 'search_result' }[];
    autoCenter?: boolean;
    onMapClick?: (lng: number, lat: number) => void;
    onMarkerClick?: (id: string | number, type?: string) => void;
    onMarkerHover?: (id: string | number | null) => void;
    onRouteHover?: (routeId: string | null, position: [number, number] | null) => void;
    onRouteClick?: (routeId: string) => void;
    simulation?: {
        active: boolean;
        coordinates: [number, number][];
        stops: any[];
        speed: number;
        isPlaying: boolean;
    };
    fitBoundsTrigger?: number;
    selectedRouteId?: string | null;
    center?: [number, number];
    zoom?: number;
    hideControls?: boolean;
}

// Controller handles the imperative Map APIs (Bounds, Layers, Styles)
const MapSceneController: React.FC<Omit<MapSceneProps, 'className' | 'simulation' | 'hideControls'> & { mapStyle: string }> = ({
    routeGeoJson,
    routesGeoJson,
    colorfulRoutesGeoJson,
    markers,
    onMapClick,
    onRouteClick,
    onRouteHover,
    fitBoundsTrigger,
    selectedRouteId,
    center,
    zoom,
    mapStyle
}) => {
    const map = useMap();
    const coreLibrary = useMapsLibrary('core');
    const mapsLibrary = useMapsLibrary('maps');

    const [routeData, setRouteData] = useState<google.maps.Data | null>(null);
    const [multiRouteData, setMultiRouteData] = useState<google.maps.Data | null>(null);
    const [colorfulData, setColorfulData] = useState<google.maps.Data | null>(null);

    // Initialize Map Options and Click
    useEffect(() => {
        if (!map || !mapsLibrary) return;

        // Map Click
        const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng && onMapClick) {
                onMapClick(e.latLng.lng(), e.latLng.lat());
            }
        });

        return () => {
            google.maps.event.removeListener(clickListener);
        };
    }, [map, onMapClick, mapsLibrary]);

    // Handle Map Styles
    useEffect(() => {
        if (!map || !mapsLibrary) return;
        
        let type = mapsLibrary.MapTypeId.ROADMAP;
        if (mapStyle === 'satellite') type = mapsLibrary.MapTypeId.SATELLITE;
        else if (mapStyle === 'topo') type = mapsLibrary.MapTypeId.TERRAIN;

        map.setMapTypeId(type);
    }, [map, mapStyle, mapsLibrary]);

    // Handle External Center Changes
    useEffect(() => {
        if (map && center && !isNaN(Number(center[0])) && !isNaN(Number(center[1]))) {
            map.panTo({ lat: Number(center[1]), lng: Number(center[0]) });
            if (zoom) map.setZoom(zoom);
        }
    }, [map, center, zoom]);

    // Data Layer Factories
    useEffect(() => {
        if (!map || !mapsLibrary) return;
        
        const rData = new mapsLibrary.Data({ map });
        const mrData = new mapsLibrary.Data({ map });
        const cData = new mapsLibrary.Data({ map });

        setRouteData(rData);
        setMultiRouteData(mrData);
        setColorfulData(cData);

        return () => {
            rData.setMap(null);
            mrData.setMap(null);
            cData.setMap(null);
        };
    }, [map, mapsLibrary]);

    // Single Route
    useEffect(() => {
        if (!routeData || !routeGeoJson) {
            if (routeData) routeData.forEach((f: google.maps.Data.Feature) => routeData.remove(f));
            return;
        }

        routeData.forEach((f: google.maps.Data.Feature) => routeData.remove(f));
        routeData.addGeoJson(routeGeoJson);
        routeData.setStyle({
            strokeColor: '#3b82f6',
            strokeWeight: 6,
            strokeOpacity: 0.9,
            zIndex: 10
        });

    }, [routeData, routeGeoJson]);

    // Multi Routes (with Hover/Click)
    useEffect(() => {
        if (!multiRouteData || !routesGeoJson) {
            if (multiRouteData) multiRouteData.forEach((f: google.maps.Data.Feature) => multiRouteData.remove(f));
            return;
        }

        multiRouteData.forEach((f: google.maps.Data.Feature) => multiRouteData.remove(f));
        multiRouteData.addGeoJson(routesGeoJson);
        multiRouteData.setStyle((feature: google.maps.Data.Feature) => {
            const color = (feature.getProperty('color') as string) || '#6366f1';
            const isHighlighted = feature.getProperty('isHighlighted');
            return {
                strokeColor: color,
                strokeWeight: 6,
                strokeOpacity: isHighlighted ? 0.9 : 0.4,
                zIndex: isHighlighted ? 5 : 2
            };
        });

        // Listeners
        let hoverListener: google.maps.MapsEventListener;
        let outListener: google.maps.MapsEventListener;
        let clickListener: google.maps.MapsEventListener;

        if (onRouteHover) {
             hoverListener = multiRouteData.addListener('mouseover', (e: any) => {
                  const id = e.feature.getProperty('id');
                  onRouteHover(id, [e.latLng.lng(), e.latLng.lat()]);
             });
             outListener = multiRouteData.addListener('mouseout', () => {
                  onRouteHover(null, null);
             });
        }
        if (onRouteClick) {
             clickListener = multiRouteData.addListener('click', (e: any) => {
                  const id = e.feature.getProperty('id');
                  onRouteClick(id);
             });
        }

        return () => {
            if (hoverListener) google.maps.event.removeListener(hoverListener);
            if (outListener) google.maps.event.removeListener(outListener);
            if (clickListener) google.maps.event.removeListener(clickListener);
        };
    }, [multiRouteData, routesGeoJson, onRouteHover, onRouteClick]);

    // Colorful Routes (Glow effect)
    useEffect(() => {
        if (!colorfulData || !colorfulRoutesGeoJson) {
            if (colorfulData) colorfulData.forEach((f: google.maps.Data.Feature) => colorfulData.remove(f));
            return;
        }

        colorfulData.forEach((f: google.maps.Data.Feature) => colorfulData.remove(f));
        colorfulData.addGeoJson(colorfulRoutesGeoJson);
        colorfulData.setStyle((feature: google.maps.Data.Feature) => {
            const color = (feature.getProperty('color') as string) || '#ff0000';
            return {
                strokeColor: color,
                strokeWeight: 6, // Simplified glow to just 1 line for Google Maps performance
                strokeOpacity: 0.8,
                zIndex: 3
            };
        });

    }, [colorfulData, colorfulRoutesGeoJson]);

    // AUTO-ZOOM: Güzergah seçildiğinde çizilen rotaya zoom yap
    useEffect(() => {
        if (!map || !routeGeoJson) return;

        try {
            const bounds = new google.maps.LatLngBounds();
            let hasCoords = false;

            // routeGeoJson -> Feature veya FeatureCollection olabilir
            const features = routeGeoJson.features
                ? routeGeoJson.features
                : routeGeoJson.type === 'Feature'
                    ? [routeGeoJson]
                    : [];

            for (const f of features) {
                const coords = f?.geometry?.coordinates;
                if (!coords) continue;

                if (f.geometry.type === 'LineString') {
                    for (const c of coords) {
                        const lat = Number(c[1]);
                        const lng = Number(c[0]);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            bounds.extend({ lat, lng });
                            hasCoords = true;
                        }
                    }
                } else if (f.geometry.type === 'MultiLineString') {
                    for (const line of coords) {
                        for (const c of line) {
                            const lat = Number(c[1]);
                            const lng = Number(c[0]);
                            if (!isNaN(lat) && !isNaN(lng)) {
                                bounds.extend({ lat, lng });
                                hasCoords = true;
                            }
                        }
                    }
                }
            }

            if (hasCoords) {
                setTimeout(() => {
                    map.fitBounds(bounds, 80);
                }, 150);
            }
        } catch (e) {
            console.error('Zoom error:', e);
        }
    }, [map, routeGeoJson]);

    return null;
};

// Marker Helper
const CustomHtmlMarker = ({ config, position, title, onClick, onHover }: any) => {
    // Prevent crashes if position is invalid
    if (!position || isNaN(Number(position[0])) || isNaN(Number(position[1]))) return null;

    return (
        <AdvancedMarker 
            position={{ lat: Number(position[1]), lng: Number(position[0]) }}
            title={title}
            onClick={onClick}
            onMouseEnter={() => onHover && onHover(true)}
            onMouseLeave={() => onHover && onHover(false)}
            zIndex={config.extraClass.includes('z-[999]') ? 999 : 50}
        >
            <div className={`marker-inner ${config.sizeClass} ${config.bgClass} ${config.extraClass} rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white font-bold cursor-pointer transition-all duration-300 hover:scale-110`} dangerouslySetInnerHTML={{ __html: config.html }} />
        </AdvancedMarker>
    );
};

const MapScene: React.FC<MapSceneProps> = ({
    className = "h-full w-full",
    routeGeoJson,
    routesGeoJson,
    colorfulRoutesGeoJson,
    markers = [],
    onMapClick,
    onMarkerClick,
    onMarkerHover,
    onRouteHover,
    onRouteClick,
    simulation,
    fitBoundsTrigger = 0,
    selectedRouteId,
    center,
    zoom,
    hideControls = false
}) => {
    const { profile } = useAuth();
    const [showLayerMenu, setShowLayerMenu] = useState(false);
    const [mapStyle, setMapStyle] = useState('default');

    const companyCityCoordinates = profile?.companies?.city 
        ? getCityCoordinates(profile.companies.city) 
        : null;
        
    const safeCenter = center && !isNaN(Number(center[0])) && !isNaN(Number(center[1])) ? [Number(center[0]), Number(center[1])] : undefined;
    const effectiveCenter = safeCenter || (companyCityCoordinates && !isNaN(Number(companyCityCoordinates[0])) && !isNaN(Number(companyCityCoordinates[1])) ? [Number(companyCityCoordinates[0]), Number(companyCityCoordinates[1])] as [number, number] : [28.9784, 41.0082]);
    const centerObj = { lat: effectiveCenter[1], lng: effectiveCenter[0] };

    const getMarkerConfig = (p: any) => {
        let bgClass = 'bg-blue-500';
        let label = 'D';
        let sizeClass = 'w-8 h-8 text-xs';
        let extraClass = '';
        let html = '';

        if (p.type === 'vehicle') {
            bgClass = 'bg-slate-900 border-yellow-400 border-2';
            label = '🚐';
            html = `<span class="drop-shadow-sm">${label}</span>`;
        } else if (p.type === 'student_home') {
            bgClass = 'bg-orange-500 border-white border-2';
            label = '🏠';
            sizeClass = 'w-6 h-6 text-[10px]';
            html = `<span class="drop-shadow-sm">${label}</span>`;
        } else if (p.type === 'search_result') {
            bgClass = 'bg-transparent';
            sizeClass = 'w-16 h-16'; 
            extraClass = 'z-[999]';
            html = `<div class="relative flex items-center justify-center w-full h-full" style="pointer-events: none;">
                        <div style="position: absolute; width: 24px; height: 24px; background: #ef4444; border-radius: 9999px; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.8;"></div>
                        <div style="position: relative; width: 44px; height: 44px; background: #dc2626; border-radius: 9999px; border: 3px solid white; box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.5); display: flex; align-items: center; justify-content: center; pointer-events: auto;">
                             <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        </div>
                    </div>`;
        } else if (p.id === 'start' || p.title.toLowerCase().includes('başlangıç')) {
            bgClass = 'bg-green-600';
            label = 'B';
            html = `<span class="drop-shadow-sm">${label}</span>`;
        } else if (p.id === 'end' || p.title.toLowerCase().includes('bitiş') || p.title.toLowerCase().includes('okul')) {
            bgClass = 'bg-red-600';
            label = 'O';
            html = `<span class="drop-shadow-sm">${label}</span>`;
        } else {
            const match = p.title.match(/\d+/);
            label = match ? match[0] : 'D';
            html = `<span class="drop-shadow-sm">${label}</span>`;
        }

        return { bgClass, label, sizeClass, extraClass, html };
    };

    return (
        <div className={`relative overflow-hidden rounded-xl shadow-inner bg-slate-100 ${className}`}>
            <div className="absolute inset-0 w-full h-full">
                <Map
                    defaultZoom={zoom || 11}
                    defaultCenter={centerObj}
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                    mapId="DEMO_MAP_ID"
                    colorScheme={mapStyle === 'dark' ? 'DARK' : mapStyle === 'light' ? 'LIGHT' : 'FOLLOW_SYSTEM'}
                    styles={mapStyle === 'dark' ? darkMapStyle : []}
                >
                    <MapSceneController 
                        routeGeoJson={routeGeoJson}
                        routesGeoJson={routesGeoJson}
                        colorfulRoutesGeoJson={colorfulRoutesGeoJson}
                        markers={markers}
                        onMapClick={onMapClick}
                        onRouteClick={onRouteClick}
                        onRouteHover={onRouteHover}
                        fitBoundsTrigger={fitBoundsTrigger}
                        selectedRouteId={selectedRouteId}
                        center={center}
                        zoom={zoom}
                        mapStyle={mapStyle}
                    />

                    {markers.map(m => (
                        <CustomHtmlMarker 
                            key={m.id}
                            config={getMarkerConfig(m)}
                            position={m.position}
                            title={m.title}
                            onClick={() => onMarkerClick && onMarkerClick(m.id, m.type)}
                            onHover={(isHover: boolean) => onMarkerHover && onMarkerHover(isHover ? m.id : null)}
                        />
                    ))}

                    {simulation?.active && (
                        <VehicleMarker
                            routeCoordinates={simulation.coordinates}
                            stops={simulation.stops}
                            isPlaying={simulation.isPlaying}
                            speedMultiplier={simulation.speed}
                        />
                    )}
                </Map>
            </div>

            {!hideControls && (
                <div className="absolute bottom-6 right-4 flex flex-col items-end gap-2 z-10 transition-all">
                    <div className={`bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 overflow-hidden transition-all origin-bottom-right duration-200 flex flex-col w-40 ${showLayerMenu ? 'scale-100 opacity-100 mb-2' : 'scale-0 opacity-0 h-0 w-0 mb-0'}`}>
                        <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Harita Stili</span>
                        </div>
                        <button onClick={() => { setMapStyle('default'); setShowLayerMenu(false); }} className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors w-full text-left ${mapStyle === 'default' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            Varsayılan
                        </button>
                        <button onClick={() => { setMapStyle('satellite'); setShowLayerMenu(false); }} className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors w-full text-left ${mapStyle === 'satellite' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            Uydu
                        </button>
                        <button onClick={() => { setMapStyle('dark'); setShowLayerMenu(false); }} className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors w-full text-left ${mapStyle === 'dark' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            Karanlık
                        </button>
                        <button onClick={() => { setMapStyle('light'); setShowLayerMenu(false); }} className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors w-full text-left ${mapStyle === 'light' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            Aydınlık
                        </button>
                        <button onClick={() => { setMapStyle('topo'); setShowLayerMenu(false); }} className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors w-full text-left ${mapStyle === 'topo' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            Topografik
                        </button>
                    </div>

                    <button
                        onClick={() => setShowLayerMenu(!showLayerMenu)}
                        className={`px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-2 font-bold ${showLayerMenu ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'}`}
                        title="Harita Görünümünü Değiştir"
                    >
                        <span className="hidden sm:inline">Harita Stili</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default MapScene;
