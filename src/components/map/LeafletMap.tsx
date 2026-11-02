import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface LeafletMarker {
    id: string | number;
    position: [number, number]; // [lng, lat]
    title: string;
    type?: 'vehicle' | 'stop' | 'student_home' | 'search_result';
    hasVehicle?: boolean;
    vehicleColor?: string;
}

export interface LeafletMapProps {
    className?: string;
    center?: [number, number]; // [lng, lat]
    zoom?: number;
    markers?: LeafletMarker[];
    routeGeoJson?: any;
    routesGeoJson?: any;
    colorfulRoutesGeoJson?: any;
    autoCenter?: boolean;
    fitBoundsTrigger?: number;
    hideControls?: boolean;
    onMapClick?: (lng: number, lat: number) => void;
    onMarkerClick?: (id: string | number, type?: string) => void;
    onMarkerHover?: (id: string | number | null) => void;
    onRouteHover?: (routeId: string | null, position: [number, number] | null) => void;
    onRouteClick?: (routeId: string) => void;
}

const TILE_LAYERS: Record<string, { url: string; attribution: string; maxZoom?: number }> = {
    default: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19
    },
    light: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19
    },
    topo: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: 'Kartendaten: &copy; OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung: &copy; OpenTopoMap',
        maxZoom: 17
    }
};

const LeafletMap: React.FC<LeafletMapProps> = ({
    className = 'h-full w-full',
    center = [32.8597, 39.9334], // Ankara default [lng, lat]
    zoom = 11,
    markers = [],
    routeGeoJson,
    routesGeoJson,
    colorfulRoutesGeoJson,
    autoCenter,
    fitBoundsTrigger,
    hideControls = false,
    onMapClick,
    onMarkerClick,
    onMarkerHover,
    onRouteHover,
    onRouteClick
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const routesLayerRef = useRef<L.LayerGroup | null>(null);

    const [mapStyle, setMapStyle] = useState<'default' | 'satellite' | 'dark' | 'light' | 'topo'>('default');
    const [showLayerMenu, setShowLayerMenu] = useState(false);

    // Initial map setup
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const initialLat = center ? Number(center[1]) : 39.9334;
        const initialLng = center ? Number(center[0]) : 32.8597;

        const map = L.map(mapContainerRef.current, {
            center: [initialLat, initialLng],
            zoom: zoom || 11,
            zoomControl: false,
            attributionControl: false
        });

        // Add custom small attribution
        L.control.attribution({ position: 'bottomleft' }).addTo(map);

        // Add initial tile layer
        const config = TILE_LAYERS[mapStyle] || TILE_LAYERS.default;
        const tileLayer = L.tileLayer(config.url, {
            attribution: config.attribution,
            maxZoom: config.maxZoom || 19
        }).addTo(map);
        tileLayerRef.current = tileLayer;

        // Layer groups
        const routesGroup = L.layerGroup().addTo(map);
        routesLayerRef.current = routesGroup;

        const markersGroup = L.layerGroup().addTo(map);
        markersLayerRef.current = markersGroup;

        // Click handler
        map.on('click', (e: L.LeafletMouseEvent) => {
            onMapClick?.(e.latlng.lng, e.latlng.lat);
        });

        mapInstanceRef.current = map;

        // Leaflet resize invalidation
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 200);

        return () => {
            clearTimeout(timer);
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Change Tile Layer Style
    useEffect(() => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;
        const config = TILE_LAYERS[mapStyle] || TILE_LAYERS.default;

        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
        }

        const newTileLayer = L.tileLayer(config.url, {
            attribution: config.attribution,
            maxZoom: config.maxZoom || 19
        }).addTo(map);

        tileLayerRef.current = newTileLayer;
    }, [mapStyle]);

    // Handle Center and Zoom updates
    useEffect(() => {
        if (!mapInstanceRef.current || !center) return;
        const lat = Number(center[1]);
        const lng = Number(center[0]);
        if (!isNaN(lat) && !isNaN(lng)) {
            mapInstanceRef.current.setView([lat, lng], zoom || mapInstanceRef.current.getZoom(), {
                animate: true
            });
        }
    }, [center?.[0], center?.[1], zoom]);

    // Render Markers
    useEffect(() => {
        if (!mapInstanceRef.current || !markersLayerRef.current) return;
        const group = markersLayerRef.current;
        group.clearLayers();

        const bounds = L.latLngBounds([]);

        markers.forEach(m => {
            if (!m.position || isNaN(m.position[0]) || isNaN(m.position[1])) return;
            const lng = Number(m.position[0]);
            const lat = Number(m.position[1]);
            const latLng = L.latLng(lat, lng);
            bounds.extend(latLng);

            // Determine marker styling
            let iconHtml = '';
            let iconSize: [number, number] = [32, 32];
            let iconAnchor: [number, number] = [16, 16];

            if (m.type === 'vehicle') {
                iconHtml = `
                    <div style="background-color: #0f172a; border: 2px solid #facc15; border-radius: 9999px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); font-size: 14px;">
                        🚐
                    </div>
                `;
            } else if (m.type === 'student_home') {
                const bg = m.vehicleColor || (m.hasVehicle ? '#10b981' : '#ef4444');
                iconHtml = `
                    <div style="background-color: ${bg}; border: 2px solid white; border-radius: 9999px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); font-size: 11px;">
                        🏠
                    </div>
                `;
                iconSize = [26, 26];
                iconAnchor = [13, 13];
            } else if (m.type === 'search_result') {
                iconHtml = `
                    <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
                        <div style="background-color: #dc2626; color: white; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); white-space: nowrap;">
                            ${m.title}
                        </div>
                        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #dc2626;"></div>
                    </div>
                `;
                iconSize = [100, 36];
                iconAnchor = [50, 36];
            } else {
                const titleLower = (m.title || '').toLowerCase();
                const isStart = m.id === 'start' || titleLower.includes('başlangıç');
                const isEnd = m.id === 'end' || titleLower.includes('bitiş') || titleLower.includes('okul');
                const bg = isStart ? '#16a34a' : isEnd ? '#dc2626' : '#2563eb';
                const labelMatch = m.title ? m.title.match(/\d+/) : null;
                const label = isStart ? 'B' : isEnd ? 'O' : (labelMatch ? labelMatch[0] : 'D');

                iconHtml = `
                    <div style="background-color: ${bg}; color: white; border: 2px solid white; border-radius: 9999px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25); font-weight: bold; font-size: 11px;">
                        ${label}
                    </div>
                `;
                iconSize = [30, 30];
                iconAnchor = [15, 15];
            }

            const customIcon = L.divIcon({
                html: iconHtml,
                className: 'custom-leaflet-pin',
                iconSize,
                iconAnchor
            });

            const marker = L.marker(latLng, { icon: customIcon });

            if (m.title) {
                marker.bindTooltip(m.title, {
                    direction: 'top',
                    offset: [0, -iconAnchor[1]],
                    className: 'leaflet-tooltip-custom'
                });
            }

            marker.on('click', () => {
                onMarkerClick?.(m.id, m.type);
            });

            marker.on('mouseover', () => {
                onMarkerHover?.(m.id);
            });

            marker.on('mouseout', () => {
                onMarkerHover?.(null);
            });

            marker.addTo(group);
        });

        // Fit bounds if autoCenter is requested and we have markers
        if (autoCenter && bounds.isValid() && markers.length > 0) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
    }, [markers, autoCenter]);

    // Render Routes (GeoJSON)
    useEffect(() => {
        if (!mapInstanceRef.current || !routesLayerRef.current) return;
        const group = routesLayerRef.current;
        group.clearLayers();

        const addGeoJsonFeature = (data: any, defaultColor = '#10b981') => {
            if (!data) return;
            try {
                L.geoJSON(data, {
                    style: (feature) => ({
                        color: feature?.properties?.color || defaultColor,
                        weight: 6,
                        opacity: 0.85,
                        lineCap: 'round',
                        lineJoin: 'round'
                    }),
                    onEachFeature: (feature, layer) => {
                        const routeId = feature?.properties?.id || feature?.id;
                        if (feature?.properties?.name) {
                            layer.bindTooltip(feature.properties.name, { sticky: true });
                        }
                        layer.on('click', () => {
                            if (routeId) onRouteClick?.(routeId);
                        });
                        layer.on('mouseover', (e: L.LeafletMouseEvent) => {
                            if (routeId) onRouteHover?.(routeId, [e.latlng.lng, e.latlng.lat]);
                        });
                        layer.on('mouseout', () => {
                            onRouteHover?.(null, null);
                        });
                    }
                }).addTo(group);
            } catch (err) {
                console.error('Error rendering Leaflet route GeoJSON:', err);
            }
        };

        if (routeGeoJson) addGeoJsonFeature(routeGeoJson, '#10b981');
        if (routesGeoJson) addGeoJsonFeature(routesGeoJson, '#3b82f6');
        if (colorfulRoutesGeoJson) addGeoJsonFeature(colorfulRoutesGeoJson, '#8b5cf6');
    }, [routeGeoJson, routesGeoJson, colorfulRoutesGeoJson]);

    // FitBounds trigger
    useEffect(() => {
        if (!mapInstanceRef.current || !fitBoundsTrigger) return;
        const allBounds = L.latLngBounds([]);

        if (markersLayerRef.current) {
            markersLayerRef.current.eachLayer((layer: any) => {
                if (layer.getLatLng) allBounds.extend(layer.getLatLng());
            });
        }

        if (allBounds.isValid()) {
            mapInstanceRef.current.fitBounds(allBounds, { padding: [50, 50], maxZoom: 16 });
        }
    }, [fitBoundsTrigger]);

    return (
        <div className={`relative overflow-hidden rounded-xl shadow-inner bg-slate-100 ${className}`}>
            <style>{`
                .custom-leaflet-pin {
                    background: transparent !important;
                    border: none !important;
                }
                .leaflet-tooltip-custom {
                    background: rgba(15, 23, 42, 0.9) !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 8px !important;
                    padding: 4px 8px !important;
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2) !important;
                }
                .leaflet-tooltip-custom:before {
                    border-top-color: rgba(15, 23, 42, 0.9) !important;
                }
            `}</style>
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

            {/* Fallback Badge */}
            <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-sm flex items-center gap-1.5 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-slate-700">Açık Kaynak Harita</span>
            </div>

            {/* Style Controls */}
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

export default LeafletMap;
