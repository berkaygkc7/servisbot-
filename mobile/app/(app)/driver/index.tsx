import { View, Text, TouchableOpacity, Alert, Dimensions, Platform, ScrollView, Animated, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapLibreGL from '@maplibre/maplibre-react-native';
import tw from 'twrnc';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { locationService } from '../../../src/services/LocationService';
import { useAuth } from '../../../src/context/AuthContext';
import { supabase } from '../../../src/lib/supabase';
import { notifyRouteStarted, notifyStudentBoarded, notifyStudentAlighted } from '../../../src/services/notifications';

// MapTiler Configuration
const MAPTILER_KEY = '0cfp1iqfMwRC8dMGQxNg';
const STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

MapLibreGL.setAccessToken(MAPTILER_KEY); // Use the same key for authentication if needed

interface Student {
    id: string;
    full_name: string;
    absent_dates?: string[];
}

interface RouteStop {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    order_index: number;
    estimated_time: string;
    students: Student[];
}

interface AssignedRoute {
    id: string;
    name: string;
    geometry: { type: string; coordinates: [number, number][] } | null;
    stops: RouteStop[];
    time: string;
    status: string;
}

export default function DriverDashboard() {
    const { vehicleId, userName } = useAuth();
    const [isDriving, setIsDriving] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [routes, setRoutes] = useState<AssignedRoute[]>([]);
    const [activeRoute, setActiveRoute] = useState<AssignedRoute | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>("Yükleniyor...");
    const mapRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const [boardedStudents, setBoardedStudents] = useState<string[]>([]);
    const [alightedStudents, setAlightedStudents] = useState<string[]>([]);

    const panY = useRef(new Animated.Value(0)).current;
    const translateYOffset = useRef(0);
    const { height: SCREEN_HEIGHT } = Dimensions.get('window');
    const PANEL_HEIGHT = SCREEN_HEIGHT * 0.5;
    const HEADER_HEIGHT = 85; 
    const MAX_TRANSLATE_Y = Math.max(0, PANEL_HEIGHT - HEADER_HEIGHT);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 5;
            },
            onPanResponderGrant: () => {
                panY.setOffset(translateYOffset.current);
                panY.setValue(0);
            },
            onPanResponderMove: (e, gestureState) => {
                let newY = gestureState.dy;
                if (translateYOffset.current + newY < 0) {
                    newY = -translateYOffset.current;
                } else if (translateYOffset.current + newY > MAX_TRANSLATE_Y) {
                    newY = MAX_TRANSLATE_Y - translateYOffset.current;
                }
                panY.setValue(newY);
            },
            onPanResponderRelease: (e, gestureState) => {
                panY.flattenOffset();
                if (gestureState.vy > 0.5 || gestureState.dy > MAX_TRANSLATE_Y / 4) {
                    Animated.spring(panY, {
                        toValue: MAX_TRANSLATE_Y,
                        useNativeDriver: true,
                        bounciness: 0,
                    }).start(() => {
                        translateYOffset.current = MAX_TRANSLATE_Y;
                    });
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 0,
                    }).start(() => {
                        translateYOffset.current = 0;
                    });
                }
            }
        })
    ).current;

    // Initial Setup
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('İzin Gerekli', 'Konum takibi için izin vermelisiniz.');
                    return;
                }

                const hasServicesEnabled = await Location.hasServicesEnabledAsync();
                if (!hasServicesEnabled) {
                    Alert.alert('Konum Kapalı', 'Lütfen cihazınızın konum (GPS) servisini açın.');
                    return;
                }

                const currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation);
            } catch (error) {
                console.warn("Konum alınamadı:", error);
            }

            if (vehicleId) {
                fetchAssignedRoute();
            } else {
                setStatusMessage("Araç seçilmedi.");
            }
        })();

        return () => {
            stopTracking();
        };
    }, [vehicleId]);

    const fetchAssignedRoute = async () => {
        if (!vehicleId) return;

        setStatusMessage("Rotalar aranıyor...");
        try {
            const { data: routesData, error } = await supabase.rpc('get_driver_route_data', {
                p_vehicle_id: vehicleId
            });

            if (error) {
                setStatusMessage(`Rota Hatası: ${error.message}`);
                return;
            }

            if (routesData && routesData.length > 0) {
                const parsedRoutes = routesData.map((route: any) => {
                    let parsedGeometry = route.geometry;
                    if (typeof parsedGeometry === 'string') {
                        try {
                            parsedGeometry = JSON.parse(parsedGeometry);
                        } catch (e) {
                            parsedGeometry = null;
                        }
                    }

                    const studentAssignments = route.student_route_assignments || [];

                    const sortedStops = (route.route_stops || []).sort((a: any, b: any) => a.order_index - b.order_index).map((stop: any) => {
                        const studentsForThisStop = studentAssignments
                            .filter((assignment: any) => assignment.stop_id === stop.id)
                            .map((assignment: any) => assignment.students)
                            .filter(Boolean);

                        return { ...stop, students: studentsForThisStop };
                    });

                    return {
                        id: route.id,
                        name: route.name,
                        geometry: parsedGeometry,
                        stops: sortedStops,
                        time: route.time || '08:00',
                        status: route.status
                    };
                });

                setRoutes(parsedRoutes);

                const active = parsedRoutes.find((r: any) => r.status === 'active');
                if (active) {
                    setActiveRoute(active);
                    setStatusMessage(`Aktif Rota: ${active.name}`);
                    setTimeout(() => zoomToRoute(active), 500);
                } else {
                    setActiveRoute(null);
                    setStatusMessage(`${parsedRoutes.length} Rota Bekliyor`);
                }
            } else {
                setRoutes([]);
                setActiveRoute(null);
                setStatusMessage("Bugün İçin Rota Yok");
            }

        } catch (e: any) {
            setStatusMessage(`Hata: ${e.message}`);
        }
    };

    const zoomToRoute = (route: AssignedRoute) => {
        if (route.geometry?.coordinates?.length) {
            const coords = route.geometry.coordinates;
            const first = coords[0];
            if (first && cameraRef.current) {
                cameraRef.current.setCamera({
                    centerCoordinate: [Number(first[0]), Number(first[1])],
                    zoomLevel: 14,
                    animationDuration: 1000
                });
            }
        }
    };

    const focusRoute = (coords: any[]) => {
        if (!coords || coords.length === 0 || !cameraRef.current) return;

        try {
            const longitudes = coords.map(c => Number(c[0]));
            const latitudes = coords.map(c => Number(c[1]));
            
            const minLng = Math.min(...longitudes);
            const maxLng = Math.max(...longitudes);
            const minLat = Math.min(...latitudes);
            const maxLat = Math.max(...latitudes);

            cameraRef.current.fitBounds(
                [maxLng, maxLat],
                [minLng, minLat],
                [50, 50, 50, 50],
                1000
            );
        } catch (e) {
            console.log("Focus error:", e);
        }
    };

    const startTracking = async () => {
        if (!vehicleId) {
            Alert.alert("Hata", "Araç seçimi yapılmadı.");
            return;
        }

        setIsDriving(true);
        setStatusMessage("Takip başlatılıyor...");

        await locationService.startTracking(vehicleId, (newLocation, statusMsg) => {
            if (newLocation) setLocation(newLocation);
            if (statusMsg) setStatusMessage(statusMsg);

            if (newLocation && cameraRef.current) {
                cameraRef.current.setCamera({
                    centerCoordinate: [newLocation.coords.longitude, newLocation.coords.latitude],
                    zoomLevel: 17,
                    heading: newLocation.coords.heading || 0,
                    pitch: 45,
                    animationDuration: 1000
                });
            }
        });
    };

    const stopTracking = () => {
        setIsDriving(false);
        locationService.stopTracking();
    };

    const toggleDrive = async () => {
        if (isDriving) {
            stopTracking();
        } else {
            if (activeRoute?.id) {
                try {
                    await notifyRouteStarted(activeRoute.id);
                } catch (e) {
                    console.warn('Route start notification failed:', e);
                }
            }
            startTracking();
            setBoardedStudents([]);
            setAlightedStudents([]);
        }
    };

    // GeoJSON for the route line
    const routeGeoJSON: any = activeRoute?.geometry ? {
        type: 'Feature',
        properties: {},
        geometry: activeRoute.geometry
    } : null;

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>

            {/* 1. TOP HEADER */}
            <View style={tw`bg-white p-4 flex-row items-center justify-between border-b border-slate-200 z-50 shadow-sm`}>
                {activeRoute && !isDriving ? (
                    <TouchableOpacity
                        onPress={() => {
                            setActiveRoute(null);
                            setStatusMessage(`${routes.length} Rota Bekliyor`);
                        }}
                        style={tw`bg-slate-100 p-2 rounded-full mr-3`}
                    >
                        <Feather name="arrow-left" size={20} color="#334155" />
                    </TouchableOpacity>
                ) : null}

                <View style={tw`flex-1`}>
                    <Text style={tw`text-xs font-bold text-slate-400 uppercase`}>Sistem Durumu</Text>
                    <Text style={tw`text-sm font-bold text-slate-800`} numberOfLines={1}>{statusMessage}</Text>
                </View>
                <TouchableOpacity
                    onPress={fetchAssignedRoute}
                    style={tw`bg-slate-100 p-2 rounded-full`}
                >
                    <Feather name="refresh-cw" size={20} color="#334155" />
                </TouchableOpacity>
            </View>

            {/* 2. MAIN AREA */}
            <View style={tw`flex-1 relative`}>
                {activeRoute ? (
                    <>
                        <MapLibreGL.MapView
                            ref={mapRef}
                            style={tw`w-full h-full`}
                            mapStyle={STYLE_URL}
                            logoEnabled={false}
                            attributionEnabled={false}
                        >
                            <MapLibreGL.Camera
                                ref={cameraRef}
                                defaultSettings={{
                                    centerCoordinate: [28.9784, 41.0082],
                                    zoomLevel: 13,
                                }}
                            />

                            {/* User Location */}
                            <MapLibreGL.UserLocation 
                                visible={true}
                                renderMode="native"
                                androidRenderMode="gps"
                            />

                            {/* Route Line */}
                            {routeGeoJSON && (
                                <MapLibreGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
                                    <MapLibreGL.LineLayer
                                        id="routeLayer"
                                        style={{
                                            lineColor: '#3b82f6',
                                            lineWidth: 5,
                                            lineJoin: 'round',
                                            lineCap: 'round',
                                            lineOpacity: 0.8
                                        }}
                                    />
                                </MapLibreGL.ShapeSource>
                            )}

                            {/* Stops */}
                            {activeRoute.stops.map((stop, index) => {
                                const lat = Number(stop.latitude);
                                const lng = Number(stop.longitude);
                                if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

                                const isFirst = index === 0;
                                const isLast = index === activeRoute.stops.length - 1;
                                const borderColor = isFirst ? '#22c55e' : isLast ? '#ef4444' : '#3b82f6';
                                const bgColor = isFirst ? '#f0fdf4' : isLast ? '#fef2f2' : '#eff6ff';

                                return (
                                    <MapLibreGL.PointAnnotation
                                        key={stop.id}
                                        id={stop.id}
                                        coordinate={[lng, lat]}
                                    >
                                        <View style={[tw`bg-white p-1 rounded-full border-2`, { borderColor }]}>
                                            <View style={[tw`w-6 h-6 rounded-full items-center justify-center`, { backgroundColor: bgColor }]}>
                                                <Text style={tw`text-xs font-bold text-gray-700`}>{index + 1}</Text>
                                            </View>
                                        </View>
                                    </MapLibreGL.PointAnnotation>
                                );
                            })}
                        </MapLibreGL.MapView>

                        {/* Overlays on Map */}
                        <View style={tw`absolute top-4 left-4 right-4 bg-white/90 p-3 rounded-xl shadow-sm border border-slate-100`}>
                            <View style={tw`flex-row items-center gap-2`}>
                                <Feather name="truck" size={16} color="#0F172A" />
                                <Text style={tw`font-bold text-slate-800`}>{activeRoute.name}</Text>
                            </View>
                        </View>

                        {/* Bottom Sheet Overlay - Stops List */}
                        <Animated.View style={[
                            tw`absolute bottom-0 left-0 right-0 bg-white shadow-2xl overflow-hidden`,
                            {
                                height: PANEL_HEIGHT,
                                borderTopLeftRadius: 24,
                                borderTopRightRadius: 24,
                                elevation: 10,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: -2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 10,
                                transform: [{ translateY: panY }]
                            }
                        ]}>
                            <View {...panResponder.panHandlers} style={tw`w-full bg-white`}>
                                <View style={tw`w-12 h-1.5 bg-slate-200 rounded-full self-center mt-3 mb-2`}></View>

                                <View style={tw`px-4 pb-3 border-b border-slate-100 flex-row justify-between items-center`}>
                                    <Text style={tw`font-bold text-lg text-slate-800`}>Duraklar & Öğrenciler</Text>
                                    <TouchableOpacity
                                        onPress={toggleDrive}
                                        style={tw`${isDriving ? 'bg-red-100' : 'bg-emerald-100'} px-4 py-2 rounded-xl`}
                                    >
                                        <Text style={tw`${isDriving ? 'text-red-700' : 'text-emerald-700'} font-bold text-sm`}>
                                            {isDriving ? 'Sürüşü Bitir' : 'Sürüşe Başla'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <ScrollView style={tw`flex-1 p-4`} contentContainerStyle={tw`pb-8`} showsVerticalScrollIndicator={false}>
                                {activeRoute.stops.map((stop, index) => (
                                    <View key={stop.id} style={tw`mb-4`}>
                                        <View style={tw`flex-row items-center justify-between mb-2`}>
                                            <View style={tw`flex-row items-center gap-2 flex-1`}>
                                                <View style={tw`w-6 h-6 rounded-full items-center justify-center ${index === 0 ? 'bg-green-100' : index === activeRoute.stops.length - 1 ? 'bg-red-100' : 'bg-blue-100'}`}>
                                                    <Text style={tw`text-xs font-bold ${index === 0 ? 'text-green-700' : index === activeRoute.stops.length - 1 ? 'text-red-700' : 'text-blue-700'}`}>{index + 1}</Text>
                                                </View>
                                                <Text style={tw`font-bold text-slate-700 text-base`} numberOfLines={1}>{stop.name}</Text>
                                            </View>
                                            <Text style={tw`text-xs font-bold text-slate-400`}>{stop.estimated_time}</Text>
                                        </View>

                                        {/* Students at this stop */}
                                        {stop.students && stop.students.length > 0 && (
                                            <View style={tw`ml-8 space-y-2 border-l-2 border-slate-100 pl-3 py-1`}>
                                                {stop.students.map((student, sIdx) => {
                                                    if (!student || !student.id) return null;
                                                    const todayStr = new Date().toISOString().split('T')[0];
                                                    const isAbsent = student.absent_dates?.includes(todayStr);
                                                    const hasBoarded = boardedStudents.includes(student.id);
                                                    const hasAlighted = alightedStudents.includes(student.id);

                                                    return (
                                                        <View key={student.id ?? sIdx} style={tw`bg-slate-50 p-2 rounded-lg`}>
                                                            <View style={tw`flex-row items-center justify-between mb-1.5`}>
                                                                <View style={tw`flex-row items-center gap-2 flex-1`}>
                                                                    <View style={tw`w-2 h-2 rounded-full ${isAbsent ? 'bg-red-400' : hasBoarded ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                                                    <Text style={tw`text-sm font-medium ${isAbsent ? 'text-red-500 line-through' : 'text-slate-700'}`} numberOfLines={1}>
                                                                        {student.full_name}
                                                                    </Text>
                                                                </View>
                                                                {isAbsent && (
                                                                    <Text style={tw`text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded`}>GELMEYECEK</Text>
                                                                )}
                                                            </View>

                                                            {/* Boarding / Alighting buttons */}
                                                            {!isAbsent && (
                                                                <View style={tw`flex-row gap-2`}>
                                                                    {/* Bindi button */}
                                                                    <TouchableOpacity
                                                                        onPress={async () => {
                                                                            setBoardedStudents(prev => [...prev, student.id]);
                                                                            await notifyStudentBoarded(student.id);
                                                                        }}
                                                                        disabled={hasBoarded}
                                                                        style={tw`flex-1 flex-row items-center justify-center gap-1 py-1.5 rounded-lg ${
                                                                            hasBoarded ? 'bg-emerald-100' : 'bg-emerald-500'
                                                                        }`}
                                                                    >
                                                                        <Feather name="log-in" size={12} color={hasBoarded ? '#059669' : '#fff'} />
                                                                        <Text style={tw`text-xs font-bold ${hasBoarded ? 'text-emerald-700' : 'text-white'}`}>
                                                                            {hasBoarded ? 'Bindi ✓' : 'Bindi'}
                                                                        </Text>
                                                                    </TouchableOpacity>

                                                                    {/* İndi button — only active after boarded */}
                                                                    <TouchableOpacity
                                                                        onPress={async () => {
                                                                            setAlightedStudents(prev => [...prev, student.id]);
                                                                            await notifyStudentAlighted(student.id);
                                                                        }}
                                                                        disabled={!hasBoarded || hasAlighted}
                                                                        style={tw`flex-1 flex-row items-center justify-center gap-1 py-1.5 rounded-lg ${
                                                                            hasAlighted ? 'bg-blue-100' : hasBoarded ? 'bg-blue-500' : 'bg-slate-200'
                                                                        }`}
                                                                    >
                                                                        <Feather name="log-out" size={12} color={hasAlighted ? '#2563eb' : hasBoarded ? '#fff' : '#94a3b8'} />
                                                                        <Text style={tw`text-xs font-bold ${hasAlighted ? 'text-blue-700' : hasBoarded ? 'text-white' : 'text-slate-400'}`}>
                                                                            {hasAlighted ? 'İndi ✓' : 'İndi'}
                                                                        </Text>
                                                                    </TouchableOpacity>
                                                                </View>
                                                            )}
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        </Animated.View>
                    </>
                ) : (
                    <View style={tw`flex-1 bg-slate-50`}>
                        <ScrollView contentContainerStyle={tw`p-4 pb-12`}>
                            <View style={tw`mb-6 mt-2 pb-4 border-b border-slate-200`}>
                                <Text style={tw`text-sm font-bold text-slate-400 uppercase tracking-widest mb-1`}>HOŞ GELDİN</Text>
                                <Text style={tw`text-3xl font-black text-slate-800`}>{userName || 'Şoför'}</Text>
                            </View>

                            <Text style={tw`text-xl font-bold text-slate-800 mb-6`}>Yaklaşan Rotalar</Text>

                            {routes.length === 0 ? (
                                <View style={tw`bg-white p-8 rounded-3xl items-center shadow-sm border border-slate-100`}>
                                    <View style={tw`w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-4`}>
                                        <Feather name="calendar" size={32} color="#3B82F6" />
                                    </View>
                                    <Text style={tw`text-lg font-bold text-slate-800 mb-2`}>Harika!</Text>
                                    <Text style={tw`text-slate-500 text-center`}>Şu an için atanmış veya bekleyen bir rotanız bulunmuyor.</Text>
                                </View>
                            ) : (
                                routes.map(route => (
                                    <TouchableOpacity
                                        key={route.id}
                                        style={tw`bg-white mb-4 rounded-3xl shadow-sm border border-slate-100 overflow-hidden`}
                                        onPress={() => {
                                            setActiveRoute(route);
                                            setStatusMessage(`Rota: ${route.name}`);
                                            setTimeout(() => zoomToRoute(route), 300);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={tw`flex-row items-center justify-between p-5 border-b border-slate-50`}>
                                            <View style={tw`flex-row items-center flex-1`}>
                                                <View style={tw`w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center mr-4`}>
                                                    <Feather name="map" size={24} color="#3B82F6" />
                                                </View>
                                                <View style={tw`flex-1`}>
                                                    <Text style={tw`font-bold text-slate-800 text-lg mb-0.5`} numberOfLines={1}>{route.name}</Text>
                                                    <View style={tw`flex-row items-center`}>
                                                        <Feather name="clock" size={12} color="#64748B" style={tw`mr-1`} />
                                                        <Text style={tw`text-slate-500 text-sm font-medium`}>{route.time || "Saat belirtilmemiş"}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View style={tw`bg-slate-50 p-2 rounded-full`}>
                                                <Feather name="chevron-right" size={20} color="#94A3B8" />
                                            </View>
                                        </View>

                                        <View style={tw`px-5 py-4 bg-slate-50/50 flex-row`}>
                                            <View style={tw`flex-row items-center flex-1`}>
                                                <Feather name="map-pin" size={16} color="#64748B" style={tw`mr-2`} />
                                                <Text style={tw`text-slate-600 font-medium`}>{route.stops.length} Durak</Text>
                                            </View>
                                            <View style={tw`w-px h-full bg-slate-200 mx-4`}></View>
                                            <View style={tw`flex-row items-center flex-1`}>
                                                <Feather name="users" size={16} color="#64748B" style={tw`mr-2`} />
                                                <Text style={tw`text-slate-600 font-medium`}>
                                                    {route.stops.reduce((acc, stop) => acc + (stop.students?.length || 0), 0)} Öğrenci
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}
