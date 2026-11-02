import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getCityCoordinates } from '../../constants/cities';
import LeafletMap from '../map/LeafletMap';

interface MarkerData {
    id: string;
    position: [number, number]; // [lng, lat]
    title?: string;
}

interface MapContainerProps {
    className?: string;
    center?: [number, number]; // [lng, lat]
    zoom?: number;
    routeGeoJson?: any;
    markers?: MarkerData[];
}

const MapContainer: React.FC<MapContainerProps> = ({
    className = "h-96 w-full",
    center,
    zoom = 10,
    routeGeoJson,
    markers
}) => {
    const { profile } = useAuth();
    const companyCityCoordinates = profile?.companies?.city 
        ? getCityCoordinates(profile.companies.city) 
        : null;
        
    const defaultCenter = center || (companyCityCoordinates ? [companyCityCoordinates[0], companyCityCoordinates[1]] as [number, number] : [32.8597, 39.9334]);

    return (
        <div className={`relative overflow-hidden rounded-xl shadow-lg border border-slate-200 bg-slate-100 ${className}`}>
            <LeafletMap
                className="w-full h-full"
                center={defaultCenter}
                zoom={zoom}
                routeGeoJson={routeGeoJson}
                markers={markers?.map(m => ({
                    id: m.id,
                    position: m.position,
                    title: m.title || '',
                    type: 'vehicle' as const
                }))}
            />
        </div>
    );
};

export default MapContainer;
