// This service now relies on Google Maps Directions API instead of OSRM.

export interface RouteResult {
    coordinates: [number, number][]; // LineString: [lng, lat]
    distance: number; // meters
    duration: number; // seconds
    snapped_waypoints?: [number, number][]; // Snapped coordinates of the waypoints
}

export interface OptimizationResult {
    coordinates: [number, number][];
    distance: number;
    duration: number;
    waypoint_order: number[];
    snapped_waypoints?: [number, number][];
}

/**
 * Decodes a Google Maps encoded polyline string into an array of [lng, lat] coordinates.
 */
function decodePolyline(encoded: string): [number, number][] {
    const poly: [number, number][] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        poly.push([lng / 1e5, lat / 1e5]); // Note: [lng, lat] for GeoJSON
    }
    return poly;
}

export const fetchRoute = async (
    points: [number, number][],
    routesLibrary?: google.maps.RoutesLibrary | null
): Promise<RouteResult | null> => {
    try {
        if (points.length < 2 || !routesLibrary) return null;

        const directionsService = new routesLibrary.DirectionsService();

        const origin = new google.maps.LatLng(points[0][1], points[0][0]);
        const destination = new google.maps.LatLng(points[points.length - 1][1], points[points.length - 1][0]);
        
        const waypoints: google.maps.DirectionsWaypoint[] = [];
        for (let i = 1; i < points.length - 1; i++) {
            waypoints.push({
                location: new google.maps.LatLng(points[i][1], points[i][0]),
                stopover: true
            });
        }

        const request: google.maps.DirectionsRequest = {
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false // Don't reorder for simple fetch
        };

        const response = await directionsService.route(request);
        
        if (response.routes.length === 0) return null;
        
        const route = response.routes[0];
        
        // Sum up distance and duration across all legs
        let totalDistance = 0;
        let totalDuration = 0;
        route.legs.forEach(leg => {
            totalDistance += leg.distance?.value || 0;
            totalDuration += leg.duration?.value || 0;
        });

        // Extract highly detailed path from legs and steps instead of overview_polyline
        const detailedCoordinates: [number, number][] = [];
        route.legs.forEach(leg => {
            leg.steps.forEach(step => {
                step.path.forEach(pathLatLng => {
                    // Google Maps gives LatLng, we need GeoJSON [lng, lat]
                    detailedCoordinates.push([pathLatLng.lng(), pathLatLng.lat()]);
                });
            });
        });

        const snappedWaypoints: [number, number][] = [];
        route.legs.forEach(leg => {
            snappedWaypoints.push([leg.start_location.lng(), leg.start_location.lat()]);
        });
        // The last leg's end_location is the destination
        const lastLeg = route.legs[route.legs.length - 1];
        if (lastLeg) {
            snappedWaypoints.push([lastLeg.end_location.lng(), lastLeg.end_location.lat()]);
        }

        return {
            coordinates: detailedCoordinates,
            distance: totalDistance,
            duration: totalDuration,
            snapped_waypoints: snappedWaypoints
        };

    } catch (error) {
        console.error('Failed to fetch Google Maps route:', error);
        return null;
    }
};

export const optimizeRoute = async (
    points: [number, number][],
    routesLibrary?: google.maps.RoutesLibrary | null
): Promise<OptimizationResult | null> => {
    try {
        if (points.length < 3 || !routesLibrary) return null; 

        const directionsService = new routesLibrary.DirectionsService();

        const origin = new google.maps.LatLng(points[0][1], points[0][0]);
        const destination = new google.maps.LatLng(points[points.length - 1][1], points[points.length - 1][0]);
        
        const waypoints: google.maps.DirectionsWaypoint[] = [];
        for (let i = 1; i < points.length - 1; i++) {
            waypoints.push({
                location: new google.maps.LatLng(points[i][1], points[i][0]),
                stopover: true
            });
        }

        const request: google.maps.DirectionsRequest = {
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: true // Reorder intermediate waypoints
        };

        const response = await directionsService.route(request);
        
        if (response.routes.length === 0) return null;
        
        const route = response.routes[0];
        
        let totalDistance = 0;
        let totalDuration = 0;
        route.legs.forEach(leg => {
            totalDistance += leg.distance?.value || 0;
            totalDuration += leg.duration?.value || 0;
        });

        // Extract highly detailed path from legs and steps instead of overview_polyline
        const detailedCoordinates: [number, number][] = [];
        route.legs.forEach(leg => {
            leg.steps.forEach(step => {
                step.path.forEach(pathLatLng => {
                    detailedCoordinates.push([pathLatLng.lng(), pathLatLng.lat()]);
                });
            });
        });

        const fullOrder = [0]; // origin is always first
        if (route.waypoint_order) {
            route.waypoint_order.forEach(wpIndex => {
                fullOrder.push(wpIndex + 1); // +1 because points[0] is origin
            });
        }
        fullOrder.push(points.length - 1); // destination is always last

        const snappedWaypoints: [number, number][] = [];
        route.legs.forEach(leg => {
            snappedWaypoints.push([leg.start_location.lng(), leg.start_location.lat()]);
        });
        const lastLeg = route.legs[route.legs.length - 1];
        if (lastLeg) {
            snappedWaypoints.push([lastLeg.end_location.lng(), lastLeg.end_location.lat()]);
        }

        return {
            coordinates: detailedCoordinates,
            distance: totalDistance,
            duration: totalDuration,
            waypoint_order: fullOrder,
            snapped_waypoints: snappedWaypoints
        };

    } catch (error) {
        console.error('Failed to optimize Google Maps route:', error);
        return null;
    }
};
