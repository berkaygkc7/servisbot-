import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import RouteList from '../components/dashboard/RouteList';
import MapScene from '../components/map/MapScene';
import { fetchRoute, optimizeRoute } from '../services/routingService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext'; // Added this import
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
    ArrowLeft, Users, UserPlus, Plus, Bus, Navigation, Clock, Check, Loader2, Trash2, MapPin, Tag as TagIcon, Sparkles, Pencil, Home, X, Search, Map as MapIcon, Share2, Maximize, Minimize
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
    vehicles?: { plate_number: string; driver_name: string; driver_phone: string; color?: string };
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
    color?: string;
}

interface Student {
    id: string;
    full_name: string;
    home_latitude: number;
    home_longitude: number;
    address?: string;
    neighborhood?: string;
    parent_name?: string;
    parent_phone?: string;
    tags?: string[];
    school_id?: string;
    schools?: { name: string };
    vehicle_id?: string;
    vehicles?: { plate_number: string };
    shift?: string;
}

const RoutesPage: React.FC = () => {
    const { profile } = useAuth(); // Extracted profile
    const location = useLocation();
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
    const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | undefined>(undefined);
    const [multiRoutesGeoJson, setMultiRoutesGeoJson] = useState<any>(null);
    const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
    const [liveVehicles, setLiveVehicles] = useState<{ id: string; position: [number, number]; title: string }[]>([]);
    const [showStudentLocations, setShowStudentLocations] = useState(false); // New Toggle
    const [hideOtherRoutes, setHideOtherRoutes] = useState(false); // New Toggle for hiding other routes
    const [hiddenVehicleIds, setHiddenVehicleIds] = useState<string[]>([]); // Araç gizle filtresi
    const [isMapFullscreen, setIsMapFullscreen] = useState(false); // Harita tam ekran
    const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
    const [showNeighborhoodDropdown, setShowNeighborhoodDropdown] = useState(false);
    
    // Sadece 'neighborhood' alanına girilmiş mahalleler (adres ayrıştırması yok)
    const neighborhoods = useMemo(() => {
        const mh = new Set<string>();
        availableStudents.forEach(s => {
            if (s.neighborhood && s.neighborhood.trim()) {
                mh.add(s.neighborhood.trim());
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
    const [activeShiftFilter, setActiveShiftFilter] = useState<'all' | 'Sabahçı' | 'Öğlenci'>('all');
    const [newRouteSchoolId, setNewRouteSchoolId] = useState<string>('');
    const [newRouteTags, setNewRouteTags] = useState<string[]>([]);

    // Creation Flow
    const [creationStep, setCreationStep] = useState<'idle' | 'method_selection' | 'start' | 'end' | 'stops' | 'manual_draw' | 'interactive_draw'>('idle');
    const [creationMethod, setCreationMethod] = useState<'auto' | 'manual' | 'interactive' | null>(null);
    const [tempPoints, setTempPoints] = useState<{ type: 'start' | 'end' | 'stop', pos: [number, number], studentId?: string }[]>([]);
    const tempPointsRef = useRef(tempPoints);
    tempPointsRef.current = tempPoints;
    const [assigningStopId, setAssigningStopId] = useState<string | null>(null);
    const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
    const [isOptimized, setIsOptimized] = useState(false);

    // Map Search State
    const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
    const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);
    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResultPin, setSearchResultPin] = useState<{coords: [number, number], name?: string} | null>(null);

    // Route Editing State
    const [editingRouteData, setEditingRouteData] = useState<{ id: string, name: string, school_id: string, time: string, tags: string[], price: number } | null>(null);
    const [editingGeometryRouteId, setEditingGeometryRouteId] = useState<string | null>(null);
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
                setSearchResultPin({ coords, name: query });
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

    // Tam ekran değişince haritayı yeniden boyutlandır (Google Maps beyaz ekran fix)
    useEffect(() => {
        const t1 = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        const t2 = setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
        const t3 = setTimeout(() => window.dispatchEvent(new Event('resize')), 600);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [isMapFullscreen]);

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

    // Mahalle dropdown dışarıya tıklanınca kapansın
    useEffect(() => {
        if (!showNeighborhoodDropdown) return;
        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-neighborhood-dropdown]')) {
                setShowNeighborhoodDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [showNeighborhoodDropdown]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Vehicles
            const { data: vehiclesData } = await supabase.from('vehicles').select('id, plate_number, driver_name, color');
            if (vehiclesData) setAvailableVehicles(vehiclesData);

            // 2. Fetch Students
            const { data: studentsData } = await supabase.from('students').select('id, full_name, home_latitude, home_longitude, address, neighborhood, tags, parent_name, parent_phone, grade, blood_group, allergies, registration_date, school_id, vehicle_id, schools(name), vehicles(plate_number), shift').neq('status', 'pending');
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
                vehicles (plate_number, driver_name, driver_phone, color),
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
            setFitBoundsTrigger(prev => prev + 1);
        }
    }, [routes]);



    // Derived State
    const selectedRoute = routes.find(r => r.id === selectedRouteId);

    // Derived Route GeoJSON for Tag Highlighting (Multiple Routes)
    useEffect(() => {
        if (routes.length === 0 || hideOtherRoutes) {
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

            // Apply School filter
            if (activeSchoolFilter !== 'all' && route.school_id !== activeSchoolFilter) {
                matchesFilters = false;
            }

            if (activeTagFilter.length > 0 && matchesFilters) {
                const allAssignedIds = route.stops?.flatMap(s => s.assignedStudentIds || []) || [];
                let tagMatch = availableStudents.some(s =>
                    allAssignedIds.includes(s.id) &&
                    s.tags &&
                    activeTagFilter.some(tag => s.tags?.includes(tag))
                );

                // ALSO check route's own tags!
                if (!tagMatch && route.tags) {
                    tagMatch = activeTagFilter.some(tag => route.tags?.includes(tag));
                }

                if (!tagMatch) matchesFilters = false;
            }

            if (!matchesFilters) return [];

            const color = route.vehicles?.color || ROUTE_COLORS[index % ROUTE_COLORS.length];

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
    }, [routes, availableStudents, activeTagFilter, selectedRouteId, activeSchoolFilter, hideOtherRoutes]);

    // Focus on searched student from Global Search
    useEffect(() => {
        if (location.state?.searchStudentId && availableStudents.length > 0) {
            const student = availableStudents.find(s => s.id === location.state.searchStudentId);
            if (student && student.home_longitude && student.home_latitude) {
                const coords: [number, number] = [student.home_longitude, student.home_latitude];
                setMapCenter(coords);
                setMapZoom(18);
                setSearchResultPin({ coords, name: student.full_name });
                
                // We should also turn ON showStudentLocations so the student marker renders
                setShowStudentLocations(true);
                
                // Clear state so it doesn't re-trigger
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, availableStudents]);

    // --- Helpers ---

    const mapMarkers = useMemo(() => {
        const markers: any[] = [];

        // 1. Creation Mode Markers
        if (creationStep !== 'idle') {
            const skipTempMarkers = creationMethod === 'interactive' && tempPoints.length >= 2;
            if (!skipTempMarkers) {
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

        // 3. Student Locations (if toggled or neighborhoods selected)
        if (showStudentLocations || selectedNeighborhoods.length > 0) {
            availableStudents.forEach(s => {
                // Apply Tag Filter
                const matchesTags = activeTagFilter.length === 0 ||
                    (s.tags && activeTagFilter.every(tag => s.tags?.includes(tag)));

                // Apply Neighborhood Filter (multi-select)
                let matchesNeighborhood = true;
                if (selectedNeighborhoods.length > 0) {
                    matchesNeighborhood = selectedNeighborhoods.some(nh => {
                        if (s.neighborhood) {
                            return s.neighborhood.toLowerCase().includes(nh.toLowerCase());
                        } else if (s.address) {
                            return s.address.toLowerCase().includes(nh.toLowerCase());
                        }
                        return false;
                    });
                }

                // Apply Main School Filter
                let matchesMainSchool = true;
                if (creationStep !== 'idle') {
                    if (newRouteSchoolId) {
                        const targetSchoolName = schools.find(sch => sch.id === newRouteSchoolId)?.name;
                        matchesMainSchool = !!(s.schools && s.schools.name === targetSchoolName);
                    }
                } else {
                    const activeSchoolName = activeSchoolFilter !== 'all' ? schools.find(sch => sch.id === activeSchoolFilter)?.name : null;
                    matchesMainSchool = activeSchoolFilter === 'all' || !!(s.schools && s.schools.name === activeSchoolName);
                }

                // Apply Shift Filter
                const matchesShift = activeShiftFilter === 'all' || s.shift === activeShiftFilter;

                // Apply Hidden Vehicle Filter
                const vehicleId = (s as any).vehicle_id;
                const isHiddenByVehicle = hiddenVehicleIds.length > 0 && vehicleId && hiddenVehicleIds.includes(vehicleId);

                if (matchesTags && matchesNeighborhood && matchesMainSchool && matchesShift && !isHiddenByVehicle && s.home_latitude && s.home_longitude) {
                    const lng = Number(s.home_longitude);
                    const lat = Number(s.home_latitude);
                    
                    if (isNaN(lng) || isNaN(lat)) return;
                    if (lng === 0 && lat === 0) return;

                    const vehicleColor = (s as any).vehicle_id
                        ? availableVehicles.find(v => v.id === (s as any).vehicle_id)?.color
                        : undefined;

                    markers.push({
                        id: s.id, // Removed student- prefix for consistency and reliable matching
                        position: [lng, lat],
                        title: s.full_name,
                        type: 'student_home',
                        hasVehicle: !!(s as any).vehicle_id || !!(s as any).vehicles?.plate_number,
                        vehicleColor: vehicleColor || undefined
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
        if (searchResultPin && searchResultPin.coords && searchResultPin.coords.length >= 2) {
            const lng = Number(searchResultPin.coords[0]);
            const lat = Number(searchResultPin.coords[1]);

            if (!isNaN(lng) && !isNaN(lat) && (lng !== 0 || lat !== 0)) {
                markers.push({
                    id: 'search-result',
                    position: [lng, lat],
                    title: searchResultPin.name || 'Arama Sonucu',
                    type: 'search_result'
                });
            }
        }

        return markers;
    }, [
        creationStep,
        creationMethod,
        tempPoints,
        selectedRoute,
        showStudentLocations,
        availableStudents,
        activeTagFilter,
        selectedNeighborhoods,
        newRouteSchoolId,
        schools,
        activeSchoolFilter,
        activeShiftFilter,
        liveVehicles,
        searchResultPin,
        hiddenVehicleIds
    ]);

    // --- Handlers: Route Creation ---

    const handleMapClick = useCallback(async (lng: number, lat: number) => {
        if (creationStep === 'idle' || creationStep === 'method_selection') return;

        if (creationMethod === 'manual') {
            // In manual mode, every click is a coordinate in the LineString
            addManualPoint(lng, lat);
        } else if (creationMethod === 'interactive') {
            addInteractivePoint(lng, lat);
        } else {
            addRoutePoint(lng, lat);
        }
    }, [creationStep, creationMethod, tempPoints.length]); // Dependencies for route updates


    const handleMarkerClick = useCallback((id: string | number, type?: string) => {
        if (type === 'search_result') {
            setSearchResultPin(null);
            return;
        }

        if (type === 'student_home') {
            const student = availableStudents.find(s => s.id === id);

            if (student) {
                if (creationStep === 'idle') {
                    setSelectedStudent(student);
                    return;
                }

                // If in creation mode, add to route
                if (student.home_latitude && student.home_longitude) {
                    if (creationMethod === 'interactive') {
                        addInteractivePoint(student.home_longitude, student.home_latitude, student.id);
                    } else {
                        addRoutePoint(student.home_longitude, student.home_latitude, student.id);
                    }
                }
            }
        } else if (creationStep === 'idle') {
            console.log("Marker clicked in idle mode:", id, type);
        }
    }, [creationStep, availableStudents]);

    const addRoutePoint = (lng: number, lat: number, studentId?: string) => {
        setIsOptimized(false); // Reset optimization on any change
        
        // Toggle (remove) logic: if point already exists
        if (studentId) {
            const existingIndex = tempPointsRef.current.findIndex(p => p.studentId === studentId);
            if (existingIndex !== -1) {
                handleDeletePoint(existingIndex);
                return;
            }
        }

        if (creationStep === 'start') {
            setTempPoints([{ type: 'start', pos: [lng, lat], studentId }]);
            setCreationStep('stops'); // Switch to stops immediately
        } else if (creationStep === 'stops') {
            setTempPoints(prev => [...prev, { type: 'stop', pos: [lng, lat], studentId }]);
        } else if (creationStep === 'end') {
            // Only allow one end point
            const hasEnd = tempPoints.some(p => p.type === 'end');
            if (!hasEnd) {
                const newPoints = [...tempPoints, { type: 'end' as const, pos: [lng, lat] as [number, number], studentId }];
                setTempPoints(newPoints);
                // Bitiş noktası eklendi → otomatik olarak en kısa yolu çiz
                autoDrawRoute(newPoints);
            }
        }
    };

    const addInteractivePoint = (lng: number, lat: number, studentId?: string) => {
        setIsOptimized(false);
        // Use ref to always get the LATEST tempPoints (avoids stale closure from useCallback)
        const newPoints = [...tempPointsRef.current];
        
        // Toggle (remove) logic: if point already exists
        if (studentId) {
            const existingIndex = newPoints.findIndex(p => p.studentId === studentId);
            if (existingIndex !== -1) {
                handleDeletePoint(existingIndex);
                return;
            }
        }
        
        if (newPoints.length === 0) {
            setTempPoints([{ type: 'start', pos: [lng, lat], studentId }]);
        } else if (newPoints.length === 1) {
            const pts = [...newPoints, { type: 'end' as const, pos: [lng, lat] as [number, number], studentId }];
            setTempPoints(pts);
            autoDrawRoute(pts);
        } else {
            const endIdx = newPoints.findIndex(p => p.type === 'end');
            if (endIdx !== -1) {
                newPoints[endIdx] = { ...newPoints[endIdx], type: 'stop' };
            }
            newPoints.push({ type: 'end', pos: [lng, lat], studentId });
            setTempPoints(newPoints);
            autoDrawRoute(newPoints);
        }
    };

    // Başlangıç + Bitiş (+ opsiyonel duraklar) seçildiğinde otomatik rota çiz
    const autoDrawRoute = async (points: { type: string, pos: [number, number], studentId?: string }[]) => {
        if (!routesLibrary) return;
        const coords = points.map(p => p.pos);
        if (coords.length < 2) return;

        // Don't show full-page spinner in interactive mode - map must stay visible!
        const showSpinner = creationMethod !== 'interactive';
        if (showSpinner) setLoading(true);
        try {
            if (coords.length === 2 || creationMethod === 'interactive') {
                // Interactive: always use fetchRoute to preserve user's click order
                // Auto with 2 points: simple A→B route
                const result = await fetchRoute(coords, routesLibrary);
                if (result) {
                    setRouteGeoJson({
                        type: 'Feature',
                        geometry: { type: 'LineString', coordinates: result.coordinates },
                        properties: {}
                    });
                    if (result.directionsResponse) {
                        setDirectionsResponse(result.directionsResponse);
                    }
                    setIsOptimized(true);
                }
            } else {
                // Başlangıç + duraklar + bitiş → optimize et
                const result = await optimizeRoute(coords, routesLibrary);
                if (result && result.waypoint_order) {
                    const snappedPoints = result.snapped_waypoints;
                    const orderedPoints = result.waypoint_order.map((index, i) => {
                        const pt = points[index];
                        if (snappedPoints && snappedPoints[i]) {
                            return { ...pt, pos: snappedPoints[i] };
                        }
                        return pt;
                    });
                    setTempPoints(orderedPoints as any);
                    setRouteGeoJson({
                        type: 'Feature',
                        geometry: { type: 'LineString', coordinates: result.coordinates },
                        properties: {}
                    });
                    if (result.directionsResponse) {
                        setDirectionsResponse(result.directionsResponse);
                    }
                    setIsOptimized(true);
                }
            }
        } catch (error) {
            console.error("Auto route draw error:", error);
        } finally {
            if (showSpinner) setLoading(false);
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
                
                if (creationMethod === 'interactive' && result.directionsResponse) {
                    setDirectionsResponse(result.directionsResponse);
                }

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
        // Doğrudan ref üzerinden güncel state'i alıyoruz (asenkron batching sorunlarını önler)
        const newPoints = [...tempPointsRef.current];
        if (_index < 0 || _index >= newPoints.length) return;
        
        const deleted = newPoints[_index];
        newPoints.splice(_index, 1);
        
        

        // Kalan noktalar varsa type'ları düzelt (ilk nokta her zaman 'start', son nokta her zaman 'end')
        if (newPoints.length > 0) {
            newPoints[0].type = 'start';
            if (newPoints.length > 1) {
                newPoints[newPoints.length - 1].type = 'end';
            }
            for (let i = 1; i < newPoints.length - 1; i++) {
                newPoints[i].type = 'stop';
            }
        }
        
        // Optimize status sıfırla (durak silinirse)
        if (deleted?.type !== 'end' && deleted?.type !== 'start') {
            setIsOptimized(false);
        }

        // State'leri güncelle
        setTempPoints(newPoints);
        
        // Hemen çizimi güncelle
        if (creationMethod === 'manual') {
            if (newPoints.length < 2) {
                setRouteGeoJson(null);
            } else {
                setRouteGeoJson({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: newPoints.map(p => p.pos) },
                    properties: {}
                });
            }
        } else if (creationMethod === 'interactive' || creationMethod === 'auto') {
            if (newPoints.length < 2) {
                setDirectionsResponse(undefined);
                setRouteGeoJson(null);
            } else {
                // Route çiz, start ve end'i garanti altına aldık
                autoDrawRoute(newPoints);
            }
        }
        
        // Creation step ayarlamaları (kaldığı yeri düzelt)
        if (newPoints.length === 1 && creationStep !== 'idle') {
            setCreationStep('end');
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
                    // Save geometry for manual and interactive modes immediately
                    geometry: (creationMethod === 'manual' || creationMethod === 'interactive') && routeGeoJson ? routeGeoJson.geometry : null,
                    distance_km: (creationMethod === 'manual' || creationMethod === 'interactive') && routeGeoJson ? 0 : null, // Could calculate properly later
                    duration_min: (creationMethod === 'manual' || creationMethod === 'interactive') && routeGeoJson ? 0 : null
                })
                .select()
                .single();

            if (routeError) throw routeError;

            // 2. Prepare Stops (Auto, Interactive or Manual)
            if (creationMethod === 'auto' || creationMethod === 'interactive' || creationMethod === 'manual') {
                let routeOrderedPoints: any[] = [];

                if (creationMethod === 'auto' || creationMethod === 'interactive') {
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

                if (createdStops && (creationMethod === 'auto' || creationMethod === 'interactive')) {
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
            setRouteGeoJson(null);
            setDirectionsResponse(undefined);
            setIsOptimized(false);
            setNewRouteSchoolId('');
            setNewRouteTags([]);
            setNewRouteTime('08:00'); // Reset route time
            setHiddenVehicleIds([]); // Reset vehicle hide on route save

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

    // Assign vehicle to a student directly from the map popup card
    const handleStudentVehicleAssign = async (studentId: string, vehicleId: string) => {
        try {
            await supabase.from('students').update({ vehicle_id: vehicleId || null }).eq('id', studentId);
            // Refresh students data
            const { data: studentsData } = await supabase.from('students').select('id, full_name, home_latitude, home_longitude, address, neighborhood, tags, parent_name, parent_phone, grade, blood_group, allergies, registration_date, school_id, vehicle_id, schools(name), vehicles(plate_number), shift').neq('status', 'pending');
            if (studentsData) {
                setAvailableStudents(studentsData as any);
                // Update selectedStudent with fresh data
                const updatedStudent = studentsData.find((s: any) => s.id === studentId);
                if (updatedStudent) setSelectedStudent(updatedStudent);
            }
        } catch (error) {
            console.error('Error assigning vehicle to student:', error);
        }
    };

    // Assign/remove student to/from a route stop from the map popup card
    const handlePopupStopStudentToggle = async (stopId: string, studentId: string) => {
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
                        type: 'pickup'
                    });
            }
            fetchRoutes();
        } catch (error) {
            console.error('Error toggling student stop from popup:', error);
        }
    };

    // Bulk assign vehicle to all students on the selected route
    const handleBulkVehicleAssignToStudents = async () => {
        if (!selectedRoute || !selectedRoute.vehicle_id) return;

        const allStudentIds = selectedRoute.stops.flatMap(s => s.assignedStudentIds || []);
        const uniqueStudentIds = [...new Set(allStudentIds)];

        if (uniqueStudentIds.length === 0) {
            alert('Bu güzergahta henüz öğrenci atanmamış.');
            return;
        }

        const unassignedStudentIds = uniqueStudentIds.filter(sid => {
            const student = availableStudents.find(s => s.id === sid);
            return !student?.vehicle_id;
        });

        if (unassignedStudentIds.length === 0) {
            alert('Tüm öğrencilere zaten araç atanmış!');
            return;
        }

        if (!confirm(`${unassignedStudentIds.length} öğrenciye bu aracı atamak istediğinize emin misiniz?`)) return;

        try {
            setLoading(true);
            for (const studentId of unassignedStudentIds) {
                await supabase.from('students').update({ vehicle_id: selectedRoute.vehicle_id }).eq('id', studentId);
            }
            // Refresh students data
            const { data: studentsData } = await supabase.from('students').select('id, full_name, home_latitude, home_longitude, address, neighborhood, tags, parent_name, parent_phone, grade, blood_group, allergies, registration_date, school_id, vehicle_id, schools(name), vehicles(plate_number), shift').neq('status', 'pending');
            if (studentsData) setAvailableStudents(studentsData as any);
            await fetchRoutes();
        } catch (error) {
            console.error('Error bulk assigning vehicle:', error);
            alert('Araç atama sırasında hata oluştu.');
        } finally {
            setLoading(false);
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

    // --- Handlers: Geometry Edit ---

    const startGeometryEdit = async (routeId: string) => {
        const route = routes.find(r => r.id === routeId);
        if (!route || route.stops.length < 2) {
            alert('Düzenlemek için rotanın en az 2 durağı olmalıdır.');
            return;
        }

        // Mevcut durakları tempPoints formatına çevir (sıralı)
        const sortedStops = [...route.stops].sort((a, b) => a.order_index - b.order_index);
        const newTempPoints = sortedStops.map((stop, index, arr) => ({
            type: index === 0 ? 'start' as const : index === arr.length - 1 ? 'end' as const : 'stop' as const,
            pos: stop.coordinates as [number, number], // [lng, lat]
            studentId: stop.assignedStudentIds[0] || undefined
        }));

        setTempPoints(newTempPoints);
        setCreationMethod('interactive');
        setCreationStep('interactive_draw');
        setEditingGeometryRouteId(routeId);
        setSelectedRouteId(null); // Detay panelini kapat, oluşturma panelini aç
        setIsOptimized(true);
        setNewRouteSchoolId(route.school_id || '');

        // Mevcut koordinatlar varsa haritada göster
        if (route.coordinates && route.coordinates.length > 0) {
            const validCoords = route.coordinates
                .filter((c: any) => Array.isArray(c) && c.length >= 2 && !isNaN(Number(c[0])) && !isNaN(Number(c[1])))
                .map((c: any) => [Number(c[0]), Number(c[1])]);
            if (validCoords.length > 0) {
                setRouteGeoJson({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: validCoords },
                    properties: {}
                });
            }
        }

        // Interactive mod için DirectionsRenderer'ı başlat
        if (newTempPoints.length >= 2) {
            await autoDrawRoute(newTempPoints);
        }

        setFitBoundsTrigger(prev => prev + 1);
    };

    const saveGeometryEdit = async () => {
        if (!editingGeometryRouteId || tempPoints.length < 2) return;
        setLoading(true);
        try {
            // 1. Mevcut route_stops'ları sil
            const { error: deleteError } = await supabase
                .from('route_stops')
                .delete()
                .eq('route_id', editingGeometryRouteId);
            if (deleteError) throw deleteError;

            // 2. Yeni durakları oluştur (start, stops..., end sıralaması)
            const start = tempPoints.find(p => p.type === 'start');
            const end = tempPoints.find(p => p.type === 'end');
            const intermediates = tempPoints.filter(p => p.type === 'stop');

            if (!start || !end) {
                alert('Başlangıç ve bitiş noktaları gereklidir.');
                setLoading(false);
                return;
            }

            const orderedPoints = [
                { ...start, order: 0, name: 'Başlangıç' },
                ...intermediates.map((p, i) => ({ ...p, order: i + 1, name: `${i + 1}. Durak` })),
                { ...end, order: intermediates.length + 1, name: 'Varış' }
            ];

            const stopsToInsert = orderedPoints.map(p => ({
                company_id: profile?.company_id,
                route_id: editingGeometryRouteId,
                order_index: p.order,
                name: p.name,
                longitude: p.pos[0],
                latitude: p.pos[1]
            }));

            const { error: insertError } = await supabase.from('route_stops').insert(stopsToInsert);
            if (insertError) throw insertError;

            // 3. Rota geometrisini güncelle
            if (routeGeoJson) {
                await supabase.from('routes').update({
                    geometry: routeGeoJson.geometry
                }).eq('id', editingGeometryRouteId);
            }

            // 4. State'i sıfırla ve rotayı yeniden aç
            const savedRouteId = editingGeometryRouteId;
            setEditingGeometryRouteId(null);
            setCreationStep('idle');
            setCreationMethod(null);
            setTempPoints([]);
            setRouteGeoJson(null);
            setDirectionsResponse(undefined);
            setIsOptimized(false);
            setNewRouteSchoolId('');

            await fetchRoutes();
            setSelectedRouteId(savedRouteId);
            setFitBoundsTrigger(prev => prev + 1);

        } catch (error) {
            console.error('Error saving geometry edit:', error);
            alert('Güzergah güncellenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleShareRoute = (routeId: string) => {
        const route = routes.find(r => r.id === routeId);
        if (!route) return;

        const routeName = route.name;
        const vehicleInfo = route.vehicle ? ` (${route.vehicle})` : '';
        const timeInfo = route.time ? ` - ⏰ ${route.time}` : '';

        // Build Google Maps Navigation URL (Chunked strictly as User requested)
        const googleMapsUrls: string[] = [];
        const CHUNK_SIZE = 9; // Her bir Rota, Başlangıç(1) + Ara Duraklar(8) + Bitiş(1) şeklinde (toplam 10 durak) olacak.

        if (route.stops && route.stops.length > 0) {
            const sortedStops = [...route.stops].sort((a, b) => a.order_index - b.order_index);

            if (sortedStops.length === 1) {
                const destination = `${sortedStops[0].latitude},${sortedStops[0].longitude}`;
                googleMapsUrls.push(`📍 *Rota 1:* \nhttps://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`);
            } else {
                for (let i = 0; i < sortedStops.length - 1; i += CHUNK_SIZE) {
                    const chunkStart = i;
                    // Bir sonraki rotanın başlangıcı, bu rotanın bitişi olacak şekilde ayarlanıyor.
                    const chunkEnd = Math.min(i + CHUNK_SIZE, sortedStops.length - 1);
                    const chunkStops = sortedStops.slice(chunkStart, chunkEnd + 1);

                    const origin = `${chunkStops[0].latitude},${chunkStops[0].longitude}`;
                    const destination = `${chunkStops[chunkStops.length - 1].latitude},${chunkStops[chunkStops.length - 1].longitude}`;

                    const middleStops = chunkStops.slice(1, -1);
                    const waypoints = middleStops.map(s => `${s.latitude},${s.longitude}`).join('|');

                    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}&travelmode=driving`;
                    
                    const partLabel = sortedStops.length <= CHUNK_SIZE + 1 
                        ? 'Tüm Rota' 
                        : `Rota ${googleMapsUrls.length + 1} (Durak ${chunkStart + 1} ➔ ${chunkEnd + 1})`;
                    
                    googleMapsUrls.push(`📍 *${partLabel}:*\n${url}`);
                }
            }
        }

        // Compact Stops List (order_index sırasına göre sıralanmış)
        let stopsText = '';
        if (route.stops && route.stops.length > 0) {
            const sortedForText = [...route.stops].sort((a, b) => a.order_index - b.order_index);
            stopsText = sortedForText.map((stop, index) => {
                const studentNames = (stop.assignedStudentIds || [])
                    .map(sId => availableStudents.find(st => st.id === sId)?.full_name)
                    .filter(Boolean);

                const studentStr = studentNames.length > 0 ? ` (${studentNames.join(', ')})` : '';
                return `${index + 1}. ${stop.name}${studentStr}`;
            }).join('\n');
        }

        const messageText = `🚌 *${routeName}*${vehicleInfo}${timeInfo}\n\n` +
            `📋 *Durak Listesi:*\n${stopsText}\n\n` +
            `🗺️ *Google Maps Navigasyon:*\n` +
            googleMapsUrls.join('\n\n');

        // Directly open WhatsApp (no browser share menu)
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`, '_blank');
    };

    const handleStopStudentToggle = async (stopId: string, studentId: string) => {
        if (!selectedRouteId) return;

        const route = routes.find(r => r.id === selectedRouteId);
        if (!route) return;
        const stop = route.stops.find(s => s.id === stopId);
        if (!stop) return;

        const isAssigned = stop.assignedStudentIds.includes(studentId);

        // Optimistic UI Update for instant feedback
        setRoutes(prev => prev.map(r => {
            if (r.id !== selectedRouteId) return r;
            const newStops = r.stops.map(s => {
                if (s.id !== stopId) return s;
                return {
                    ...s,
                    assignedStudentIds: isAssigned 
                        ? s.assignedStudentIds.filter(id => id !== studentId)
                        : [...s.assignedStudentIds, studentId]
                };
            });
            return { ...r, stops: newStops };
        }));

        try {
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
                        type: 'pickup'
                    });
            }
            // fetchRoutes(); // We don't need to re-fetch entire routes on every click because we optimistically updated.
        } catch (error) {
            console.error('Error toggling student:', error);
            fetchRoutes(); // Revert on error
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

    const handleDeleteStop = async (stopId: string) => {
        if (!selectedRouteId) return;
        if (!confirm('Bu durağı silmek istediğinize emin misiniz? (Bağlı öğrenciler duraktan çıkarılacaktır)')) return;

        try {
            setLoading(true);
            
            // 1. Önce bu durağa atanmış öğrencilerin assignments'larını sil
            await supabase.from('student_route_assignments').delete().eq('stop_id', stopId);
            
            // 2. Durağı sil
            await supabase.from('route_stops').delete().eq('id', stopId);
            
            // 3. UI'ı güncelle
            await fetchRoutes();
        } catch (error) {
            console.error('Error deleting stop:', error);
            alert('Durak silinirken hata oluştu.');
        } finally {
            setLoading(false);
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
                        properties: { color: selectedRoute?.vehicles?.color }
                    });
                    setFitBoundsTrigger(prev => prev + 1);
                }
            } else {
                setFitBoundsTrigger(prev => prev + 1);
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
                    properties: { color: selectedRoute?.vehicles?.color }
                });
                if (creationMethod === 'interactive' && result.directionsResponse) {
                    setDirectionsResponse(result.directionsResponse);
                }
                setIsOptimized(true);
                setFitBoundsTrigger(prev => prev + 1);

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
                        properties: { color: selectedRoute?.vehicles?.color }
                    });
                    setFitBoundsTrigger(prev => prev + 1);

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

    const handleDirectionsChanged = (result: google.maps.DirectionsResult) => {
        // DO NOT call setDirectionsResponse here!
        // The DirectionsRenderer already has the updated directions from the user's drag.
        // Calling setDirectionsResponse would trigger a React re-render → useEffect → setDirections → loop.
        
        if (!result.routes || result.routes.length === 0) return;
        const route = result.routes[0];
        
        // Extract path coordinates for database saving
        const detailedCoordinates: [number, number][] = [];
        route.legs.forEach(leg => {
            leg.steps.forEach(step => {
                step.path.forEach(pathLatLng => {
                    detailedCoordinates.push([pathLatLng.lng(), pathLatLng.lat()]);
                });
            });
        });
        
        setRouteGeoJson({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: detailedCoordinates },
            properties: {}
        });

        // Rebuild tempPoints (waypoints) so they are saved correctly
        const newTempPoints: { type: 'start' | 'end' | 'stop', pos: [number, number], studentId?: string }[] = [];
        
        route.legs.forEach((leg, index) => {
            if (index === 0) {
                const lng = leg.start_location.lng();
                const lat = leg.start_location.lat();
                const match = tempPoints.find(p => Math.abs(p.pos[0] - lng) < 0.001 && Math.abs(p.pos[1] - lat) < 0.001);
                newTempPoints.push({ type: 'start', pos: [lng, lat], studentId: match?.studentId });
            }
            
            if (index < route.legs.length - 1) {
                const lng = leg.end_location.lng();
                const lat = leg.end_location.lat();
                const match = tempPoints.find(p => Math.abs(p.pos[0] - lng) < 0.001 && Math.abs(p.pos[1] - lat) < 0.001);
                newTempPoints.push({ type: 'stop', pos: [lng, lat], studentId: match?.studentId });
            } else {
                const lng = leg.end_location.lng();
                const lat = leg.end_location.lat();
                const match = tempPoints.find(p => Math.abs(p.pos[0] - lng) < 0.001 && Math.abs(p.pos[1] - lat) < 0.001);
                newTempPoints.push({ type: 'end', pos: [lng, lat], studentId: match?.studentId });
            }
        });
        
        setTempPoints(newTempPoints);
        setIsOptimized(true);
    };

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
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-3 gap-4 shrink-0 flex flex-col lg:flex-row lg:items-center justify-between relative z-[10000]">
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

                    {/* Shift Filter */}
                    <div className="flex items-center w-full sm:w-auto">
                        <select
                            className="w-full sm:w-auto px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm font-bold appearance-none cursor-pointer"
                            value={activeShiftFilter}
                            onChange={(e: any) => setActiveShiftFilter(e.target.value)}
                        >
                            <option value="all">🌤️ Tüm Devreler</option>
                            <option value="Sabahçı">🌅 Sadece Sabahçılar</option>
                            <option value="Öğlenci">🌇 Sadece Öğlenciler</option>
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
                        {/* Hide Other Routes Toggle */}
                        <button
                            onClick={() => setHideOtherRoutes(!hideOtherRoutes)}
                            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center justify-between sm:justify-start gap-2 ${hideOtherRoutes
                                ? 'bg-indigo-500 text-white border-indigo-600 shadow-md shadow-indigo-200/50'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            title="Seçili olmayan diğer rotaları haritada gizle"
                        >
                            <div className="flex items-center gap-2">
                                <MapIcon size={16} />
                                <span>Diğer Rotaları Gizle</span>
                            </div>
                        </button>

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
                                {mapMarkers.filter(m => m.type === 'student_home').length} / {availableStudents.length}
                            </span>
                        </button>

                        {/* Neighborhood Filter (only visible when Student Homes is active) — Multi-select dropdown */}
                        {showStudentLocations && neighborhoods.length > 0 && (
                            <div className="relative animate-in fade-in zoom-in duration-200" data-neighborhood-dropdown>
                                <button
                                    onClick={() => setShowNeighborhoodDropdown(prev => !prev)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border transition-all shadow-sm ${
                                        selectedNeighborhoods.length > 0
                                            ? 'bg-teal-50 border-teal-300 text-teal-700'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <MapPin size={14} className={selectedNeighborhoods.length > 0 ? 'text-teal-600' : 'text-slate-400'} />
                                    <span>Mahalleler</span>
                                    {selectedNeighborhoods.length > 0 && (
                                        <span className="bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                            {selectedNeighborhoods.length}
                                        </span>
                                    )}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showNeighborhoodDropdown ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                                </button>

                                {showNeighborhoodDropdown && (
                                    <div className="absolute top-[110%] left-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[200] min-w-[220px] max-w-xs animate-in slide-in-from-top-2 origin-top overflow-hidden">
                                        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mahalle Filtresi</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setSelectedNeighborhoods([...neighborhoods])}
                                                    className="text-[10px] text-blue-600 font-bold hover:underline"
                                                >Tümü</button>
                                                <span className="text-slate-300">|</span>
                                                <button
                                                    onClick={() => setSelectedNeighborhoods([])}
                                                    className="text-[10px] text-red-500 font-bold hover:underline"
                                                >Temizle</button>
                                            </div>
                                        </div>
                                        <div className="max-h-56 overflow-y-auto p-2 space-y-0.5">
                                            {neighborhoods.map(nh => {
                                                const isSelected = selectedNeighborhoods.includes(nh);
                                                return (
                                                    <button
                                                        key={nh}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setSelectedNeighborhoods(prev => prev.filter(n => n !== nh));
                                                            } else {
                                                                setSelectedNeighborhoods(prev => [...prev, nh]);
                                                            }
                                                        }}
                                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                                                            isSelected
                                                                ? 'bg-teal-50 text-teal-800 font-semibold'
                                                                : 'text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                                            isSelected
                                                                ? 'bg-teal-500 border-teal-500'
                                                                : 'border-slate-300 bg-white'
                                                        }`}>
                                                            {isSelected && (
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                            )}
                                                        </div>
                                                        <span className="truncate text-left">{nh}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="p-2 border-t border-slate-100">
                                            <button
                                                onClick={() => setShowNeighborhoodDropdown(false)}
                                                className="w-full py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                                            >Kapat</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Araç Gizle Filtresi (only visible when Student Homes is active) */}
                        {showStudentLocations && availableVehicles.length > 0 && (
                            <div className="relative animate-in fade-in zoom-in duration-200">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                        <Bus size={14} className="text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500">Araç Gizle</span>
                                        {hiddenVehicleIds.length > 0 && (
                                            <button
                                                onClick={() => setHiddenVehicleIds([])}
                                                className="text-[10px] text-orange-500 font-bold hover:underline ml-1"
                                            >
                                                Temizle ({hiddenVehicleIds.length})
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                                        {availableVehicles.map(v => {
                                            const isHidden = hiddenVehicleIds.includes(v.id);
                                            const studentCount = availableStudents.filter(s => (s as any).vehicle_id === v.id).length;
                                            if (studentCount === 0) return null;
                                            return (
                                                <button
                                                    key={v.id}
                                                    onClick={() => {
                                                        if (isHidden) {
                                                            setHiddenVehicleIds(prev => prev.filter(id => id !== v.id));
                                                        } else {
                                                            setHiddenVehicleIds(prev => [...prev, v.id]);
                                                        }
                                                    }}
                                                    title={`${v.plate_number} aracındaki ${studentCount} öğrenciyi ${isHidden ? 'göster' : 'gizle'}`}
                                                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${
                                                        isHidden
                                                            ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <span
                                                        className="w-2 h-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: v.color || '#94a3b8' }}
                                                    />
                                                    {v.plate_number}
                                                    <span className={`${isHidden ? 'text-orange-100' : 'text-slate-400'}`}>({studentCount})</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                {/* Sidebar (Master / Detail) - fullscreen'de gizle */}
                <div className={`w-1/3 min-w-[400px] flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 ${isMapFullscreen ? 'hidden' : ''}`}>

                    {!selectedRouteId || creationStep !== 'idle' ? (
                        <>
                            {creationStep !== 'idle' ? (
                                <div className="p-6 bg-blue-50 border-b border-blue-100 flex flex-col h-full overflow-y-auto">
                                    <h3 className="text-lg font-bold text-blue-900 mb-2">
                                        {editingGeometryRouteId
                                            ? `✏️ Güzergah Düzenleniyor`
                                            : creationMethod === 'manual' ? 'Manuel Rota Çiziliyor'
                                            : creationMethod === 'interactive' ? 'Etkileşimli (My Maps) Rota Çiziliyor'
                                            : 'Yeni Rota Oluşturuluyor'}
                                    </h3>
                                    <p className="text-blue-700 text-sm mb-4">
                                        {creationMethod === 'manual'
                                            ? 'Haritaya tıklayarak yolu oluşturun. Bitince Kaydet butonuna basın.'
                                            : creationMethod === 'interactive'
                                                ? 'Haritaya tıklayarak veya öğrenci evlerini seçerek durakları sırayla ekleyin. İstediğiniz zaman rotayı veya harfleri (A, B, C...) sürükleyip bırakarak yolu özelleştirebilirsiniz.'
                                                : (creationStep === 'start' ? '1. Haritadan BAŞLANGIÇ noktasını seçin.' :
                                                    creationStep === 'stops' ? '2. Aradaki DURAKLARI haritadan seçin. (Veya rotayı tutup çekiştirin)' :
                                                        creationStep === 'end' ? '3. Son olarak VARIŞ noktasını seçin.' : '')}
                                    </p>

                                    {/* Points List */}
                                    <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1 min-h-[150px]">
                                        {tempPoints.map((p, i) => (
                                            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${p.type === 'start' ? 'bg-green-100 border-green-200' :
                                                p.type === 'end' ? 'bg-red-100 border-red-200' :
                                                    'bg-white border-slate-200'
                                                }`}>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${p.type === 'start' ? 'bg-green-500' :
                                                    p.type === 'end' ? 'bg-red-500' :
                                                        'bg-blue-500'
                                                    }`}>
                                                    {String.fromCharCode(65 + i)}
                                                </div>
                                                <div className="flex-1 text-sm font-medium text-slate-700">
                                                    <span className="font-bold">{String.fromCharCode(65 + i)}</span> Noktası {p.type === 'start' ? '(Başlangıç)' : p.type === 'end' ? '(Varış)' : ''}
                                                    {p.studentId && <span className="ml-1 text-xs text-blue-600">(Öğrenci)</span>}
                                                </div>
                                                <button
                                                    onClick={() => handleDeletePoint(i)}
                                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-200"
                                                    title="Noktayı sil"
                                                >
                                                    <Trash2 size={13} />
                                                    Sil
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
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                                    
                                                    {/* Interactive Selection Card */}
                                                    <button
                                                        onClick={() => {
                                                            setCreationMethod('interactive');
                                                            setCreationStep('interactive_draw');
                                                        }}
                                                        disabled={!newRouteSchoolId}
                                                        className="group relative flex flex-col items-center gap-3 p-5 bg-white border border-blue-100 rounded-3xl hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-200/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed"
                                                    >
                                                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-6 -mt-6 group-hover:scale-110 transition-transform"></div>

                                                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                                                            <MapIcon size={28} />
                                                        </div>

                                                        <div className="text-center">
                                                            <div className="font-bold text-slate-800 text-sm mb-1">Etkileşimli</div>
                                                            <div className="text-[10px] text-slate-400 leading-tight">Sürükle bırak (My Maps)</div>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50">
                                                <p className="text-[10px] text-blue-800/60 leading-relaxed text-center italic">
                                                    İpucu: <b>Otomatik</b> mod durakları sıraya dizer. <b>Manuel</b> mod tamamen serbest çizimdir. <b>Etkileşimli</b> mod (My Maps) ise çizilen otomatik yolu farenizle tutup istediğiniz sokağa sürüklemenizi sağlar.
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

                                    {(tempPoints.some(p => p.type === 'end') || (creationMethod === 'manual' && tempPoints.length >= 2) || (creationMethod === 'interactive' && tempPoints.length >= 2)) && (
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
                                                onClick={editingGeometryRouteId ? saveGeometryEdit : finishRouteCreation}
                                                disabled={!editingGeometryRouteId && creationMethod === 'auto' && !isOptimized}
                                                className={`w-full py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all ${!editingGeometryRouteId && creationMethod === 'auto' && !isOptimized
                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                                    : editingGeometryRouteId
                                                        ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200'
                                                        : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                                                    }`}
                                                title={!editingGeometryRouteId && creationMethod === 'auto' && !isOptimized ? 'Kaydetmeden önce rotayı optimize etmelisiniz' : ''}
                                            >
                                                <Check size={20} />
                                                {editingGeometryRouteId ? 'Güzergahı Güncelle' : 'Rotayı Kaydet'}
                                            </button>
                                        </div>
                                    )}


                                    {/* Araç Gizle - Rota Oluşturma Paneli */}
                                    {creationStep !== 'method_selection' && availableVehicles.length > 0 && (() => {
                                        const vehiclesWithStudents = availableVehicles.filter(v =>
                                            availableStudents.some(s => (s as any).vehicle_id === v.id)
                                        );
                                        if (vehiclesWithStudents.length === 0) return null;
                                        return (
                                            <div className="mt-3 p-3 bg-white/60 border border-blue-100 rounded-xl">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <Bus size={13} className="text-blue-400" />
                                                        <span className="text-xs font-bold text-blue-700">Araç Gizle</span>
                                                        <span className="text-[10px] text-blue-500">— seçilenlerin öğrencileri haritadan kaybolur</span>
                                                    </div>
                                                    {hiddenVehicleIds.length > 0 && (
                                                        <button
                                                            onClick={() => setHiddenVehicleIds([])}
                                                            className="text-[10px] text-orange-500 font-bold hover:underline"
                                                        >
                                                            Temizle
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                                    {vehiclesWithStudents.map(v => {
                                                        const isHidden = hiddenVehicleIds.includes(v.id);
                                                        const studentCount = availableStudents.filter(s => (s as any).vehicle_id === v.id).length;
                                                        return (
                                                            <button
                                                                key={v.id}
                                                                onClick={() => {
                                                                    if (isHidden) {
                                                                        setHiddenVehicleIds(prev => prev.filter(id => id !== v.id));
                                                                    } else {
                                                                        setHiddenVehicleIds(prev => [...prev, v.id]);
                                                                    }
                                                                }}
                                                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all border ${
                                                                    isHidden
                                                                        ? 'bg-orange-50 border-orange-300 text-orange-800'
                                                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                                                    isHidden
                                                                        ? 'bg-orange-500 border-orange-500'
                                                                        : 'border-slate-300 bg-white'
                                                                }`}>
                                                                    {isHidden && (
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                                    )}
                                                                </div>
                                                                <span
                                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                                    style={{ backgroundColor: v.color || '#94a3b8' }}
                                                                />
                                                                <span className="font-bold flex-1 text-left">{v.plate_number}</span>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                                                    isHidden
                                                                        ? 'bg-orange-200 text-orange-700'
                                                                        : 'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                    {studentCount} öğrenci
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="mt-auto pt-4 border-t border-blue-100">
                                        <button
                                            onClick={() => {
                                                if (editingGeometryRouteId) {
                                                    // Düzenleme modundan çıkınca rotayı yeniden seç
                                                    const prevId = editingGeometryRouteId;
                                                    setEditingGeometryRouteId(null);
                                                    setSelectedRouteId(prevId);
                                                }
                                                setCreationStep('idle');
                                                setTempPoints([]);
                                                setRouteGeoJson(null);
                                                setDirectionsResponse(undefined);
                                                setCreationMethod(null);
                                                setIsOptimized(false);
                                                setHiddenVehicleIds([]);
                                            }}
                                            className="w-full py-2 text-slate-500 hover:text-red-600 text-sm font-medium"
                                        >
                                            {editingGeometryRouteId ? 'Düzenlemeyi İptal Et' : 'İptal Et'}
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
                                            setMapCenter(undefined);
                                            setMapZoom(undefined);
                                            if (id) setFitBoundsTrigger(prev => prev + 1);
                                        }}
                                        onDelete={handleDeleteRoute}
                                        onEdit={openEditModal}
                                        onShare={handleShareRoute}
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
                                    {selectedRoute && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => startGeometryEdit(selectedRoute.id)}
                                                className="p-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                                                title="Rotanın çizimini / güzergahını harita üzerinde düzenle"
                                            >
                                                <MapIcon size={16} />
                                                <span className="hidden sm:inline">Güzergahı Düzenle</span>
                                            </button>
                                            <button
                                                onClick={() => openEditModal(selectedRoute.id)}
                                                className="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                                                title="Rota bilgilerini düzenle (Ad, Okul, Saat, Etiket, Fiyat)"
                                            >
                                                <Pencil size={16} />
                                                <span className="hidden sm:inline">Bilgi</span>
                                            </button>
                                            <button
                                                onClick={() => handleShareRoute(selectedRoute.id)}
                                                className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                                                title="Şoförle / WhatsApp ile Paylaş"
                                            >
                                                <Share2 size={16} />
                                                <span className="hidden sm:inline">Paylaş</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                                    {/* Vehicle Card */}
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-secondary/10 rounded-bl-full -mr-4 -mt-4"></div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Atanan Araç</h3>

                                        {selectedRoute?.vehicle_id ? (
                                            <div className="flex items-start gap-4 mb-3">
                                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0">
                                                    <Bus size={24} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-lg">{selectedRoute.vehicle.split(' - ')[0]}</div>
                                                    <div className="text-sm text-slate-500">{selectedRoute.vehicle.split(' - ')[1]}</div>
                                                    <div className="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>Araç Atandı</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-red-500 font-semibold mb-3 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block"></span>Henüz bir araç atanmamış.</p>
                                        )}
                                        <select
                                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-secondary"
                                            onChange={(e) => handleVehicleAssign(e.target.value)}
                                            value={selectedRoute?.vehicle_id || ''}
                                        >
                                            <option value="">{selectedRoute?.vehicle_id ? 'Araç Kaldır / Değiştir...' : 'Araç Seç...'}</option>
                                            {availableVehicles.map(v => (
                                                <option key={v.id} value={v.id}>{v.plate_number} - {v.driver_name}</option>
                                            ))}
                                        </select>

                                        {/* Bulk Vehicle Assignment to Students */}
                                        {selectedRoute?.vehicle_id && (() => {
                                            const allStudentIds = selectedRoute.stops.flatMap(s => s.assignedStudentIds || []);
                                            const uniqueStudentIds = [...new Set(allStudentIds)];
                                            const assignedCount = uniqueStudentIds.filter(sid => {
                                                const student = availableStudents.find(s => s.id === sid);
                                                return !!(student as any)?.vehicles?.plate_number;
                                            }).length;
                                            const unassignedCount = uniqueStudentIds.length - assignedCount;
                                            return (
                                                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-slate-500">Öğrenci Araç Durumu</span>
                                                        <span className="text-xs font-semibold text-slate-400">{uniqueStudentIds.length} öğrenci</span>
                                                    </div>
                                                    <div className="flex gap-2 mb-3">
                                                        <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                            <span className="text-xs font-bold text-green-700">{assignedCount}</span>
                                                            <span className="text-[10px] text-green-600">Atanmış</span>
                                                        </div>
                                                        <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                                            <span className="text-xs font-bold text-red-700">{unassignedCount}</span>
                                                            <span className="text-[10px] text-red-600">Atanmamış</span>
                                                        </div>
                                                    </div>
                                                    {unassignedCount > 0 && (
                                                        <button
                                                            onClick={handleBulkVehicleAssignToStudents}
                                                            disabled={loading}
                                                            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition-all cursor-pointer disabled:opacity-50"
                                                        >
                                                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Bus size={16} />}
                                                            <span>Tümüne Bu Aracı Ata ({unassignedCount} öğrenci)</span>
                                                        </button>
                                                    )}
                                                    {unassignedCount === 0 && uniqueStudentIds.length > 0 && (
                                                        <div className="text-xs text-green-600 font-semibold text-center flex items-center justify-center gap-1.5">
                                                            <Check size={14} />
                                                            Tüm öğrencilere araç atanmış
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {selectedRoute && (
                                            <button
                                                onClick={() => handleShareRoute(selectedRoute.id)}
                                                className="w-full mt-4 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-100 transition-all cursor-pointer"
                                            >
                                                <Share2 size={18} />
                                                <span>Rotayı Şoförle Paylaş (WhatsApp)</span>
                                            </button>
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
                                                                {stop.type !== 'start' && stop.type !== 'end' && (
                                                                    <button
                                                                        onClick={() => handleDeleteStop(stop.id)}
                                                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-200"
                                                                        title="Durağı sil"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                        Sil
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Assigned Students List */}
                                                    <div className="space-y-2">
                                                        {stop.assignedStudentIds.map(studentId => {
                                                            const student = availableStudents.find(s => s.id === studentId);
                                                            if (!student) return null;
                                                            const hasVehicle = !!(student as any).vehicles?.plate_number;
                                                            return (
                                                                <div key={student.id} className={`flex items-center gap-2 p-2 rounded-lg shadow-sm border ${hasVehicle ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${hasVehicle ? 'bg-green-500' : 'bg-red-400'}`}>
                                                                        {student.full_name.charAt(0)}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className={`text-sm font-medium ${hasVehicle ? 'text-green-800' : 'text-red-700'}`}>{student.full_name}</span>
                                                                        {hasVehicle ? (
                                                                            <div className="text-[10px] text-green-600 font-semibold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>{(student as any).vehicles.plate_number}</div>
                                                                        ) : (
                                                                            <div className="text-[10px] text-red-500 font-semibold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block"></span>Araç Atanmamış</div>
                                                                        )}
                                                                    </div>
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
                                                                    .filter(student => {
                                                                        const currentSchoolId = editingRouteData?.school_id || newRouteSchoolId;
                                                                        return currentSchoolId ? student.school_id === currentSchoolId : true;
                                                                    })
                                                                    .map(student => {
                                                                        const isAssigned = stop.assignedStudentIds.includes(student.id);
                                                                        return (
                                                                            <button
                                                                                type="button"
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
                                                                {availableStudents
                                                                    .filter(s => s.full_name.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                                                                    .filter(s => {
                                                                        const currentSchoolId = editingRouteData?.school_id || newRouteSchoolId;
                                                                        return currentSchoolId ? s.school_id === currentSchoolId : true;
                                                                    })
                                                                    .length === 0 && (
                                                                    <div className="text-xs text-slate-400 italic text-center py-2">Sonuç bulunamadı.</div>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
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
                <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative transition-all duration-300 ${
                    isMapFullscreen
                        ? 'fixed inset-0 z-[9999] h-screen w-screen rounded-none border-0 m-0'
                        : 'flex-1'
                }`}>
                    <MapScene
                        className="w-full h-full"
                        routeGeoJson={routeGeoJson}
                        routesGeoJson={(selectedRouteId || creationStep !== 'idle' || hideOtherRoutes) ? null : multiRoutesGeoJson}
                        markers={mapMarkers}
                        onMapClick={handleMapClick}
                        onMarkerClick={handleMarkerClick}
                        onRouteHover={handleRouteHover}
                        onRouteClick={handleRouteClickFromMap}
                        autoCenter={creationStep === 'idle' && !!selectedRouteId} // Only auto-center when a specific route is selected for viewing
                        center={mapCenter}
                        zoom={mapZoom}
                        directionsResponse={directionsResponse}
                        onDirectionsChanged={handleDirectionsChanged}
                        fitBoundsTrigger={fitBoundsTrigger}
                        selectedRouteId={selectedRouteId}
                        suppressMarkers={creationMethod !== 'interactive'}
                    />

                    {/* Fullscreen Toggle Button */}
                    <button
                        onClick={() => setIsMapFullscreen(f => !f)}
                        className="absolute top-4 right-4 z-50 p-2.5 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                        title={isMapFullscreen ? 'Tam Ekrandan Çık' : 'Haritayı Tam Ekran Yap'}
                    >
                        {isMapFullscreen ? <Minimize size={18} className="text-blue-600" /> : <Maximize size={18} className="text-blue-600" />}
                    </button>

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
                        <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-80 bg-white rounded-xl shadow-2xl border border-slate-100 p-3 animate-in slide-in-from-bottom-5 duration-200 z-50 flex flex-col max-h-[70vh]">
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
                                </div>

                                {/* Araç Atama Bölümü */}
                                <div className={`p-2.5 rounded-lg border ${selectedStudent.vehicles?.plate_number ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <Bus size={12} className={selectedStudent.vehicles?.plate_number ? 'text-emerald-600' : 'text-red-500'} />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Araç</span>
                                        </div>
                                        {selectedStudent.vehicles?.plate_number ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                                {selectedStudent.vehicles.plate_number}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block"></span>
                                                Atanmadı
                                            </span>
                                        )}
                                    </div>
                                    <select
                                        className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-medium text-slate-700 appearance-none cursor-pointer"
                                        value={selectedStudent.vehicle_id || ''}
                                        onChange={(e) => handleStudentVehicleAssign(selectedStudent.id, e.target.value)}
                                    >
                                        <option value="">{selectedStudent.vehicle_id ? 'Aracı Kaldır...' : 'Araç Seç...'}</option>
                                        {availableVehicles.map(v => (
                                            <option key={v.id} value={v.id}>{v.plate_number} - {v.driver_name}</option>
                                        ))}
                                    </select>
                                    {/* Quick assign from current route's vehicle */}
                                    {selectedRoute?.vehicle_id && !selectedStudent.vehicle_id && (
                                        <button
                                            onClick={() => handleStudentVehicleAssign(selectedStudent.id, selectedRoute.vehicle_id!)}
                                            className="w-full mt-1.5 py-1.5 px-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                        >
                                            <Bus size={11} />
                                            Rotanın Aracını Ata ({selectedRoute.vehicles?.plate_number})
                                        </button>
                                    )}
                                </div>

                                {/* Durağa Atama Bölümü (sadece rota seçiliyken) */}
                                {selectedRoute && selectedRoute.stops.length > 0 && (
                                    <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <MapPin size={12} className="text-blue-600" />
                                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Durağa Ata</span>
                                            <span className="text-[9px] text-blue-500 font-medium ml-auto">{selectedRoute.name}</span>
                                        </div>
                                        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                            {selectedRoute.stops.filter(s => s.type !== 'end').map(stop => {
                                                const isAssignedToStop = stop.assignedStudentIds.includes(selectedStudent.id);
                                                return (
                                                    <button
                                                        key={stop.id}
                                                        onClick={() => handlePopupStopStudentToggle(stop.id, selectedStudent.id)}
                                                        className={`w-full flex items-center justify-between p-1.5 rounded-lg text-[11px] transition-all border ${isAssignedToStop
                                                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-100 hover:border-blue-300'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${stop.type === 'start' ? 'bg-green-500 text-white' : isAssignedToStop ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                {stop.type === 'start' ? 'B' : stop.order_index}
                                                            </div>
                                                            <span className="font-medium truncate">{stop.name}</span>
                                                        </div>
                                                        {isAssignedToStop && <Check size={12} className="shrink-0" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Route Edit Modal */}
                {editingRouteData && (
                    <div 
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditingRouteData(null);
                        }}
                        tabIndex={-1}
                    >
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-5">
                            <div className="flex justify-between items-center p-5 border-b border-slate-100/60 bg-slate-50/50">
                                <div>
                                    <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings text-slate-600"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                                        Rotayı Düzenle
                                    </h3>
                                    <p className="text-xs text-slate-600 mt-1 font-medium">Rota temel bilgilerini ve etiketlerini güncelleyin.</p>
                                </div>
                                <button
                                    onClick={() => setEditingRouteData(null)}
                                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
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
