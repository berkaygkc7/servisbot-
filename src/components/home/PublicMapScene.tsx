import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface PublicMapSceneProps {
    className?: string;
    center?: [number, number];
    zoom?: number;
    hideControls?: boolean;
}

// Map Updater Component
const MapUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};

// Realistic markers identical to dashboard MapScene
const createRealisticIcon = (label: string, bgClass: string, sizeClass: string = "w-8 h-8 text-xs") => {
    return L.divIcon({
        className: 'bg-transparent',
        html: `
            <div class="${bgClass} ${sizeClass} rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-md">
                <span class="drop-shadow-sm">${label}</span>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
};

const schoolIcon = createRealisticIcon('O', 'bg-red-600');
const busIcon = createRealisticIcon('🚐', 'bg-slate-900 border-yellow-400', 'w-8 h-8 text-sm');
const student1Icon = createRealisticIcon('1', 'bg-blue-500');
const student2Icon = createRealisticIcon('2', 'bg-blue-500');
const student3Icon = createRealisticIcon('3', 'bg-blue-500');

const PublicMapScene: React.FC<PublicMapSceneProps> = ({
    className = "h-full w-full",
    center = [39.92077, 32.85411],
    zoom = 13,
    hideControls = true
}) => {
    // Realistic Light Map (Carto Voyager)
    const mapStyleUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    // Mock data for Ankara
    const schoolPos: [number, number] = [center[0] + 0.015, center[1] + 0.02];
    const student1: [number, number] = [center[0] - 0.01, center[1] - 0.03];
    const student2: [number, number] = [center[0] + 0.03, center[1] - 0.01];
    const student3: [number, number] = [center[0] - 0.02, center[1] + 0.04];
    const busPos: [number, number] = [center[0] - 0.005, center[1] - 0.015];

    return (
        <div className={`relative overflow-hidden rounded-xl bg-slate-100 ${className} z-0`}>
            <div className="absolute inset-0 w-full h-full">
                <MapContainer 
                    center={center} 
                    zoom={zoom} 
                    zoomControl={!hideControls}
                    scrollWheelZoom={!hideControls}
                    dragging={!hideControls}
                    touchZoom={!hideControls}
                    doubleClickZoom={!hideControls}
                    className="w-full h-full"
                    style={{ background: '#f1f5f9' }}
                >
                    <TileLayer
                        url={mapStyleUrl}
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <MapUpdater center={center} zoom={zoom} />
                    
                    {/* Routes - Realistic Blue Route Line */}
                    <Polyline 
                        positions={[student1, busPos, schoolPos]} 
                        color="#2563eb" 
                        weight={5} 
                        opacity={0.8} 
                    />
                    <Polyline 
                        positions={[student2, schoolPos]} 
                        color="#94a3b8" 
                        weight={4} 
                        opacity={0.5} 
                    />
                    <Polyline 
                        positions={[student3, busPos]} 
                        color="#94a3b8" 
                        weight={4} 
                        opacity={0.5} 
                    />

                    {/* Markers */}
                    <Marker position={schoolPos} icon={schoolIcon} />
                    <Marker position={student1} icon={student1Icon} />
                    <Marker position={student2} icon={student2Icon} />
                    <Marker position={student3} icon={student3Icon} />
                    <Marker position={busPos} icon={busIcon} />
                </MapContainer>
            </div>
            
            {/* Soft inner shadow to blend frame but not too dark */}
            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] pointer-events-none z-[1000]"></div>
        </div>
    );
};

export default PublicMapScene;
