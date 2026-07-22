import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Rocket, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import MapScene from '../map/MapScene';
import { fetchRoute } from '../../services/routingService';

const Hero: React.FC = () => {
    // Interactive Demo State
    const [tempRouteCoords, setTempRouteCoords] = useState<[number, number][]>([]);
    const [roadSnappedCoords, setRoadSnappedCoords] = useState<[number, number][]>([]);
    const [isRouting, setIsRouting] = useState(false);

    // State for snapped static mock routes
    const [snappedRoutes, setSnappedRoutes] = useState<Record<string, [number, number][]>>({});

    // Hover Info State
    const [hoveredMarkerId, setHoveredMarkerId] = useState<string | number | null>(null);

    // Extended Mock Data for a vibrant demo map (Tokat Area to match image reference roughly)
    const baseCenter = useMemo<[number, number]>(() => [36.545, 40.320], []); // Tokat center approx

    const mockMarkers = useMemo(() => [
        // Schools
        { id: 'school1', position: [baseCenter[0] + 0.015, baseCenter[1] + 0.012] as [number, number], title: 'Cumhuriyet İlkokulu', type: 'stop' as const },
        { id: 'school2', position: [baseCenter[0] - 0.012, baseCenter[1] - 0.008] as [number, number], title: 'Atatürk Lisesi', type: 'stop' as const },

        // Students - Original
        { id: 's1', position: [baseCenter[0] + 0.005, baseCenter[1] + 0.020] as [number, number], title: 'Ahmet Yılmaz', type: 'student_home' as const },
        { id: 's2', position: [baseCenter[0] + 0.008, baseCenter[1] + 0.015] as [number, number], title: 'Zeynep Kaya', type: 'student_home' as const },
        { id: 's3', position: [baseCenter[0] + 0.012, baseCenter[1] + 0.010] as [number, number], title: 'Mehmet Demir', type: 'student_home' as const },
        { id: 's4', position: [baseCenter[0] - 0.020, baseCenter[1] + 0.005] as [number, number], title: 'Elif Şahin', type: 'student_home' as const },
        { id: 's5', position: [baseCenter[0] - 0.015, baseCenter[1] + 0.002] as [number, number], title: 'Can Özkan', type: 'student_home' as const },
        { id: 's6', position: [baseCenter[0] - 0.010, baseCenter[1] - 0.002] as [number, number], title: 'Ayşe Yıldız', type: 'student_home' as const },
        { id: 's7', position: [baseCenter[0] + 0.010, baseCenter[1] - 0.015] as [number, number], title: 'Murat Aydın', type: 'student_home' as const },
        { id: 's8', position: [baseCenter[0] + 0.005, baseCenter[1] - 0.010] as [number, number], title: 'Selin Bulut', type: 'student_home' as const },
        { id: 's9', position: [baseCenter[0] + 0.002, baseCenter[1] - 0.005] as [number, number], title: 'Burak Deniz', type: 'student_home' as const },

        // Additional Students (Randomized in Tokat area)
        { id: 's10', position: [baseCenter[0] - 0.008, baseCenter[1] + 0.012] as [number, number], title: 'Fatma Aksoy', type: 'student_home' as const },
        { id: 's11', position: [baseCenter[0] + 0.018, baseCenter[1] - 0.005] as [number, number], title: 'Emre Çelik', type: 'student_home' as const },
        { id: 's12', position: [baseCenter[0] - 0.005, baseCenter[1] - 0.015] as [number, number], title: 'Gizem Koç', type: 'student_home' as const },
        { id: 's13', position: [baseCenter[0] + 0.022, baseCenter[1] + 0.005] as [number, number], title: 'Hakan Tekin', type: 'student_home' as const },
        { id: 's14', position: [baseCenter[0] - 0.012, baseCenter[1] + 0.018] as [number, number], title: 'Merve Arslan', type: 'student_home' as const },
        { id: 's15', position: [baseCenter[0] + 0.005, baseCenter[1] + 0.025] as [number, number], title: 'Oğuzhan Kılıç', type: 'student_home' as const },
        { id: 's16', position: [baseCenter[0] - 0.018, baseCenter[1] - 0.002] as [number, number], title: 'Büşra Çetin', type: 'student_home' as const },
        { id: 's17', position: [baseCenter[0] + 0.012, baseCenter[1] - 0.018] as [number, number], title: 'Deniz Erdem', type: 'student_home' as const },

        // Active Vehicles
        { id: 'v1', position: [baseCenter[0] + 0.010, baseCenter[1] + 0.013] as [number, number], title: '34 ABC 123', type: 'vehicle' as const },
        { id: 'v2', position: [baseCenter[0] - 0.012, baseCenter[1] + 0.001] as [number, number], title: '34 DEF 456', type: 'vehicle' as const },
    ], [baseCenter]);

    // Random Info Map for Hover
    const studentInfo = useMemo(() => ({
        's1': { school: 'Cumhuriyet İlkokulu', grade: '3-A', distance: '1.2 km', pickUp: '07:45' },
        's2': { school: 'Cumhuriyet İlkokulu', grade: '2-B', distance: '0.8 km', pickUp: '07:55' },
        's3': { school: 'Cumhuriyet İlkokulu', grade: '4-C', distance: '1.5 km', pickUp: '07:35' },
        's4': { school: 'Atatürk Lisesi', grade: '9-A', distance: '2.1 km', pickUp: '07:15' },
        's5': { school: 'Atatürk Lisesi', grade: '10-B', distance: '1.8 km', pickUp: '07:25' },
        's6': { school: 'Atatürk Lisesi', grade: '11-C', distance: '1.4 km', pickUp: '07:30' },
        's7': { school: 'Atatürk Lisesi', grade: '12-A', distance: '2.5 km', pickUp: '07:05' },
        's8': { school: 'Cumhuriyet İlkokulu', grade: '1-A', distance: '0.5 km', pickUp: '08:05' },
        's9': { school: 'Cumhuriyet İlkokulu', grade: '4-B', distance: '0.9 km', pickUp: '07:50' },
        's10': { school: 'Cumhuriyet İlkokulu', grade: '3-B', distance: '1.1 km', pickUp: '07:42' },
        's11': { school: 'Atatürk Lisesi', grade: '9-C', distance: '2.3 km', pickUp: '07:12' },
        's12': { school: 'Cumhuriyet İlkokulu', grade: '2-A', distance: '1.6 km', pickUp: '07:32' },
        's13': { school: 'Atatürk Lisesi', grade: '10-A', distance: '1.9 km', pickUp: '07:22' },
        's14': { school: 'Cumhuriyet İlkokulu', grade: '4-A', distance: '1.4 km', pickUp: '07:38' },
        's15': { school: 'Atatürk Lisesi', grade: '11-B', distance: '2.0 km', pickUp: '07:18' },
        's16': { school: 'Cumhuriyet İlkokulu', grade: '2-C', distance: '1.3 km', pickUp: '07:40' },
        's17': { school: 'Atatürk Lisesi', grade: '12-C', distance: '2.6 km', pickUp: '07:02' },
    } as Record<string, any>), []);

    const colorfulMockRoutes = useMemo(() => ({
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: { color: '#8b5cf6', id: 'route1' }, // Purple
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [baseCenter[0] + 0.005, baseCenter[1] + 0.020],
                        [baseCenter[0] + 0.008, baseCenter[1] + 0.015],
                        [baseCenter[0] + 0.010, baseCenter[1] + 0.013],
                        [baseCenter[0] + 0.012, baseCenter[1] + 0.010],
                        [baseCenter[0] + 0.015, baseCenter[1] + 0.012]
                    ]
                }
            },
            {
                type: 'Feature',
                properties: { color: '#ef4444', id: 'route2' }, // Red
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [baseCenter[0] - 0.020, baseCenter[1] + 0.005],
                        [baseCenter[0] - 0.015, baseCenter[1] + 0.002],
                        [baseCenter[0] - 0.012, baseCenter[1] + 0.001],
                        [baseCenter[0] - 0.010, baseCenter[1] - 0.002],
                        [baseCenter[0] - 0.012, baseCenter[1] - 0.008]
                    ]
                }
            },
            {
                type: 'Feature',
                properties: { color: '#10b981', id: 'route3' }, // Green
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [baseCenter[0] + 0.010, baseCenter[1] - 0.015],
                        [baseCenter[0] + 0.005, baseCenter[1] - 0.010],
                        [baseCenter[0] + 0.002, baseCenter[1] - 0.005],
                        [baseCenter[0], baseCenter[1]],
                        [baseCenter[0] - 0.012, baseCenter[1] - 0.008]
                    ]
                }
            }
        ]
    }), [baseCenter]);

    // Fetch road-snapped coords for mock routes on mount
    useEffect(() => {
        const fetchAllMockRoutes = async () => {
            const routesToFetch = [
                { id: 'route1', points: colorfulMockRoutes.features[0].geometry.coordinates as [number, number][] },
                { id: 'route2', points: colorfulMockRoutes.features[1].geometry.coordinates as [number, number][] },
                { id: 'route3', points: colorfulMockRoutes.features[2].geometry.coordinates as [number, number][] },
            ];

            const newSnapped: Record<string, [number, number][]> = {};

            for (const route of routesToFetch) {
                try {
                    const result = await fetchRoute(route.points);
                    if (result) {
                        newSnapped[route.id] = result.coordinates;
                    }
                } catch (err) {
                    console.error(`Failed to fetch mock route ${route.id}:`, err);
                }
            }

            setSnappedRoutes(newSnapped);
        };

        fetchAllMockRoutes();
    }, [colorfulMockRoutes]);

    const finalColorfulRoutes = useMemo(() => {
        return {
            ...colorfulMockRoutes,
            features: colorfulMockRoutes.features.map(f => ({
                ...f,
                geometry: {
                    ...f.geometry,
                    coordinates: snappedRoutes[f.properties.id] || f.geometry.coordinates
                }
            }))
        };
    }, [colorfulMockRoutes, snappedRoutes]);

    // Combine static mock markers with user-created temporary markers (pins)
    const allMarkers = useMemo(() => {
        const tempMarkers = tempRouteCoords.map((coord, index) => ({
            id: `temp-${index}`,
            position: coord,
            title: `Durak ${index + 1}`,
            type: 'stop' as const
        }));
        return [...mockMarkers, ...tempMarkers];
    }, [mockMarkers, tempRouteCoords]);

    // Derived User Route (Now using road-snapped coords!)
    const userRouteGeoJson = roadSnappedCoords.length > 1 ? {
        type: 'Feature',
        properties: { isHighlighted: true },
        geometry: {
            type: 'LineString',
            coordinates: roadSnappedCoords
        }
    } : (tempRouteCoords.length > 1 ? {
        // Fallback to straight lines while fetching or if fetch fails
        type: 'Feature',
        properties: { isHighlighted: true },
        geometry: {
            type: 'LineString',
            coordinates: tempRouteCoords
        }
    } : null);

    // Handlers for interactive routing
    const updateRoute = async (points: [number, number][]) => {
        if (points.length < 2) {
            setRoadSnappedCoords([]);
            return;
        }
        setIsRouting(true);
        try {
            const result = await fetchRoute(points);
            if (result) {
                setRoadSnappedCoords(result.coordinates);
            }
        } catch (error) {
            console.error("Demo Routing Error:", error);
        } finally {
            setIsRouting(false);
        }
    };

    const handleMapClick = async (lng: number, lat: number) => {
        const newPoints: [number, number][] = [...tempRouteCoords, [lng, lat]];
        setTempRouteCoords(newPoints);
        await updateRoute(newPoints);
    };

    const handleMarkerClick = async (id: string | number) => {
        const marker = mockMarkers.find(m => m.id === id);
        if (marker) {
            const newPoints: [number, number][] = [...tempRouteCoords, marker.position as [number, number]];
            setTempRouteCoords(newPoints);
            await updateRoute(newPoints);
        }
    };

    const resetDemoRoute = () => {
        setTempRouteCoords([]);
        setRoadSnappedCoords([]);
    };

    return (
        <div className="relative bg-gradient-to-br from-slate-900 via-primary to-slate-900 min-h-screen flex items-center pt-20 overflow-hidden">
            {/* Background Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

            {/* Abstract Shapes */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl opacity-20"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                    {/* Left Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="space-y-6 md:space-y-8 pb-12 lg:pb-0"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-blue-200 text-xs font-semibold tracking-wide uppercase">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                            Yeni Nesil Servis Yönetimi
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
                            Servis Taşımacılığında <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                                Dijital Dönüşüm
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-300 max-w-lg leading-relaxed">
                            Öğrenci ve personel taşımacılığını yapay zeka destekli rotalar, canlı takip ve akıllı bildirimlerle yönetin. Kağıt işlerini unutun.
                        </p>

                        <div className="hidden md:flex flex-col sm:flex-row gap-4">
                            <Link to="/register">
                                <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-secondary text-white font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:bg-blue-600 transition-all duration-300 flex items-center justify-center gap-2 group">
                                    Hemen Başla
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </Link>
                        </div>

                        <div className="pt-8 grid grid-cols-2 gap-4 border-t border-white/10">
                            {['Canlı Araç Takibi', 'Otomatik Rotalama', 'Veli Uygulaması', 'Fatura Yönetimi'].map((item) => (
                                <div key={item} className="flex items-center gap-2 text-slate-300 text-sm">
                                    <CheckCircle2 size={16} className="text-secondary" />
                                    {item}
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right Content - Map Visualization */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative h-[600px] hidden lg:block"
                    >
                        {/* Map Container Frame */}
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-2 border border-slate-700 shadow-2xl skew-y-3 transform hover:skew-y-0 transition-transform duration-700 ease-out">
                            <div className="absolute inset-0 rounded-3xl overflow-hidden opacity-90">
                                <MapScene
                                    className="h-full w-full"
                                    routeGeoJson={userRouteGeoJson}
                                    colorfulRoutesGeoJson={finalColorfulRoutes}
                                    markers={allMarkers}
                                    center={baseCenter}
                                    zoom={12.5}
                                    hideControls={true}
                                    onMapClick={handleMapClick}
                                    onMarkerClick={handleMarkerClick}
                                    onMarkerHover={setHoveredMarkerId}
                                    autoCenter={false}
                                />
                            </div>

                            {/* Hover Info Box (Bottom Left of Map) */}
                            <div className="absolute bottom-6 left-6 z-30 pointer-events-none">
                                {hoveredMarkerId && studentInfo[hoveredMarkerId as string] && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl w-64 text-white"
                                    >
                                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">
                                                {mockMarkers.find(m => m.id === hoveredMarkerId)?.title.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm leading-tight">{mockMarkers.find(m => m.id === hoveredMarkerId)?.title}</h4>
                                                <p className="text-[10px] text-blue-400 font-medium uppercase tracking-wider">{studentInfo[hoveredMarkerId as string].school}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                                                <span className="text-[9px] text-slate-400 block uppercase mb-0.5">Sınıf</span>
                                                <span className="text-xs font-bold">{studentInfo[hoveredMarkerId as string].grade}</span>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                                                <span className="text-[9px] text-slate-400 block uppercase mb-0.5">Mesafe</span>
                                                <span className="text-xs font-bold text-blue-400">{studentInfo[hoveredMarkerId as string].distance}</span>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-2 border border-white/5 col-span-2">
                                                <span className="text-[9px] text-slate-400 block uppercase mb-0.5">Tahmini Alınış</span>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold">{studentInfo[hoveredMarkerId as string].pickUp}</span>
                                                    <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Zamanında</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Demo Info Overlay */}
                            <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
                                <motion.div
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="bg-white/90 backdrop-blur-md rounded-xl p-3 shadow-lg border border-slate-200 text-xs font-semibold text-slate-700"
                                >
                                    <p>✨ Haritaya veya duraklara tıklayarak <br /> kendi rotanı oluşturabilirsin!</p>
                                </motion.div>

                                {tempRouteCoords.length > 0 && (
                                    <motion.button
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        onClick={resetDemoRoute}
                                        disabled={isRouting}
                                        className={`rounded-full p-2 shadow-lg flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold transition-all ${isRouting ? 'bg-slate-500 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'} text-white`}
                                    >
                                        {isRouting ? (
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <RotateCcw size={14} />
                                        )}
                                        {isRouting ? 'Hesaplanıyor...' : 'Temizle'}
                                    </motion.button>
                                )}
                            </div>

                            {/* Floating Cards Over Map */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1, duration: 0.5 }}
                                className="absolute top-8 left-8 bg-white/95 backdrop-blur rounded-xl p-4 shadow-xl border border-slate-100 max-w-xs"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <Rocket size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">34 ABC 123</h4>
                                        <p className="text-xs text-green-600 font-medium">Rotada • Zamanında</p>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-3/4"></div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1.2, duration: 0.5 }}
                                className="absolute bottom-8 right-8 bg-white/95 backdrop-blur rounded-xl p-4 shadow-xl border border-slate-100"
                            >
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Toplam Öğrenci</p>
                                    <p className="text-3xl font-bold text-slate-800">1,248</p>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Hero;
