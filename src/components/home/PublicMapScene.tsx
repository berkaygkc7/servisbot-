import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

const PublicMapScene: React.FC<PublicMapSceneProps> = ({
    className = "h-full w-full",
    center = [39.92077, 32.85411],
    zoom = 11,
    hideControls = true
}) => {
    // Determine the map style based on local preferences if we wanted to (omitted for public map to keep it simple)
    const mapStyleUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'; // A clean map style

    return (
        <div className={`relative overflow-hidden rounded-xl shadow-inner bg-slate-100 ${className} z-0`}>
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
                    style={{ background: '#f8fafc' }}
                >
                    <TileLayer
                        url={mapStyleUrl}
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <MapUpdater center={center} zoom={zoom} />
                    
                    {/* Add some dummy markers for the "Showcase" effect since this is just a landing page map */}
                    <Marker position={[center[0] + 0.02, center[1] + 0.03]} />
                    <Marker position={[center[0] - 0.01, center[1] - 0.02]} />
                    <Marker position={[center[0] + 0.015, center[1] - 0.04]} />
                </MapContainer>
            </div>
        </div>
    );
};

export default PublicMapScene;
