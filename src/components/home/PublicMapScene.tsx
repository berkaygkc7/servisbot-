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

// Custom glowing markers
const createGlowingIcon = (color: string) => {
    return L.divIcon({
        className: 'bg-transparent',
        html: `
            <div class="relative flex items-center justify-center w-8 h-8">
                <div class="absolute w-full h-full rounded-full animate-ping opacity-60" style="background-color: ${color};"></div>
                <div class="relative w-4 h-4 rounded-full border-[3px] border-white shadow-lg" style="background-color: ${color};"></div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
};

const schoolIcon = createGlowingIcon('#ef4444'); // Red for schools
const studentIcon = createGlowingIcon('#3b82f6'); // Blue for students
const busIcon = createGlowingIcon('#10b981'); // Green for buses

const PublicMapScene: React.FC<PublicMapSceneProps> = ({
    className = "h-full w-full",
    center = [39.92077, 32.85411],
    zoom = 13,
    hideControls = true
}) => {
    // Dark theme for a modern/tech look that blends perfectly with the hero section
    const mapStyleUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    // Mock data for Ankara
    const schoolPos: [number, number] = [center[0] + 0.015, center[1] + 0.02];
    const student1: [number, number] = [center[0] - 0.01, center[1] - 0.03];
    const student2: [number, number] = [center[0] + 0.03, center[1] - 0.01];
    const student3: [number, number] = [center[0] - 0.02, center[1] + 0.04];
    const busPos: [number, number] = [center[0], center[1]];

    return (
        <div className={`relative overflow-hidden rounded-xl bg-slate-900 ${className} z-0`}>
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
                    style={{ background: '#0f172a' }}
                >
                    <TileLayer
                        url={mapStyleUrl}
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <MapUpdater center={center} zoom={zoom} />
                    
                    {/* Routes */}
                    <Polyline 
                        positions={[student1, busPos, schoolPos]} 
                        color="#3b82f6" 
                        weight={3} 
                        dashArray="6, 8" 
                        opacity={0.8} 
                    />
                    <Polyline 
                        positions={[student2, schoolPos]} 
                        color="#64748b" 
                        weight={2} 
                        dashArray="4, 6" 
                        opacity={0.4} 
                    />
                    <Polyline 
                        positions={[student3, busPos]} 
                        color="#64748b" 
                        weight={2} 
                        dashArray="4, 6" 
                        opacity={0.4} 
                    />

                    {/* Markers */}
                    <Marker position={schoolPos} icon={schoolIcon} />
                    <Marker position={student1} icon={studentIcon} />
                    <Marker position={student2} icon={studentIcon} />
                    <Marker position={student3} icon={studentIcon} />
                    <Marker position={busPos} icon={busIcon} />
                </MapContainer>
            </div>
            
            {/* Overlay gradient to blend with Hero */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/60 via-transparent to-transparent pointer-events-none z-[1000]"></div>
        </div>
    );
};

export default PublicMapScene;
