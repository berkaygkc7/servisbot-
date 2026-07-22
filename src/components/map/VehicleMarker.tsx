import React, { useEffect, useRef, useState } from 'react';
import { AdvancedMarker, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';

interface RouteStop {
    id: string;
    coordinates: [number, number];
    name: string;
}

interface VehicleMarkerProps {
    routeCoordinates: [number, number][]; // [lng, lat] format
    stops: RouteStop[];
    isPlaying: boolean;
    speedMultiplier: number;
}

const VehicleMarker: React.FC<VehicleMarkerProps> = ({ routeCoordinates, stops, isPlaying, speedMultiplier }) => {
    const [markerRef, marker] = useAdvancedMarkerRef();
    const progressRef = useRef(0);
    const requestRef = useRef<number | null>(null);
    const isWaitingRef = useRef(false);

    const [stopIndices, setStopIndices] = useState<number[]>([]);

    useEffect(() => {
        if (!routeCoordinates || routeCoordinates.length === 0) return;

        const indices = stops.map(stop => {
            let minDist = Infinity;
            let closestIndex = -1;

            routeCoordinates.forEach((coord, index) => {
                const dx = coord[0] - stop.coordinates[0];
                const dy = coord[1] - stop.coordinates[1];
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                    minDist = dist;
                    closestIndex = index;
                }
            });
            return closestIndex;
        });
        setStopIndices(indices);
    }, [routeCoordinates, stops]);

    // Animation Loop
    useEffect(() => {
        if (!isPlaying || !routeCoordinates.length || !marker) {
            if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
            return;
        }

        const animate = () => {
            if (isWaitingRef.current) return;

            const speedFactor = 0.05 * speedMultiplier;
            progressRef.current += speedFactor;

            if (progressRef.current >= routeCoordinates.length - 1) {
                progressRef.current = 0; 
            }

            const currentIndex = Math.floor(progressRef.current);
            const nextIndex = Math.min(currentIndex + 1, routeCoordinates.length - 1);
            const ratio = progressRef.current - currentIndex;

            const currentPos = routeCoordinates[currentIndex];
            const nextPos = routeCoordinates[nextIndex];

            const lng = currentPos[0] + (nextPos[0] - currentPos[0]) * ratio;
            const lat = currentPos[1] + (nextPos[1] - currentPos[1]) * ratio;

            // Direct DOM manipulation on Google Maps AdvancedMarker for 60fps
            marker.position = { lat, lng };

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, speedMultiplier, routeCoordinates, stopIndices, marker]);

    if (!routeCoordinates || routeCoordinates.length === 0) return null;

    // Initial position
    const initialPos = routeCoordinates[0];

    return (
        <AdvancedMarker
            ref={markerRef}
            position={{ lat: initialPos[1], lng: initialPos[0] }}
            zIndex={1000} // Keep it on top
        >
            <div className="vehicle-marker ring-2 ring-white rounded-md shadow-lg bg-yellow-400 p-1 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-900">
                    <path d="M8 6v6" /><path d="M15 6v6" /><path d="M2 12h19.6" />
                    <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.34-.1-.66-.3-.92s-.5-.4-.8-.4H2" />
                    <rect x="2" y="5" width="4" height="6" rx="1" />
                    <rect x="8" y="5" width="6" height="6" rx="1" />
                    <path d="M2 12v6" /><path d="M2 10h20" />
                </svg>
            </div>
        </AdvancedMarker>
    );
};

export default VehicleMarker;
