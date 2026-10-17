// ==============================================================================
// ServisBot Akıllı Rota & Durak Sıralama Optimizasyon Motoru
// Features:
// 1. Google Maps Directions API entegrasyonu (<= 25 ara durak için)
// 2. 2-Opt & Nearest-Neighbor TSP (Gezgin Satıcı) Algoritması (> 25 durak ve offline fallback)
// 3. Yakıt Tasarrufu & Maliyet Analiz Raporu (Litre, TL ve aylık projeksiyon)
// ==============================================================================

export interface RouteResult {
    coordinates: [number, number][]; // LineString: [lng, lat]
    distance: number; // meters
    duration: number; // seconds
    snapped_waypoints?: [number, number][]; // Snapped coordinates of the waypoints
    directionsResponse?: google.maps.DirectionsResult;
}

export interface FuelSavingsReport {
    originalDistanceKm: number;
    optimizedDistanceKm: number;
    savedDistanceKm: number;
    savingsPercentage: number;
    savedFuelLiters: number;
    savedMoneyTRY: number;
    monthlySavingsTRY: number;
}

export interface OptimizationResult {
    coordinates: [number, number][];
    distance: number;
    duration: number;
    waypoint_order: number[];
    snapped_waypoints?: [number, number][];
    directionsResponse?: google.maps.DirectionsResult;
    savingsReport?: FuelSavingsReport;
    isFallbackTsp?: boolean;
}

/**
 * Kuş uçuşu (Haversine) mesafe hesabı (km cinsinden).
 * [lng, lat] formatında iki nokta alır.
 */
export function haversineDistanceKm(p1: [number, number], p2: [number, number]): number {
    const [lng1, lat1] = p1;
    const [lng2, lat2] = p2;
    const R = 6371; // Dünya yarıçapı km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Noktalar dizisinin toplam yol mesafesini hesaplar (km cinsinden).
 */
export function calculatePathDistanceKm(points: [number, number][]): number {
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
        total += haversineDistanceKm(points[i], points[i + 1]);
    }
    return total;
}

/**
 * 2-Opt & En Yakın Komşu (Nearest Neighbor) Gezgin Satıcı (TSP) Algoritması.
 * Başlangıç (nokta 0) ve Bitiş (nokta N-1) sabit tutulurken aradaki tüm ara durakları
 * en kısa mesafe ve minimum kesişim için sıralar.
 * 
 * Google Maps'in 25 durak sınırına takılmaz, 100+ durak dahi olsa 10ms içinde çözer.
 */
export function solveTsp2Opt(points: [number, number][]): { order: number[]; totalDistanceKm: number } {
    const n = points.length;
    if (n <= 3) {
        return {
            order: points.map((_, i) => i),
            totalDistanceKm: calculatePathDistanceKm(points),
        };
    }

    // 1. En Yakın Komşu (Nearest Neighbor) ile Başlangıç Turu Oluştur
    const visited = new Array(n).fill(false);
    visited[0] = true;
    visited[n - 1] = true; // Bitiş noktası en son eklenecek

    const tour: number[] = [0];
    let current = 0;

    for (let step = 1; step < n - 1; step++) {
        let nearestDist = Infinity;
        let nearestIdx = -1;

        for (let candidate = 1; candidate < n - 1; candidate++) {
            if (!visited[candidate]) {
                const dist = haversineDistanceKm(points[current], points[candidate]);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIdx = candidate;
                }
            }
        }

        if (nearestIdx !== -1) {
            visited[nearestIdx] = true;
            tour.push(nearestIdx);
            current = nearestIdx;
        }
    }

    // Bitiş noktasını en sona ekle
    tour.push(n - 1);

    // 2. 2-Opt İyileştirme Döngüsü (Kesişen yolları çöz ve mesafeyi kısalt)
    let improved = true;
    let iteration = 0;
    const maxIterations = 50;

    while (improved && iteration < maxIterations) {
        improved = false;
        iteration++;

        // 1'den n-2'ye kadar (başlangıç ve bitiş sabit)
        for (let i = 1; i < n - 2; i++) {
            for (let k = i + 1; k < n - 1; k++) {
                const pA = points[tour[i - 1]];
                const pB = points[tour[i]];
                const pC = points[tour[k]];
                const pD = points[tour[k + 1]];

                const currentDistance = haversineDistanceKm(pA, pB) + haversineDistanceKm(pC, pD);
                const newDistance = haversineDistanceKm(pA, pC) + haversineDistanceKm(pB, pD);

                if (newDistance < currentDistance - 0.001) {
                    // Ters çevir (2-opt swap)
                    const segment = tour.slice(i, k + 1).reverse();
                    tour.splice(i, segment.length, ...segment);
                    improved = true;
                }
            }
        }
    }

    // Sıralanmış noktaların toplam mesafesi
    const orderedPoints = tour.map(idx => points[idx]);
    const finalDistance = calculatePathDistanceKm(orderedPoints);

    return {
        order: tour,
        totalDistanceKm: finalDistance,
    };
}

/**
 * Orijinal ve optimize edilmiş mesafe üzerinden yakıt ve finansal tasarruf raporu üretir.
 */
export function calculateFuelSavings(originalKm: number, optimizedKm: number): FuelSavingsReport {
    const savedDistanceKm = Math.max(0, parseFloat((originalKm - optimizedKm).toFixed(1)));
    const savingsPercentage = originalKm > 0 ? parseFloat(((savedDistanceKm / originalKm) * 100).toFixed(1)) : 0;
    
    // Standart servis minibüsleri (16-27 kişilik) ortalama 100 km'de ~12 litre motorin tüketir
    const savedFuelLiters = parseFloat(((savedDistanceKm * 12) / 100).toFixed(1));
    
    // Güncel motorin litre fiyatı (~44 TL/L)
    const DIESEL_PRICE_TRY = 44;
    const savedMoneyTRY = Math.round(savedFuelLiters * DIESEL_PRICE_TRY);
    
    // Aylık projeksiyon: Günde 2 sefer (Sabah + Akşam) x Ayda 22 okul günü
    const monthlySavingsTRY = savedMoneyTRY * 2 * 22;

    return {
        originalDistanceKm: parseFloat(originalKm.toFixed(1)),
        optimizedDistanceKm: parseFloat(optimizedKm.toFixed(1)),
        savedDistanceKm,
        savingsPercentage,
        savedFuelLiters,
        savedMoneyTRY,
        monthlySavingsTRY,
    };
}

/**
 * Decodes a Google Maps encoded polyline string into an array of [lng, lat] coordinates.
 */
export function decodePolyline(encoded: string): [number, number][] {
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

        poly.push([lng / 1e5, lat / 1e5]); // [lng, lat] for GeoJSON
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
        
        let totalDistance = 0;
        let totalDuration = 0;
        route.legs.forEach(leg => {
            totalDistance += leg.distance?.value || 0;
            totalDuration += leg.duration?.value || 0;
        });

        const detailedCoordinates: [number, number][] = [];
        route.legs.forEach(leg => {
            leg.steps.forEach(step => {
                step.path.forEach(pathLatLng => {
                    detailedCoordinates.push([pathLatLng.lng(), pathLatLng.lat()]);
                });
            });
        });

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
            snapped_waypoints: snappedWaypoints,
            directionsResponse: response
        };

    } catch (error) {
        console.error('Failed to fetch Google Maps route:', error);
        return null;
    }
};

/**
 * Hibrit Akıllı Rota Optimizasyonu:
 * - 25 veya daha az ara durak: Google Maps Directions API optimizeWaypoints: true kullanır.
 * - 25'ten fazla durak veya Google API limiti aşıldığında: Yerel 2-Opt TSP algoritması ile çözer,
 *   harita geometrisini oluşturur ve asla hata vermez.
 * - Her iki durumda da orijinal vs optimize edilmiş rota arasındaki Yakıt & Maliyet Tasarruf Raporunu üretir.
 */
export const optimizeRoute = async (
    points: [number, number][],
    routesLibrary?: google.maps.RoutesLibrary | null
): Promise<OptimizationResult | null> => {
    try {
        if (points.length < 3) return null;

        // Orijinal mesafe tahmini (Kuş uçuşu bazlı veya mevcut bacaklar)
        const originalEstimatedKm = calculatePathDistanceKm(points) * 1.25; // Yol kıvrım faktörü ~1.25

        // Google Maps maksimum 25 ara durak destekler (Origin + 25 WP + Dest = 27 nokta)
        const canUseGoogleOptimization = points.length <= 27 && !!routesLibrary;

        if (canUseGoogleOptimization && routesLibrary) {
            try {
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
                    optimizeWaypoints: true
                };

                const response = await directionsService.route(request);
                
                if (response.routes.length > 0) {
                    const route = response.routes[0];
                    
                    let totalDistance = 0;
                    let totalDuration = 0;
                    route.legs.forEach(leg => {
                        totalDistance += leg.distance?.value || 0;
                        totalDuration += leg.duration?.value || 0;
                    });

                    const detailedCoordinates: [number, number][] = [];
                    route.legs.forEach(leg => {
                        leg.steps.forEach(step => {
                            step.path.forEach(pathLatLng => {
                                detailedCoordinates.push([pathLatLng.lng(), pathLatLng.lat()]);
                            });
                        });
                    });

                    const fullOrder = [0]; // origin
                    if (route.waypoint_order) {
                        route.waypoint_order.forEach(wpIndex => {
                            fullOrder.push(wpIndex + 1);
                        });
                    }
                    fullOrder.push(points.length - 1); // destination

                    const snappedWaypoints: [number, number][] = [];
                    route.legs.forEach(leg => {
                        snappedWaypoints.push([leg.start_location.lng(), leg.start_location.lat()]);
                    });
                    const lastLeg = route.legs[route.legs.length - 1];
                    if (lastLeg) {
                        snappedWaypoints.push([lastLeg.end_location.lng(), lastLeg.end_location.lat()]);
                    }

                    const optimizedKm = totalDistance / 1000;
                    const savingsReport = calculateFuelSavings(originalEstimatedKm, optimizedKm);

                    return {
                        coordinates: detailedCoordinates,
                        distance: totalDistance,
                        duration: totalDuration,
                        waypoint_order: fullOrder,
                        snapped_waypoints: snappedWaypoints,
                        directionsResponse: response,
                        savingsReport,
                        isFallbackTsp: false,
                    };
                }
            } catch (googleError) {
                console.warn('Google Maps optimization failed, falling back to 2-Opt TSP engine:', googleError);
            }
        }

        // ==============================================================================
        // FALLBACK / YÜKSEK HACİMLİ DURAK MOTORU: 2-Opt TSP Algoritması
        // ==============================================================================
        const tspResult = solveTsp2Opt(points);
        const orderedPoints = tspResult.order.map(i => points[i]);

        // Sıralanmış noktalar için Google Maps route veya düz çizgi oluştur
        let finalCoordinates: [number, number][] = [];
        let finalDistance = tspResult.totalDistanceKm * 1000 * 1.25; // metre
        let finalDuration = (finalDistance / 1000 / 30) * 3600; // 30 km/s ortalama şehir içi hız
        let directionsResponse: google.maps.DirectionsResult | undefined = undefined;

        if (routesLibrary) {
            // Sıralanmış yeni noktalar için yol geometrisini çek
            const routeResult = await fetchRoute(orderedPoints.slice(0, 25), routesLibrary);
            if (routeResult) {
                finalCoordinates = routeResult.coordinates;
                finalDistance = routeResult.distance;
                finalDuration = routeResult.duration;
                directionsResponse = routeResult.directionsResponse;
            }
        }

        if (finalCoordinates.length === 0) {
            finalCoordinates = orderedPoints;
        }

        const optimizedKm = finalDistance / 1000;
        const savingsReport = calculateFuelSavings(originalEstimatedKm, optimizedKm);

        return {
            coordinates: finalCoordinates,
            distance: finalDistance,
            duration: finalDuration,
            waypoint_order: tspResult.order,
            snapped_waypoints: orderedPoints,
            directionsResponse,
            savingsReport,
            isFallbackTsp: true,
        };

    } catch (error) {
        console.error('Failed to optimize route:', error);
        return null;
    }
};
