/// <reference types="@types/google.maps" />
import React, { useEffect, useState } from 'react';
import { Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useAuth } from '../../contexts/AuthContext';
import { getCityCoordinates } from '../../constants/cities';

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

// Inner component to handle imperative map operations (bounds, geojson)
const MapController: React.FC<{
    routeGeoJson?: any;
    markers?: MarkerData[];
}> = ({ routeGeoJson, markers }) => {
    const map = useMap();
    const coreLibrary = useMapsLibrary('core');
    const [dataFeatures, setDataFeatures] = useState<google.maps.Data.Feature[]>([]);

    // Handle GeoJSON routing via map.data
    useEffect(() => {
        if (!map || !routeGeoJson) return;
        
        // Clear previous routes
        dataFeatures.forEach(feature => map.data.remove(feature));
        
        try {
            // map.data natively supports GeoJSON
            const newFeatures = map.data.addGeoJson(routeGeoJson);
            setDataFeatures(newFeatures);
            
            // Style the GeoJSON (make it look like the old blue line)
            map.data.setStyle({
                strokeColor: '#3b82f6',
                strokeWeight: 5,
                strokeOpacity: 0.8,
            });
        } catch (e) {
            console.error("Failed to parse routeGeoJson for Google Maps", e);
        }

        return () => {
            if (map) {
                 dataFeatures.forEach(feature => map.data.remove(feature));
            }
        };
    }, [map, routeGeoJson]);

    // Fit bounds based on GeoJSON or Markers
    useEffect(() => {
        if (!map || !coreLibrary) return;

        let hasBounds = false;
        const bounds = new coreLibrary.LatLngBounds();

        // 1. Add route coordinates to bounds
        if (routeGeoJson && routeGeoJson.geometry && routeGeoJson.geometry.coordinates) {
            const coords = routeGeoJson.geometry.coordinates;
            // Assuming it's a LineString. For MultiLineString it requires deeper parsing, but usually it's LineString here.
            if (coords.length > 0 && Array.isArray(coords[0])) {
                coords.forEach((coord: [number, number]) => {
                    const lng = Number(coord[0]);
                    const lat = Number(coord[1]);
                    if (!isNaN(lat) && !isNaN(lng)) {
                        bounds.extend({ lat, lng });
                        hasBounds = true;
                    }
                });
            }
        }

        // 2. Add marker coordinates to bounds
        if (markers && markers.length > 0) {
            markers.forEach(m => {
                const lng = Number(m.position[0]);
                const lat = Number(m.position[1]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    bounds.extend({ lat, lng });
                    hasBounds = true;
                }
            });
        }

        if (hasBounds) {
            map.fitBounds(bounds, 50);
        }
    }, [map, coreLibrary, routeGeoJson, markers]);

    return null;
};

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
        
    // [lng, lat]
    const defaultCenter = center || (companyCityCoordinates ? [companyCityCoordinates[0], companyCityCoordinates[1]] as [number, number] : [28.9784, 41.0082]);
    
    // Google Maps uses {lat, lng} objects, while Maplibre used [lng, lat] arrays
    const safeCenter = defaultCenter && !isNaN(Number(defaultCenter[0])) && !isNaN(Number(defaultCenter[1])) 
        ? [Number(defaultCenter[0]), Number(defaultCenter[1])]
        : [28.9784, 41.0082];
    
    const centerObj = { lat: safeCenter[1], lng: safeCenter[0] };

    return (
        <div className={`relative overflow-hidden rounded-xl shadow-lg border border-slate-200 bg-slate-100 ${className}`}>
            <div className="absolute inset-0 w-full h-full" style={{ minHeight: '400px' }}>
                <Map
                    defaultZoom={zoom}
                    defaultCenter={centerObj}
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                    mapId="DEMO_MAP_ID" // Needed for AdvancedMarker
                >
                    {/* Render Markers */}
                    {markers && markers.map(m => {
                        if (!m.position || isNaN(Number(m.position[0])) || isNaN(Number(m.position[1]))) return null;
                        return (
                            <AdvancedMarker 
                                key={m.id} 
                                position={{ lat: Number(m.position[1]), lng: Number(m.position[0]) }}
                                title={m.title}
                            >
                                <div className="w-4 h-4 bg-secondary rounded-full border-2 border-white shadow-md"></div>
                            </AdvancedMarker>
                        );
                    })}
                    
                    {/* Controller to handle bounds and GeoJson */}
                    <MapController routeGeoJson={routeGeoJson} markers={markers} />
                </Map>
            </div>
        </div>
    );
};

export default MapContainer;
