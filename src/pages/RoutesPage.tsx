import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import RouteList from '../components/dashboard/RouteList';
import MapScene from '../components/map/MapScene';
import { fetchRoute, optimizeRoute } from '../services/routingService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext'; // Added this import
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
    ArrowLeft, Users, UserPlus, Plus, Bus, Navigation, Clock, Check, Loader2, Trash2, MapPin, Tag as TagIcon, Sparkles, Pencil, Home, X, Search, Map as MapIcon
} from 'lucide-react';

// --- Supabase Types (Mapped) ---

interface RouteStop {
    id: string; // uuid
    route_id: string;
    order_index: number;
    name: string;
    latitude: number;
    longitude: number;
    estimated_time?: string; // "07:30"

    // UI Helpers
    type: 'start' | 'stop' | 'end';
    coordinates: [number, number]; // [lng, lat] for Mapbox
    assignedStudentIds: string[];
}

interface RouteDef {
    id: string;
    name: string;
    school_id?: string;
    vehicle_id?: string;
    status: 'active' | 'completed' | 'pending';
    company_id?: string; // Added company_id

    // Joined Data
    vehicles?: { plate_number: string; driver_name: string; driver_phone: string };
    schools?: { name: string };

    // UI Helpers
    vehicle: string;
    school_name?: string;
    stops: RouteStop[];
    distance: string;
    duration: string;
    time: string;
    coordinates: [number, number][]; // LineString geometry

    // DB Fields
    price?: number;
    distance_km?: number;
    duration_min?: number;
    creation_method?: 'auto' | 'manual';
    tags?: string[];
}

interface Vehicle {
    id: string;
    plate_number: string;
    driver_name: string;
}

interface Student {
    id: string;
    full_name: string;
    home_latitude: number;
    home_longitude: number;
    address?: string;
    parent_name?: string;
    parent_phone?: string;
    tags?: string[];
    schools?: { name: string };
    vehicles?: { plate_number: string };
}

const RoutesPage: React.FC = () => {
    const { profile } = useAuth(); // Extracted profile
    const [searchParams] = useSearchParams();
    const urlRouteId = searchParams.get('id');
    const geocodingLibrary = useMapsLibrary('geocoding');
    const routesLibrary = useMapsLibrary('routes');
    // --- State ---
    const [routes, setRoutes] = useState<RouteDef[]>([]);
    const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
    const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [routeGeoJson, setRouteGeoJson] = useState<any>(null);
    const [multiRoutesGeoJson, setMultiRoutesGeoJson] = useState<any>(null);
    const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
    const [liveVehicles, setLiveVehicles] = useState<{ id: string; position: [number, number]; title: string }[]>([]);
    const [showStudentLocations, setShowStudentLocations] = useState(false); // New Toggle
    const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
    
    // Extract unique neighborhoods from students' addresses
    const neighborhoods = useMemo(() => {
        const mh = new Set<string>();
        availableStudents.forEach(s => {
            if (s.address) {
                // Match anything like "X Mah.", "X Mahallesi", "X Köyü"
                const match = s.address.match(/([^,\d]+(Mahallesi|Mah\.|Mah|Köyü))/i);
                if (match) mh.add(match[0].trim());
            }
        });
        return Array.from(mh).sort();
    }, [availableStudents]);

    const [showTagFilterMenu, setShowTagFilterMenu] = useState(false); // New Toggle for tag filter
    const [availableTags, setAvailableTags] = useState<{ id: string; name: string }[]>([]);
    const [activeTagFilter, setActiveTagFilter] = useState<string[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
    const [activeSchoolFilter, setActiveSchoolFilter] = useState<'all' | string>('all');
    const [newRouteSchoolId, setNewRouteSchoolId] = useState<string>('');
    const [newRouteTags, setNewRouteTags] = useState<string[]>([]);

    // Creation Flow
    const [creationStep, setCreationStep] = useState<'idle' | 'method_selection' | 'start' | 'end' | 'stops' | 'manual_draw'>('idle');
    const [creationMethod, setCreationMethod] = useState<'auto' | 'manual' | null>(null);
    const [tempPoints, setTempPoints] = useState<{ type: 'start' | 'end' | 'stop', pos: [number, number], studentId?: string }[]>([]);
    const [assigningStopId, setAssigningStopId] = useState<string | null>(null);
    const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
    const [isOptimized, setIsOptimized] = useState(false);

    // Map Search State
    const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
    const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);
    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResultPin, setSearchResultPin] = useState<[number, number] | null>(null);

    // Route Editing State
    const [editingRouteData, setEditingRouteData] = useState<{ id: string, name: string, school_id: string, time: string, tags: string[], price: number } | null>(null);
    const [newRouteTime, setNewRouteTime] = useState<string>('08:00');

    const placesLibrary = useMapsLibrary('places');
    const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
    const [placePredictions, setPlacePredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);

    useEffect(() => {
        if (placesLibrary) {
            setAutocompleteService(new placesLibrary.AutocompleteService());
        }
    }, [placesLibrary]);

    const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setMapSearchQuery(query);
        if (!autocompleteService || !query.trim()) {
            setPlacePredictions([]);
            return;
        }
        autocompleteService.getPlacePredictions({ input: query }, (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                setPlacePredictions(predictions);
            } else {
                setPlacePredictions([]);
            }
        });
    };

    const handleAddressSearch = async (e?: React.FormEvent, selectedAddress?: string) => {
        if (e) e.preventDefault();
        const query = selectedAddress || mapSearchQuery.trim();
        if (!query || !geocodingLibrary) return;

        setMapSearchQuery(query);
        setPlacePredictions([]);
        setIsSearching(true);
        try {
            const geocoder = new geocodingLibrary.Geocoder();
            const response = await geocoder.geocode({ address: query });
            if (response.results && response.results.length > 0) {
                const location = response.results[0].geometry.location;
                const coords: [number, number] = [location.lng(), location.lat()];
                setMapCenter(coords);
                setMapZoom(17);
                setSearchResultPin(coords);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Initial Data Load
    useEffect(() => {
        loadInitialData();
        const unsubscribe = setupRealtimeSubscription();
        return () => {
            unsubscribe();
        };
    }, []);

    // Select route from URL param if present
    useEffect(() => {
        if (urlRouteId && routes.length > 0) {
            setSelectedRouteId(urlRouteId);
        }
    }, [urlRouteId, routes.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (editingRouteData) setEditingRouteData(null);
                if (creationStep !== 'idle') {
                    setCreationStep('idle');
                    setCreationMethod(null);
                }
                if (selectedStudent) setSelectedStudent(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingRouteData, creationStep, selectedStudent]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Vehicles
            const { data: vehiclesData } = await supabase.from('vehicles').select('id, plate_number, driver_name');
            if (vehiclesData) setAvailableVehicles(vehiclesData);

            // 2. Fetch Students
            const { data: studentsData } = await supabase.from('students').select('id, full_name, home_latitude, home_longitude, address, tags, parent_name, parent_phone, grade, blood_group, allergies, registration_date, schools(name), vehicles(plate_number)');
            if (studentsData) setAvailableStudents(studentsData as any);

            // 2.5 Fetch Tags
            const { data: tagsData } = await supabase.from('tags').select('id, name').order('name');
            if (tagsData) setAvailableTags(tagsData);

            // 2.6 Fetch Schools
            const { data: schoolsData } = await supabase.from('schools').select('id, name').order('name');
            if (schoolsData) setSchools(schoolsData);

            // 3. Fetch Routes with related data
            await fetchRoutes();

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoutes = async () => {
        const { data: routesData, error } = await supabase
            .from('routes')
            .select(`
                *,
                vehicles (plate_number, driver_name, driver_phone),
                schools (name),
                route_stops (*),
                student_route_assignments (student_id, stop_id)
            `)
            .order('created_at', { ascending: false });

        if (error || !routesData) {
            console.error('Error fetching routes:', error);
            return;
        }

        // Map Response to UI Models
        const mappedRoutes: RouteDef[] = routesData.map((r: any) => {
            // Process Stops
            const stops: RouteStop[] = (r.route_stops || [])
                .sort((a: any, b: any) => a.order_index - b.order_index)
                .map((s: any, index: number, arr: any[]) => ({
                    id: s.id,
                    route_id: s.route_id,
                    order_index: s.order_index,
                    name: s.name,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    estimated_time: s.estimated_time,
                    // UI Helpers
                    type: index === 0 ? 'start' : index === arr.length - 1 ? 'end' : 'stop',
                    coordinates: [s.longitude, s.latitude], // Supabase stores lat/long, Mapbox wants lng/lat
                    assignedStudentIds: r.student_route_assignments
                        ?.filter((res: any) => res.stop_id === s.id)
                        ?.map((res: any) => res.student_id) || []
                }));

            return {
                id: r.id,
                name: r.name,
                school_id: r.school_id,
                vehicle_id: r.vehicle_id,
                status: r.status,
                vehicles: r.vehicles,
                vehicle: r.vehicles ? `${r.vehicles.plate_number} - ${r.vehicles.driver_name}` : 'Atanmadı',
                school_name: r.schools?.name,
                // New field
                creation_method: r.creation_method as 'auto' | 'manual',
                tags: r.tags || [],
                stops: stops,
                distance: r.distance_km ? `${r.distance_km} km` : '-- km',
                duration: r.duration_min ? `${Math.round(r.duration_min)} dk` : '-- dk',
                time: r.time || '08:00',
                price: r.price || 0,
                coordinates: r.geometry ? r.geometry.coordinates : []
            };
        });

        setRoutes(mappedRoutes);
    };

    const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
    const [hoverPosition, setHoverPosition] = useState<[number, number] | null>(null);

    const setupRealtimeSubscription = () => {
        const channel = supabase
            .channel('public:vehicles')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'vehicles' },
                (payload) => {
                    const v = payload.new;
                    setLiveVehicles(prev => {
                        const exists = prev.find(m => m.id === v.plate_number);
                        if (exists) {
                            return prev.map(m => m.id === v.plate_number ? { ...m, position: [v.current_longitude, v.current_latitude] } : m);
                        } else {
                            return [...prev, { id: v.plate_number, position: [v.current_longitude, v.current_latitude], title: v.plate_number }];
                        }
                    });
                }
            )
            .subscribe();

        // Initial Live Locations
        supabase.from('vehicles').select('*').then(({ data }) => {
            if (data) {
                setLiveVehicles(data.map((v: any) => ({
                    id: v.plate_number,
                    position: [v.current_longitude, v.current_latitude],
                    title: v.plate_number
                })));
            }
        });

        return () => { supabase.removeChannel(channel); };
    };

    const handleRouteHover = useCallback((routeId: string | null, position: [number, number] | null) => {
        setHoveredRouteId(routeId);
        setHoverPosition(position);
    }, []);

    const handleRouteClickFromMap = useCallback((routeId: string) => {
        const route = routes.find(r => r.id === routeId);
        if (route) {
            setSelectedRouteId(routeId);
        }
    }, [routes]);



    // Derived State
    const selectedRoute = routes.find(r => r.id === selectedRouteId);

    // Derived Route GeoJSON for Tag Highlighting (Multiple Routes)
    useEffect(() => {
        if (routes.length === 0) {
            setMultiRoutesGeoJson(null);
            return;
        }

        const ROUTE_COLORS = [
            '#3b82f6', // Blue
            '#10b981', // Emerald
            '#8b5cf6', // Purple
            '#f59e0b', // Amber
            '#ec4899', // Pink
            '#06b6d4', // Cyan
            '#f43f5e', // Rose
            '#14b8a6'  // Teal
        ];

        const features = routes.flatMap((route, index) => {
            if (!route.coordinates || route.coordinates.length < 2) return [];
            // Don't render the selected route twice (it's already handled by routeGeoJson)
            if (route.id === selectedRouteId) return [];

            let isHighlighted = true; // Not faint by default
            let matchesFilters = true;

            if (activeTagFilter.length > 0) {
                const allAssignedIds = route.stops?.flatMap(s => s.assignedStudentIds || []) || [];
                matchesFilters = availableStudents.some(s =>
                    allAssignedIds.includes(s.id) &&
                    s.tags &&
                    activeTagFilter.some(tag => s.tags?.includes(tag))
                );

                // ALSO check route's own tags!
                if (!matchesFilters && route.tags) {
                    matchesFilters = activeTagFilter.some(tag => route.tags?.includes(tag));
                }
            }

            if (!matchesFilters) return [];

            const color = ROUTE_COLORS[index % ROUTE_COLORS.length];

            const validCoords = route.coordinates
                .filter((c: any) => Array.isArray(c) && c.length >= 2 && !isNaN(Number(c[0])) && !isNaN(Number(c[1])))
                .map((c: any) => [Number(c[0]), Number(c[1])]);

            if (validCoords.length < 2) return [];

            return {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: validCoords },
                properties: {
                    id: route.id,
                    name: route.name,
                    isHighlighted,
                    color
                }
            };
        });

        if (features.length > 0) {
            setMultiRoutesGeoJson({
                type: 'FeatureCollection',
                features
            });
        } else {
            setMultiRoutesGeoJson(null);
        }
    }, [routes, availableStudents, activeTagFilter, selectedRouteId]);

    // --- Helpers ---

    const getMarkers = () => {
        const markers: any[] = [];

        // 1. Creation Mode Markers
        if (creationStep !== 'idle') {
            tempPoints.forEach((p, i) => {
                // Defensive: Skip markers if coordinates are invalid or 0,0
                if (!p.pos || p.pos.length < 2) return;
                const lng = Number(p.pos[0]);
                const lat = Number(p.pos[1]);

                if (isNaN(lng) || isNaN(lat)) return;
                if (lng === 0 && lat === 0) return;

                markers.push({
                    id: `temp-${i}`,
                    position: [lng, lat],
                    title: p.type === 'start' ? 'Başlangıç' : p.type === 'end' ? 'Bitiş' : `Durak ${i}`
                });
            });
        }
        // 2. Selected Route Markers (Stops)
        else if (selectedRoute) {
            // Refinement: Hide stop markers for manually created routes
            selectedRoute.stops.forEach((stop, _index) => {
                // Defensive: Skip markers if coordinates are invalid or 0,0
                if (!stop.coordinates || stop.coordinates.length < 2) return;
                const lng = Number(stop.coordinates[0]);
                const lat = Number(stop.coordinates[1]);
                
                if (isNaN(lng) || isNaN(lat)) return;
                if (lng === 0 && lat === 0) return;

                // The user explicitly requested to see all the stops they added.
                // We no longer hide intermediate markers for manual routes.

                markers.push({
                    id: stop.id,
                    position: [lng, lat],
                    title: stop.name
                });
            });
        }

        // 3. Student Locations (if toggled)
        if (showStudentLocations) {
            availableStudents.forEach(s => {
                // Apply Tag Filter
                const matchesTags = activeTagFilter.length === 0 ||
                    (s.tags && activeTagFilter.every(tag => s.tags?.includes(tag)));

                // Apply Neighborhood Filter
                let matchesNeighborhood = true;
                if (selectedNeighborhood !== 'all') {
                    matchesNeighborhood = !!(s.address && s.address.toLowerCase().includes(selectedNeighborhood.toLowerCase()));
                }

                // Apply Main School Filter (only when not creating a route)
                const activeSchoolName = activeSchoolFilter !== 'all' ? schools.find(sch => sch.id === activeSchoolFilter)?.name : null;
                const matchesMainSchool = creationStep !== 'idle' || activeSchoolFilter === 'all' ||
                    (s.schools && s.schools.name === activeSchoolName);

                if (matchesTags && matchesNeighborhood && matchesMainSchool && s.home_latitude && s.home_longitude) {
                    const lng = Number(s.home_longitude);
                    const lat = Number(s.home_latitude);
                    
                    if (isNaN(lng) || isNaN(lat)) return;
                    if (lng === 0 && lat === 0) return;

                    markers.push({
                        id: s.id, // Removed student- prefix for consistency and reliable matching
                        position: [lng, lat],
                        title: s.full_name,
                        type: 'student_home'
                    });
                }
            });
        }

        // 4. Live Vehicle Locations
        liveVehicles.forEach(v => {
            // Defensive: Skip markers if coordinates are invalid or 0,0
            if (!v.position || v.position.length < 2) return;
            const lng = Number(v.position[0]);
            const lat = Number(v.position[1]);

            if (isNaN(lng) || isNaN(lat)) return;
            if (lng === 0 && lat === 0) return;

            markers.push({ ...v, position: [lng, lat] });
        });

        // 5. Search Result Pin
        if (searchResultPin && searchResultPin.length >= 2) {
            const lng = Number(searchResultPin[0]);
            const lat = Number(searchResultPin[1]);

            if (!isNaN(lng) && !isNaN(lat) && (lng !== 0 || lat !== 0)) {
                markers.push({
                    id: 'search-result',
                    position: [lng, lat],
                    title: 'Arama Sonucu',
                    type: 'search_result'
                });
            }
        }

        return markers;
    };

    // --- Handlers: Route Creation ---

    const handleMapClick = useCallback(async (lng: number, lat: number) => {
        if (creationStep === 'idle' || creationStep === 'method_selection') return;

        if (creationMethod === 'manual') {
            // In manual mode, every click is a coordinate in the LineString
            addManualPoint(lng, lat);
        } else {
            addRoutePoint(lng, lat);
        }
    }, [creationStep, creationMethod, tempPoints.length]); // Dependencies for route updates


    const handleMarkerClick = useCallback((id: string | number, type?: string) => {
        if (type === 'student_home') {
            const student = availableStudents.find(s => s.id === id);

            if (student) {
                if (creationStep === 'idle') {
                    setSelectedStudent(student);
                    return;
                }

                // If in creation mode, add to route
                if (student.home_latitude && student.home_longitude) {
                    addRoutePoint(student.home_longitude, student.home_latitude, student.id);
                }
            }
        } else if (creationStep === 'idle') {
            console.log("Marker clicked in idle mode:", id, type);
        }
    }, [creationStep, availableStudents]);

    const addRoutePoint = (lng: number, lat: number, studentId?: string) => {
        setIsOptimized(false); // Reset optimization on any change
        if (creationStep === 'start') {
            setTempPoints([{ type: 'start', pos: [lng, lat], studentId }]);
            setCreationStep('stops'); // Switch to stops immediately
        } else if (creationStep === 'stops') {
            setTempPoints(prev => [...prev, { type: 'stop', pos: [lng, lat], studentId }]);
        } else if (creationStep === 'end') {
            // Only allow one end point
            const hasEnd = tempPoints.some(p => p.type === 'end');
            if (!hasEnd) {
                setTempPoints(prev => [...prev, { type: 'end', pos: [lng, lat], studentId }]);
            }
        }
    };

    const addManualPoint = (lng: number, lat: number) => {
        setIsOptimized(false);
        const newPoint = [lng, lat] as [number, number];
        setTempPoints(prev => [...prev, { type: 'stop', pos: newPoint }]);

        // Update GeoJSON preview immediately for manual drawing
        setRouteGeoJson((prev: any) => {
            // Correct accumulation: preservation of existing coordinates
            const currentCoords = prev?.geometry?.coordinates || [];
            const coords = [...currentCoords, newPoint];

            if (coords.length < 2) return null;
            return {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: coords },
                properties: {}
            };
        });
    };

    const handleOptimizeRoute = async () => {
        if (tempPoints.length < 3) return;
        setLoading(true);
        try {
            const pointsToOptimize = tempPoints.map(p => p.pos);
            const result = await optimizeRoute(pointsToOptimize, routesLibrary);

            if (result && result.waypoint_order) {
                // Reorder points based on OSRM result
                // result.waypoint_order is an array where value at index i is the index of the original point

                // wait, let's verify my previous logic in routingService.ts.
                // waypoints array in response: "index of the point in the trip."
                // So if waypoints[originalIndex] = { waypoint_index: newIndex }
                // So if original[0] has index 0, original[1] has index 2, original[2] has index 1.
                // It means order is 0, 2, 1.
                // My service code: order[wp.waypoint_index] = originalIndex;
                // So order[0] = 0, order[1] = 2, order[2] = 1.
                // So the new array should be [ original[0], original[2], original[1] ].
                // orderedPoints = result.waypoint_order.map(originalIndex => tempPoints[originalIndex])

                const snappedPoints = result.snapped_waypoints;
                const orderedPoints = result.waypoint_order.map((index, i) => {
                    const pt = tempPoints[index];
                    if (snappedPoints && snappedPoints[i]) {
                        return { ...pt, pos: snappedPoints[i] };
                    }
                    return pt;
                });
                setTempPoints(orderedPoints);
                setIsOptimized(true);

                // Show route preview on map
                setRouteGeoJson({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: result.coordinates },
                    properties: {}
                });

                // Show preview stats in a toast or summary if needed, for now just update map
                // const distKm = parseFloat((result.distance / 1000).toFixed(1));
                // const durMin = Math.round(result.duration / 60);

                // alert(`Rota optimize edildi! Mesafe: ${distKm} km, Süre: ${durMin} dk`);
            }
        } catch (error) {
            console.error("Optimize Error:", error);
            alert("Optimizasyon başarısız.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePoint = (_index: number) => {
        setTempPoints(prev => {
            const newPoints = [...prev];
            const deleted = newPoints[_index];
            newPoints.splice(_index, 1);

            // Logic to reset steps if critical points are deleted
            if (deleted.type === 'start') {
                setCreationStep('start');
                setRouteGeoJson(null); // Clear preview if start deleted
                return []; // Clear all if start is deleted? Or just remove start? Let's clear for simplicity/consistency
            } else if (deleted.type === 'end') {
                setRouteGeoJson(null); // Clear preview if end deleted
                if (creationStep === 'idle') return newPoints; // Should not happen
                setCreationStep('end');
            } else {
                // If a stop is deleted, the optimized route (if any) is now invalid
                setRouteGeoJson(null);
                setIsOptimized(false);
            }

            return newPoints;
        });

        // Update GeoJSON for manual mode
        if (creationMethod === 'manual') {
            setRouteGeoJson((prev: any) => {
                if (!prev) return null;
                const coords = [...prev.geometry.coordinates];
                coords.splice(_index, 1);
                if (coords.length < 2) return null;
                return { ...prev, geometry: { ...prev.geometry, coordinates: coords } };
            });
        }
    };

    const finishRouteCreation = async () => {
        if (tempPoints.length < 2) return;
        setLoading(true);
        try {

            // 1. Create Route
            const selectedSchoolName = schools.find(s => s.id === newRouteSchoolId)?.name || 'Bilinmeyen Okul';
            const { data: routeData, error: routeError } = await supabase
                .from('routes')
                .insert({
                    company_id: profile?.company_id,
                    name: `${selectedSchoolName} - Güzergah ${routes.length + 1}`,
                    school_id: newRouteSchoolId || null,
                    status: 'pending',
                    creation_method: creationMethod,
                    tags: newRouteTags,
                    time: newRouteTime,
                    // Save geometry for manual mode immediately
                    geometry: creationMethod === 'manual' && routeGeoJson ? routeGeoJson.geometry : null,
                    distance_km: creationMethod === 'manual' && routeGeoJson ? 0 : null, // Could calculate properly later
                    duration_min: creationMethod === 'manual' && routeGeoJson ? 0 : null
                })
                .select()
                .single();

            if (routeError) throw routeError;

            // 2. Prepare Stops (Auto or Manual)
            if (creationMethod === 'auto' || creationMethod === 'manual') {
                let routeOrderedPoints: any[] = [];

                if (creationMethod === 'auto') {
                    const start = tempPoints.find(p => p.type === 'start')!;
                    const end = tempPoints.find(p => p.type === 'end')!;
                    const intermediates = tempPoints.filter(p => p.type === 'stop');

                    routeOrderedPoints = [
                        { ...start, order: 0, name: 'Başlangıç' },
                        ...intermediates.map((p, i) => ({ ...p, order: i + 1, name: `${i + 1}. Durak` })),
                        { ...end, order: intermediates.length + 1, name: 'Varış' }
                    ];
                } else {
                    // Manual mode: all points in tempPoints are used in sequence
                    routeOrderedPoints = tempPoints.map((p, i) => ({
                        ...p,
                        order: i,
                        name: i === 0 ? 'Başlangıç' : i === tempPoints.length - 1 ? 'Varış' : `${i}. Nokta`
                    }));
                }

                const stopsToInsert = routeOrderedPoints.map(p => ({
                    company_id: profile?.company_id,
                    route_id: routeData.id,
                    order_index: p.order,
                    name: p.name,
                    longitude: p.pos[0],
                    latitude: p.pos[1]
                }));

                const { data: createdStops, error: stopsError } = await supabase.from('route_stops').insert(stopsToInsert).select();
                if (stopsError) throw stopsError;

                if (createdStops && creationMethod === 'auto') {
                    const assignments = [];
                    for (const stop of createdStops) {
                        const originalPoint = routeOrderedPoints.find(p => p.order === stop.order_index);
                        if (originalPoint && originalPoint.studentId) {
                            assignments.push({
                                company_id: profile?.company_id,
                                student_id: originalPoint.studentId,
                                route_id: routeData.id,
                                stop_id: stop.id,
                                type: 'pickup'
                            });
                        }
                    }

                    if (assignments.length > 0) {
                        const { error: assignError } = await supabase.from('student_route_assignments').insert(assignments);
                        if (assignError) console.error("Error auto-assigning students:", assignError);
                    }
                }
            }

            // 5. Refresh
            await fetchRoutes();
            setSelectedRouteId(routeData.id);
            setCreationStep('idle');
            setCreationMethod(null);
            setTempPoints([]);
            setIsOptimized(false);
            setNewRouteSchoolId('');
            setNewRouteTags([]);
            setNewRouteTime('08:00'); // Reset route time

        } catch (error) {
            console.error('Error creating route:', error);
            alert('Rota oluşturulurken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers: Management ---

    const handleVehicleAssign = async (vehicleId: string) => {
        if (!selectedRouteId) return;

        try {
            await supabase.from('routes').update({ vehicle_id: vehicleId || null }).eq('id', selectedRouteId);
            fetchRoutes();
        } catch (error) {
            console.error('Error assigning vehicle:', error);
        }
    };

    const openEditModal = (id: string) => {
        const route = routes.find(r => r.id === id);
        if (route) {
            setEditingRouteData({
                id: route.id,
                name: route.name,
                school_id: route.school_id || '',
                time: route.time || '08:00',
                tags: route.tags || [],
                price: route.price || 0
            });
        }
    };

    const saveRouteEdits = async () => {
        if (!editingRouteData) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('routes')
                .update({
                    name: editingRouteData.name,
                    school_id: editingRouteData.school_id || null,
                    time: editingRouteData.time,
                    tags: editingRouteData.tags,
                    price: editingRouteData.price
                })
                .eq('id', editingRouteData.id);

            if (error) throw error;
            await fetchRoutes();
            setEditingRouteData(null);
        } catch (error) {
            console.error('Error updating route:', error);
            alert('Rota güncellenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleStopStudentToggle = async (stopId: string, studentId: string) => {
        if (!selectedRouteId) return;

        try {
            const route = routes.find(r => r.id === selectedRouteId);
            if (!route) return;
            const stop = route.stops.find(s => s.id === stopId);
            if (!stop) return;

            const isAssigned = stop.assignedStudentIds.includes(studentId);

            if (isAssigned) {
                await supabase.from('student_route_assignments')
                    .delete()
                    .match({ student_id: studentId, stop_id: stopId });
            } else {
                await supabase.from('student_route_assignments')
                    .insert({
                        company_id: profile?.company_id,
                        student_id: studentId,
                        route_id: selectedRouteId,
                        stop_id: stopId,
                        type: 'pickup' // Varsayılan olarak biniş
                    });
            }
            // Refresh to update UI
            fetchRoutes();
        } catch (error) {
            console.error('Error toggling student:', error);
        }
    };

    // --- Handlers: Update & Delete ---

    const handleUpdateRoute = async (id: string, field: keyof RouteDef, value: any) => {
        // Optimistic Update
        setRoutes(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

        try {
            if (field === 'name') {
                await supabase.from('routes').update({ name: value }).eq('id', id);
            } else if (field === 'time') {
                await supabase.from('routes').update({ time: value }).eq('id', id);
            }
            // Add other fields as needed
        } catch (error) {
            console.error('Error updating route:', error);
            fetchRoutes(); // Revert on error
        }
    };

    const handleDeleteRoute = async (id: string) => {
        // Confirmation is handled in RouteList but redundancy is fine
        try {
            await supabase.from('routes').delete().eq('id', id);
            setRoutes(prev => prev.filter(r => r.id !== id));
            if (selectedRouteId === id) {
                setSelectedRouteId(null);
                setRouteGeoJson(null);
            }
        } catch (error) {
            console.error('Error deleting route:', error);
        }
    };

    // Fetch Route when selected route changes
    useEffect(() => {
        const getRoute = async () => {
            if (!selectedRoute) {
                setRouteGeoJson(null);
                return;
            }

            // If we already have coordinates from DB, use them directly
            if (selectedRoute.coordinates && selectedRoute.coordinates.length > 0) {
                const validCoords = selectedRoute.coordinates
                    .filter(c => Array.isArray(c) && c.length >= 2 && !isNaN(Number(c[0])) && !isNaN(Number(c[1])))
                    .map(c => [Number(c[0]), Number(c[1])]);
                
                if (validCoords.length > 0) {
                    setRouteGeoJson({
                        type: 'Feature',
                        geometry: { type: 'LineString', coordinates: validCoords },
                        properties: {}
                    });
                }
            }

            // Extract coordinates from stops
            const queryPoints = selectedRoute.stops
                .map(s => s.coordinates)
                .filter(c => c && c.length >= 2 && !isNaN(Number(c[0])) && !isNaN(Number(c[1])))
                .map(c => [Number(c[0]), Number(c[1])] as [number, number]);

            if (queryPoints.length < 2) return;

            // Optional: Only fetch if we don't have it or if stops changed (comparison needed)
            // For now, let's fetch if coordinates are missing to ensure we have data.
            if (selectedRoute.coordinates.length > 0) return;

            const result = await fetchRoute(queryPoints, routesLibrary);

            if (result) {
                setRouteGeoJson({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: result.coordinates },
                    properties: {}
                });

                // Update stats
                const distKm = parseFloat((result.distance / 1000).toFixed(1));
                const durMin = Math.round(result.duration / 60);

                // Optimistic UI Update
                setRoutes(prev => prev.map(r =>
                    r.id === selectedRouteId
                        ? {
                            ...r,
                            distance: `${distKm} km`,
                            duration: `${durMin} dk`,
                            coordinates: result.coordinates,
                            distance_km: distKm,
                            duration_min: durMin
                        }
                        : r
                ));

                // Save to DB
                try {
                    await supabase.from('routes').update({
                        distance_km: distKm,
                        duration_min: durMin,
                        geometry: { type: 'LineString', coordinates: result.coordinates }
                    }).eq('id', selectedRouteId);
                } catch (err) {
                    console.error("Error saving route stats:", err);
                }
            }
        };

        getRoute();
    }, [selectedRouteId, selectedRoute?.stops.length]);

    // Force Recalculate Route Geometry
    const forceRecalculateRoute = async () => {
        if (!selectedRouteId || !selectedRoute) return;
        setLoading(true);
        try {
            // Extract coordinates from stops
            const queryPoints = selectedRoute.stops
                .map(s => s.coordinates)
                .filter(c => c && c.length >= 2 && !isNaN(Number(c[0])) && !isNaN(Number(c[1])))
                .map(c => [Number(c[0]), Number(c[1])] as [number, number]);

            if (queryPoints.length < 2) {
                alert("Rota oluşturmak için en az 2 durak gerekli.");
                setLoading(false);
                return;
            }

            const result = await fetchRoute(queryPoints, routesLibrary);

            if (result) {
                // Update stats
                const distKm = parseFloat((result.distance / 1000).toFixed(1));
                const durMin = Math.round(result.duration / 60);

                // Save to DB
                const { error } = await supabase.from('routes').update({
                    distance_km: distKm,
                    duration_min: durMin,
                    geometry: { type: 'LineString', coordinates: result.coordinates }
                }).eq('id', selectedRouteId);

                if (error) {
                    console.error("DB Save Error:", error);
                    alert(`Hata: ${error.message}`);
                } else {
                    // Optimistic UI Update
                    setRouteGeoJson({
                        type: 'Feature',
                        geometry: { type: 'LineString', coordinates: result.coordinates },
                        properties: {}
                    });

                    setRoutes(prev => prev.map(r =>
                        r.id === selectedRouteId
                            ? {
                                ...r,
                                distance: `${distKm} km`,
                                duration: `${durMin} dk`,
                                coordinates: result.coordinates,
                                distance_km: distKm,
                                duration_min: durMin
                            }
                            : r
                    ));
                    alert("Rota başarıyla hesaplandı ve kaydedildi!");
                }
            } else {
                alert("Rota hesaplanamadı (OSRM Hatası).");
            }
        } catch (e: any) {
            console.error("Recalculate error:", e);
            alert("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    // --- Render ---

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">

            {/* --- UNIFIED FILTER BAR --- */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-3 gap-4 shrink-0 flex flex-col lg:flex-row lg:items-center justify-between z-20 relative">
                <div className="flex flex-wrap items-center gap-3 flex-1 w-full lg:w-auto">
                    {/* School Filter */}
                    <div className="flex items-center w-full sm:w-auto">
                        <select
                            className="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-700 font-bold appearance-none cursor-pointer"
                            value={activeSchoolFilter}
                            onChange={(e) => setActiveSchoolFilter(e.target.value)}
                        >
                            <option value="all">🏢 Tüm Okullar</option>
                            {schools.map(school => (
                                <option key={school.id} value={school.id}>{school.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                    {/* Tag Filter */}
                    {availableTags.length > 0 && (
                        <div className="relative w-full sm:w-auto">
                            <button
                                onClick={() => setShowTagFilterMenu(!showTagFilterMenu)}
                                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center justify-between sm:justify-start gap-2 ${showTagFilterMenu || activeTagFilter.length > 0
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <TagIcon size={16} className={activeTagFilter.length > 0 ? "text-blue-600" : "text-slate-400"} />
                                    <span>Etiketler</span>
                                </div>
                                {activeTagFilter.length > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{activeTagFilter.length}</span>}
                            </button>

                            {showTagFilterMenu && (
                                <div className="absolute top-[120%] left-0 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 w-72 z-[100] animate-in slide-in-from-top-2 origin-top">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Filtrelenecek Etiketler</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {availableTags.map(tag => (
                                            <button
                                                key={tag.id}
                                                onClick={() => {
                                                    if (activeTagFilter.includes(tag.name)) {
                                                        setActiveTagFilter(prev => prev.filter(t => t !== tag.name));
                                                    } else {
                                                        setActiveTagFilter(prev => [...prev, tag.name]);
                                                    }
                                                }}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeTagFilter.includes(tag.name)
                                                    ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {tag.name}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setActiveTagFilter([])}
                                        className="w-full mt-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        Temizle
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {availableTags.length > 0 && <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>}

                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Student Homes Toggle */}
                        <button
                            onClick={() => setShowStudentLocations(!showStudentLocations)}
                            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center justify-between sm:justify-start gap-2 ${showStudentLocations
                                ? 'bg-green-500 text-white border-green-600 shadow-md shadow-green-200/50'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            title="Öğrenci evlerini haritada göster/gizle"
                        >
                            <div className="flex items-center gap-2">
                                <Home size={16} />
                                <span>Öğrenci Evleri</span>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${showStudentLocations ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                                {getMarkers().filter(m => m.type === 'student_home').length} / {availableStudents.length}
                            </span>
                        </button>

                        {/* Neighborhood Filter (only visible when Student Homes is active) */}
                        {showStudentLocations && (
                            <div className="relative flex items-center animate-in fade-in zoom-in duration-200">
                                <MapPin size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
                                <select
                                    value={selectedNeighborhood}
                                    onChange={(e) => setSelectedNeighborhood(e.target.value)}
                                    className="pl-9 pr-8 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 appearance-none shadow-sm cursor-pointer transition-all"
                                >
                                    <option value="all">Tüm Mahalleler / Konumlar</option>
                                    {neighborhoods.map(nh => (
                                        <option key={nh} value={nh}>{nh}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                {/* Sidebar (Master / Detail) */}
                <div className="w-1/3 min-w-[400px] flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">

                    {!selectedRouteId || creationStep !== 'idle' ? (
                        <>
                            {creationStep !== 'idle' ? (
                                <div className="p-6 bg-blue-50 border-b border-blue-100 flex flex-col h-full overflow-y-auto">
                                    <h3 className="text-lg font-bold text-blue-900 mb-2">
                                        {creationMethod === 'manual' ? 'Manuel Rota Çiziliyor' : 'Yeni Rota Oluşturuluyor'}
                                    </h3>
                                    <p className="text-blue-700 text-sm mb-4">
                                        {creationMethod === 'manual'
                                            ? 'Haritaya tıklayarak yolu oluşturun. Bitince Kaydet butonuna basın.'
                                            : (creationStep === 'start' ? '1. Haritadan BAŞLANGIÇ noktasını seçin.' :
                                                creationStep === 'stops' ? '2. Aradaki DURAKLARI haritadan seçin.' :
                                                    creationStep === 'end' ? '3. Son olarak VARIŞ noktasını seçin.' : '')}
                                    </p>

                                    {/* Points List */}
                                    <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
                                        {tempPoints.map((p, i) => (
                                            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${p.type === 'start' ? 'bg-green-100 border-green-200' :
                                                p.type === 'end' ? 'bg-red-100 border-red-200' :
                                                    'bg-white border-slate-200'
                                                }`}>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${p.type === 'start' ? 'bg-green-500' :
                                                    p.type === 'end' ? 'bg-red-500' :
                                                        'bg-blue-500'
                                                    }`}>
                                                    {p.type === 'start' ? 'B' : p.type === 'end' ? 'V' : i}
                                                </div>
                                                <div className="flex-1 text-sm font-medium text-slate-700">
                                                    {p.type === 'start' ? 'Başlangıç' : p.type === 'end' ? 'Varış' : `${i}. Durak`}
                                                    {p.studentId && <span className="ml-1 text-xs text-blue-600">(Öğrenci)</span>}
                                                </div>
                                                <button
                                                    onClick={() => handleDeletePoint(i)}
                                                    className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {tempPoints.length === 0 && creationStep !== 'method_selection' && (
                                            <div className="text-center py-8 text-blue-300 italic">
                                                {creationMethod === 'manual' ? 'Haritaya tıklayarak çizmeye başlayın' : 'Henüz nokta eklenmedi'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Selection Controls */}
                                    {creationStep === 'method_selection' && (
                                        <div className="flex flex-col gap-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="text-center space-y-1">
                                                <h4 className="text-blue-900 font-bold text-lg">Rota Oluşturma Yöntemi</h4>
                                                <p className="text-blue-600/70 text-xs">Aşağıdaki seçeneklerden birini kullanarak rotanızı oluşturmaya başlayın</p>
                                            </div>

                                            <div className="bg-white p-4 rounded-2xl border border-blue-100/50 shadow-sm space-y-2">
                                                <label className="block text-sm font-bold text-blue-900">1. Okul Seçin</label>
                                                <select
                                                    required
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-700"
                                                    value={newRouteSchoolId}
                                                    onChange={(e) => setNewRouteSchoolId(e.target.value)}
                                                >
                                                    <option value="" disabled>Okul Seçiniz...</option>
                                                    {schools.map(school => (
                                                        <option key={school.id} value={school.id}>{school.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="bg-white p-4 rounded-2xl border border-blue-100/50 shadow-sm space-y-2">
                                                <label className="block text-sm font-bold text-blue-900">2. Rota Saati</label>
                                                <input
                                                    type="time"
                                                    value={newRouteTime}
                                                    onChange={(e) => setNewRouteTime(e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-sm font-bold text-blue-900 px-1">3. Yöntem Seçin</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Auto Selection Card */}
                                                    <button
                                                        onClick={() => {
                                                            setCreationMethod('auto');
                                                            setCreationStep('start');
                                                        }}
                                                        disabled={!newRouteSchoolId}
                                                        className="group relative flex flex-col items-center gap-3 p-5 bg-white border border-blue-100 rounded-3xl hover:border-secondary hover:shadow-2xl hover:shadow-blue-200/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed"
                                                    >
                                                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-6 -mt-6 group-hover:scale-110 transition-transform"></div>

                                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:rotate-6 transition-transform">
                                                            <Sparkles size={28} />
                                                        </div>

                                                        <div className="text-center">
                                                            <div className="font-bold text-slate-800 text-sm mb-1">Otomatik</div>
                                                            <div className="text-[10px] text-slate-400 leading-tight">Durak bazlı akıllı rota</div>
                                                        </div>
                                                    </button>

                                                    {/* Manual Selection Card */}
                                                    <button
                                                        onClick={() => {
                                                            setCreationMethod('manual');
                                                            setCreationStep('manual_draw');
                                                        }}
                                                        disabled={!newRouteSchoolId}
                                                        className="group relative flex flex-col items-center gap-3 p-5 bg-white border border-blue-100 rounded-3xl hover:border-purple-400 hover:shadow-2xl hover:shadow-purple-200/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed"
                                                    >
                                                        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-6 -mt-6 group-hover:scale-110 transition-transform"></div>

                                                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-200 group-hover:-rotate-6 transition-transform">
                                                            <Pencil size={28} />
                                                        </div>

                                                        <div className="text-center">
                                                            <div className="font-bold text-slate-800 text-sm mb-1">Manuel</div>
                                                            <div className="text-[10px] text-slate-400 leading-tight">Yolu kendiniz çizin</div>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50">
                                                <p className="text-[10px] text-blue-800/60 leading-relaxed text-center italic">
                                                    İpucu: Otomatik mod öğrenci evlerine göre durakları optimize eder, Manuel mod ise tamamen serbest çizim imkanı sunar.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step Controls */}
                                    {creationStep === 'stops' && (
                                        <button
                                            onClick={() => setCreationStep('end')}
                                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 mb-6"
                                        >
                                            <MapPin size={18} />
                                            Bitiş Noktasını Seçmeye Geç
                                        </button>
                                    )}

                                    {/* Optimize Button Placeholder (Handled in generic button logic) */}

                                    {(tempPoints.some(p => p.type === 'end') || (creationMethod === 'manual' && tempPoints.length >= 2)) && (
                                        <div className="space-y-2 mb-4">
                                            {creationMethod === 'auto' && (
                                                <button
                                                    onClick={handleOptimizeRoute}
                                                    className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isOptimized
                                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                                                        }`}
                                                    title="Durakları en kısa mesafe için sıralar (Başlangıç ve Bitiş sabit kalır)"
                                                >
                                                    {isOptimized ? <Check size={18} /> : <Navigation size={18} />}
                                                    {isOptimized ? 'Rota Optimize Edildi' : 'Rotayı Optimize Et (En Kısa Yol)'}
                                                </button>
                                            )}

                                            <button
                                                onClick={finishRouteCreation}
                                                disabled={creationMethod === 'auto' && !isOptimized}
                                                className={`w-full py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all ${creationMethod === 'auto' && !isOptimized
                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                                                    }`}
                                                title={creationMethod === 'auto' && !isOptimized ? 'Kaydetmeden önce rotayı optimize etmelisiniz' : ''}
                                            >
                                                <Check size={20} />
                                                Rotayı Kaydet
                                            </button>
                                        </div>
                                    )}


                                    <div className="mt-auto pt-4 border-t border-blue-100">
                                        <button
                                            onClick={() => { setCreationStep('idle'); setTempPoints([]); setRouteGeoJson(null); setCreationMethod(null); setIsOptimized(false); }}
                                            className="w-full py-2 text-slate-500 hover:text-red-600 text-sm font-medium"
                                        >
                                            İptal Et
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                    <button
                                        onClick={() => setCreationStep('method_selection')}
                                        className="w-full py-3 bg-secondary text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={20} />
                                        Yeni Rota Oluştur
                                    </button>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto flex flex-col">
                                <div className="flex-1 overflow-y-auto mt-2">
                                    <RouteList
                                        routes={routes
                                            .filter(r => activeSchoolFilter === 'all' || r.school_id === activeSchoolFilter)
                                            .map(r => ({ ...r, stops: r.stops.length }))} // Adapter for RouteList
                                        selectedRouteId={selectedRouteId}
                                        onSelect={(id) => {
                                            setSelectedRouteId(id);
                                            if (id) setFitBoundsTrigger(prev => prev + 1);
                                        }}
                                        onDelete={handleDeleteRoute}
                                        onEdit={openEditModal}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        // 2. DETAIL MODE
                        !selectedRoute ? (
                            <div className="flex flex-col items-center justify-center h-full bg-slate-50/30">
                                <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                                <p className="text-slate-500 font-medium tracking-wide">Rota verisi yükleniyor...</p>
                                <button onClick={() => setSelectedRouteId(null)} className="mt-4 text-blue-600 font-bold hover:underline">Listeye Dön</button>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full bg-slate-50/30">
                                {/* Header */}
                                <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 shadow-sm z-10">
                                    <button
                                        onClick={() => setSelectedRouteId(null)}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <input
                                                type="text"
                                                value={selectedRoute?.name}
                                                onChange={(e) => selectedRoute && handleUpdateRoute(selectedRoute.id, 'name', e.target.value)}
                                                className="font-bold text-slate-800 text-lg leading-tight bg-transparent border-b border-transparent hover:border-slate-300 focus:border-secondary outline-none transition-colors w-full"
                                            />
                                            {/* FORCE RECALCULATE BUTTON */}
                                            <button
                                                onClick={forceRecalculateRoute}
                                                className="p-1 hover:bg-blue-100 rounded text-blue-600"
                                                title="Rotayı Tekrar Hesapla ve Kaydet"
                                            >
                                                <Navigation size={16} />
                                            </button>

                                            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 border border-transparent hover:border-slate-300 transition-colors">
                                                <Clock size={16} className="text-secondary" />
                                                <input
                                                    type="time"
                                                    value={selectedRoute?.time || ''}
                                                    onChange={(e) => selectedRoute && handleUpdateRoute(selectedRoute.id, 'time', e.target.value)}
                                                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer w-24"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span className="flex items-center gap-1"><Navigation size={12} /> {selectedRoute?.distance}</span>
                                            <span className="flex items-center gap-1"><Clock size={12} /> {selectedRoute?.duration}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                                    {/* Vehicle Card */}
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-secondary/10 rounded-bl-full -mr-4 -mt-4"></div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Atanan Araç</h3>

                                        {selectedRoute?.vehicle_id ? (
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                    <Bus size={24} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-lg">{selectedRoute.vehicle.split(' - ')[0]}</div>
                                                    <div className="text-sm text-slate-500">{selectedRoute.vehicle.split(' - ')[1]}</div>
                                                    <button
                                                        className="text-xs text-secondary font-medium mt-2 hover:underline"
                                                        onClick={() => handleVehicleAssign('')} // Reset logic needed properly, currently just UI hook
                                                    >
                                                        Değiştir
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-sm text-slate-500 mb-3">Henüz bir araç atanmamış.</p>
                                                <select
                                                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-secondary"
                                                    onChange={(e) => handleVehicleAssign(e.target.value)}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Araç Seç...</option>
                                                    {availableVehicles.map(v => (
                                                        <option key={v.id} value={v.id}>{v.plate_number} - {v.driver_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stops Timeline */}
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Duraklar ve Öğrenciler</h3>
                                        <div className="relative pl-4 border-l-2 border-slate-200 ml-3 space-y-8 pb-4">
                                            {selectedRoute?.stops.map((stop) => (
                                                <div key={stop.id} className="relative pl-6">
                                                    {/* Stop Dot */}
                                                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${stop.type === 'start' ? 'bg-green-500' :
                                                        stop.type === 'end' ? 'bg-red-500' : 'bg-blue-500'
                                                        }`}></div>

                                                    {/* Stop Header */}
                                                    <div className="flex justify-between items-start mb-2 group">
                                                        <div>
                                                            <h4 className="font-bold text-slate-800 text-sm">{stop.name}</h4>
                                                            <div className="text-xs text-slate-400 font-mono mt-0.5">{stop.estimated_time || '--:--'}</div>
                                                        </div>
                                                        {stop.type !== 'end' && (
                                                            <div className="flex items-center gap-2">
                                                                {/* Count badge — display only */}
                                                                {stop.assignedStudentIds.length > 0 && (
                                                                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700">
                                                                        <Users size={13} />
                                                                        {stop.assignedStudentIds.length} Öğrenci
                                                                    </span>
                                                                )}
                                                                {/* Edit / add button */}
                                                                <button
                                                                    onClick={() => setAssigningStopId(stop.id === assigningStopId ? null : stop.id)}
                                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${assigningStopId === stop.id
                                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
                                                                        }`}
                                                                    title="Öğrenci ekle / düzenle"
                                                                >
                                                                    <UserPlus size={13} />
                                                                    {stop.assignedStudentIds.length > 0 ? 'Öğrenci Ekle' : 'Ekle'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Assigned Students List */}
                                                    <div className="space-y-2">
                                                        {stop.assignedStudentIds.map(studentId => {
                                                            const student = availableStudents.find(s => s.id === studentId);
                                                            if (!student) return null;
                                                            return (
                                                                <div key={student.id} className="flex items-center gap-2 bg-white border border-slate-100 p-2 rounded-lg shadow-sm">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                                        {student.full_name.charAt(0)}
                                                                    </div>
                                                                    <span className="text-sm text-slate-700">{student.full_name}</span>
                                                                </div>
                                                            );
                                                        })}
                                                        {stop.assignedStudentIds.length === 0 && (
                                                            <div className="text-xs text-slate-400 italic">Bu durakta binecek öğrenci yok.</div>
                                                        )}
                                                    </div>

                                                    {/* Student Selector Popover (Inline) */}
                                                    {assigningStopId === stop.id && (
                                                        <div className="mt-3 p-3 bg-white border border-secondary/30 rounded-xl shadow-lg animate-in slide-in-from-top-2 duration-200">
                                                            <div className="text-xs font-bold text-slate-500 mb-2 pb-2 border-b border-slate-100">
                                                                Bu duraktan binecekleri seçin:
                                                            </div>
                                                            {/* Search Input */}
                                                            <div className="relative mb-2">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Öğrenci ara..."
                                                                    value={studentSearchQuery}
                                                                    onChange={e => setStudentSearchQuery(e.target.value)}
                                                                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 placeholder:text-slate-300"
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <div className="max-h-48 overflow-y-auto space-y-1">
                                                                {availableStudents
                                                                    .filter(student => student.full_name.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                                                                    .map(student => {
                                                                        const isAssigned = stop.assignedStudentIds.includes(student.id);
                                                                        return (
                                                                            <button
                                                                                key={student.id}
                                                                                onClick={() => handleStopStudentToggle(stop.id, student.id)}
                                                                                className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${isAssigned
                                                                                    ? 'bg-blue-50 text-blue-700 font-semibold'
                                                                                    : 'hover:bg-slate-50 text-slate-600'
                                                                                    }`}
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isAssigned ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                                                                                        }`}>
                                                                                        {student.full_name.charAt(0)}
                                                                                    </div>
                                                                                    <span>{student.full_name}</span>
                                                                                </div>
                                                                                {isAssigned && <Check size={14} className="text-blue-600 shrink-0" />}
                                                                            </button>
                                                                        );
                                                                    })
                                                                }
                                                                {availableStudents.filter(s => s.full_name.toLowerCase().includes(studentSearchQuery.toLowerCase())).length === 0 && (
                                                                    <div className="text-xs text-slate-400 italic text-center py-2">Sonuç bulunamadı.</div>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => { setAssigningStopId(null); setStudentSearchQuery(''); }}
                                                                className="w-full mt-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200"
                                                            >
                                                                Tamamla
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>

                {/* Map Area */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
                    <MapScene
                        className="w-full h-full"
                        routeGeoJson={routeGeoJson}
                        routesGeoJson={(selectedRouteId || creationStep !== 'idle') ? null : multiRoutesGeoJson}
                        markers={getMarkers()}
                        onMapClick={handleMapClick}
                        onMarkerClick={handleMarkerClick}
                        onRouteHover={handleRouteHover}
                        onRouteClick={handleRouteClickFromMap}
                        autoCenter={creationStep === 'idle' && !!selectedRouteId} // Only auto-center when a specific route is selected for viewing
                        center={mapCenter}
                        zoom={mapZoom}
                        fitBoundsTrigger={fitBoundsTrigger}
                    />

                    {/* Route Hover Info Popup */}
                    {hoveredRouteId && hoverPosition && routes.find(r => r.id === hoveredRouteId) && (
                        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-blue-100 flex items-center gap-3 z-50 pointer-events-none animate-in fade-in zoom-in duration-200">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <MapIcon size={16} className="animate-pulse" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    {routes.find(r => r.id === hoveredRouteId)?.name}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium">Bu rotayı seçmek için tıklayın</p>
                            </div>
                        </div>
                    )}

                    {/* Map Search Bar Overlay */}
                    <div className="absolute top-6 left-6 right-6 z-50 flex flex-col items-start justify-center gap-3 pointer-events-none">
                        <form onSubmit={(e) => handleAddressSearch(e)} className="pointer-events-auto flex gap-2 max-w-md w-full bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/50 relative">
                            <div className="relative flex-1">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={mapSearchQuery}
                                    onChange={handleSearchQueryChange}
                                    placeholder="Adres veya yer ara... (örn: Kaşıkçıbağları)"
                                    className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                                />
                                {searchResultPin && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMapSearchQuery('');
                                            setSearchResultPin(null);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors p-1"
                                        title="Aramayı Temizle"
                                    >
                                        <X size={16} />
                                    </button>
                                )}

                                {/* Autocomplete Predictions Dropdown */}
                                {placePredictions.length > 0 && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                                        {placePredictions.map(prediction => (
                                            <button
                                                key={prediction.place_id}
                                                type="button"
                                                onClick={() => handleAddressSearch(undefined, prediction.description)}
                                                className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition-colors focus:bg-blue-50 outline-none flex items-center gap-3"
                                            >
                                                <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                                                <span className="truncate font-medium text-slate-700">{prediction.description}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={isSearching}
                                className="px-5 py-2 bg-secondary text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-md active:scale-95 disabled:opacity-50 whitespace-nowrap"
                            >
                                {isSearching ? '...' : 'Haritada Bul'}
                            </button>
                        </form>
                    </div>

                    {/* Student Detail Popup / Card */}
                    {selectedStudent && (
                        <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-72 bg-white rounded-xl shadow-2xl border border-slate-100 p-3 animate-in slide-in-from-bottom-5 duration-200 z-50 flex flex-col max-h-[60vh]">
                            <div className="flex justify-between items-start mb-2 shrink-0">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{selectedStudent.full_name}</h3>
                                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{selectedStudent.school_name || selectedStudent.schools?.name || 'Okul Yok'}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedStudent(null)}
                                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1 text-xs">
                                {/* Bilgiler (Kompakt) */}
                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center"><span className="text-slate-500">Sınıf:</span><span className="font-bold text-slate-700">{selectedStudent.grade || '-'}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-slate-500">Kan:</span><span className="font-bold text-red-600">{selectedStudent.blood_group || '-'}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-slate-500">Alerji:</span><span className="font-bold text-amber-600">{selectedStudent.allergies || 'Yok'}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-slate-500">Veli:</span><span className="font-bold text-slate-700">{selectedStudent.parent_name || '-'}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-slate-500">Tel:</span><a href={`tel:${selectedStudent.parent_phone}`} className="font-bold text-blue-600 hover:underline">{selectedStudent.parent_phone || '-'}</a></div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <div className="flex items-start gap-1.5 mb-1.5">
                                        <MapPin size={12} className="shrink-0 text-red-500 mt-0.5" />
                                        <span className="text-[10px] leading-tight text-slate-600 italic">
                                            {selectedStudent.address || `Konum: ${selectedStudent.home_latitude?.toFixed(4)}, ${selectedStudent.home_longitude?.toFixed(4)}`}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-1.5">
                                        {selectedStudent.tags && selectedStudent.tags.length > 0 ? selectedStudent.tags.map((tag: string, idx: number) => (
                                            <span key={idx} className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                                                {tag}
                                            </span>
                                        )) : <span className="text-[9px] text-slate-400 italic">Etiket Yok</span>}
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5 mt-1.5">
                                        <span className="text-slate-500 text-[10px]">Araç:</span>
                                        <span className="font-bold text-blue-700 text-xs">{selectedStudent.vehicles?.plate_number || 'Atanmadı'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Route Edit Modal */}
                {editingRouteData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-5">
                            <div className="flex justify-between items-center p-5 border-b border-slate-100/60 bg-slate-50/50">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings text-slate-500"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                                        Rotayı Düzenle
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Rota temel bilgilerini ve etiketlerini güncelleyin.</p>
                                </div>
                                <button
                                    onClick={() => setEditingRouteData(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Rota Adı</label>
                                    <input
                                        type="text"
                                        value={editingRouteData.name}
                                        onChange={(e) => setEditingRouteData({ ...editingRouteData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Atanan Okul</label>
                                    <select
                                        value={editingRouteData.school_id}
                                        onChange={(e) => setEditingRouteData({ ...editingRouteData, school_id: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 appearance-none"
                                    >
                                        <option value="">Okul Seçin</option>
                                        {schools.map(school => (
                                            <option key={school.id} value={school.id}>{school.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Rota Saati</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Clock size={16} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="time"
                                            value={editingRouteData.time}
                                            onChange={(e) => setEditingRouteData({ ...editingRouteData, time: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Birim Fiyat (₺)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <TagIcon size={16} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={editingRouteData.price}
                                            onChange={(e) => setEditingRouteData({ ...editingRouteData, price: parseFloat(e.target.value) || 0 })}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-700"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 px-1">Sefer başına hakediş ücreti (Puantaj hesabında kullanılır)</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Etiketler (İsteğe Bağlı)</label>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        {availableTags.length === 0 ? (
                                            <p className="text-sm text-slate-500 italic">Sistemde kayıtlı etiket bulunmuyor. Önce Ayarlar/Öğrenciler sayfasından etiket oluşturun.</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {availableTags.map(tag => {
                                                    const isSelected = editingRouteData.tags.includes(tag.name);
                                                    return (
                                                        <button
                                                            key={tag.id}
                                                            onClick={() => {
                                                                const newTags = isSelected
                                                                    ? editingRouteData.tags.filter(t => t !== tag.name)
                                                                    : [...editingRouteData.tags, tag.name];
                                                                setEditingRouteData({ ...editingRouteData, tags: newTags });
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected
                                                                ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                                                                }`}
                                                        >
                                                            {tag.name}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 px-1">Bu rotanın sadece belirli özelliklere (örn: bir site ismi) hizmet ettiğini belirtmek için etiket ekleyebilirsiniz. Harita aramalarında yardımcı olur.</p>
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-100/60 bg-slate-50/50 flex justify-end gap-3">
                                <button
                                    onClick={() => setEditingRouteData(null)}
                                    className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200/50 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={saveRouteEdits}
                                    disabled={!editingRouteData.name || !editingRouteData.school_id}
                                    className="px-6 py-2.5 rounded-xl font-bold bg-secondary text-white hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex flex-center gap-2"
                                >
                                    <Check size={18} />
                                    Değişiklikleri Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoutesPage;
