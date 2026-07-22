import { View, Text, TouchableOpacity, Alert, Dimensions, Platform, ScrollView, Animated, PanResponder, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapLibreGL from '@maplibre/maplibre-react-native';
import tw from 'twrnc';
import { useState, useEffect, useRef } from 'react';
import { Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { showCustomAlert } from '../../../src/components/ui/CustomAlert';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { registerForPushNotifications, savePushToken } from '../../../src/services/notifications';

// MapTiler Configuration
const MAPTILER_KEY = '0cfp1iqfMwRC8dMGQxNg';
const STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

MapLibreGL.setAccessToken(MAPTILER_KEY);

const { width, height } = Dimensions.get('window');

const DEFAULT_LOCATION: [number, number] = [28.9784, 41.0082]; // [lng, lat]

export default function ParentDashboard() {
    const router = useRouter();
    const { studentId: initialStudentId, vehicleId: initialVehicleId, parentPhone } = useAuth();
    const [busLocation, setBusLocation] = useState<[number, number] | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [vehicle, setVehicle] = useState<any>(null);
    const mapRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);

    // Register push notification token when student is known
    useEffect(() => {
        if (!initialStudentId) return;
        (async () => {
            try {
                const token = await registerForPushNotifications();
                if (token) await savePushToken(initialStudentId, token);
            } catch (e) {
                console.warn('Push token registration failed:', e);
            }
        })();
    }, [initialStudentId]);

    useEffect(() => {
        if (parentPhone) {
            fetchAllStudents();

            // Öğrenci bilgilerindeki değişiklikleri canlı takip et (Atama vb.)
            const studentChannel = supabase
                .channel(`public:students:parent:${parentPhone}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'students', filter: `parent_phone=eq.${parentPhone}` },
                    (payload) => {
                        console.log('Öğrenci bilgisi güncellendi:', payload.new);
                        // Tüm listeyi yenile
                        fetchAllStudents();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(studentChannel);
            };
        }
    }, [parentPhone]);

    useEffect(() => {
        if (selectedStudent) {
            fetchVehicleDetails(selectedStudent.vehicle_id);
            // Real-time Subscription via Broadcast
            const channel = supabase
                .channel(`public:vehicles:${selectedStudent.vehicle_id}`)
                .on(
                    'broadcast',
                    { event: 'location_update' },
                    (payload) => {
                        console.log('Konum güncellendi (Broadcast):', payload.payload);
                        if (payload.payload) {
                            setBusLocation([payload.payload.longitude, payload.payload.latitude]);
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [selectedStudent]);

    const fetchAllStudents = async () => {
        try {
            const { data, error } = await supabase.rpc('get_parent_students', {
                p_phone: parentPhone
            });

            if (error) throw error;

            if (data && data.length > 0) {
                setStudents(data);
                // İlk öğrenciyi seç
                const current = data.find((s: any) => s.id === initialStudentId) || data[0];
                setSelectedStudent(current);
                
                // Haritayı öğrenci evine odakla
                if (current.home_latitude && current.home_longitude && cameraRef.current) {
                    cameraRef.current.setCamera({
                        centerCoordinate: [current.home_longitude, current.home_latitude],
                        zoomLevel: 14,
                        animationDuration: 1000
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            showCustomAlert('Hata', 'Öğrenci listesi alınamadı.', undefined, 'error');
        }
    };

    const fetchVehicleDetails = async (vId: string) => {
        if (!vId) {
            setVehicle(null);
            setBusLocation(null);
            return;
        }

        const { data, error } = await supabase.rpc('get_parent_vehicle_data', {
            p_vehicle_id: vId
        });

        if (data) {
            setVehicle(data);
            if (data.current_latitude && data.current_longitude) {
                setBusLocation([data.current_longitude, data.current_latitude]);
            }
        } else {
            console.error('Araç verisi çekilemedi:', error);
            setVehicle(null);
            setBusLocation(null);
        }
    };

    // Ev Konumu Belirleme (Haritaya uzun basınca)
    const handleSetHomeLocation = async (feature: any) => {
        const [longitude, latitude] = feature.geometry.coordinates;

        showCustomAlert(
            'Ev Konumu',
            'Burayı ev konumu olarak kaydetmek istiyor musunuz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Kaydet',
                    onPress: async () => {
                        const { error } = await supabase
                            .from('students')
                            .update({ home_latitude: latitude, home_longitude: longitude })
                            .eq('id', selectedStudent.id);

                        if (!error) {
                            showCustomAlert('Başarılı', 'Ev konumu güncellendi.', undefined, 'success');
                            fetchAllStudents();
                        } else {
                            showCustomAlert('Hata', 'Konum kaydedilemedi.', undefined, 'error');
                        }
                    }
                }
            ],
            'info'
        );
    };

    const getLocalDateString = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const adjusted = new Date(date.getTime() - (offset * 60 * 1000));
        return adjusted.toISOString().split('T')[0];
    };

    const todayDate = getLocalDateString(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = getLocalDateString(tomorrow);

    const absentDates: string[] = selectedStudent?.absent_dates || [];
    const isAbsentToday = absentDates.includes(todayDate);
    const isAbsentTomorrow = absentDates.includes(tomorrowDate);

    const handleToggleAbsence = async (dateStr: string, isCurrentlyAbsent: boolean) => {
        const originalDates = [...absentDates];
        let newDates = [];

        if (isCurrentlyAbsent) {
            newDates = originalDates.filter(d => d !== dateStr);
        } else {
            newDates = [...originalDates, dateStr];
        }

        setSelectedStudent((prev: any) => ({ ...prev, absent_dates: newDates }));

        const { error } = await supabase.rpc('update_student_absent_dates', {
            p_student_id: selectedStudent.id,
            p_absent_dates: newDates
        });

        if (error) {
            setSelectedStudent((prev: any) => ({ ...prev, absent_dates: originalDates }));
            showCustomAlert('Hata', `İşlem sırasında bir hata oluştu: ${error.message}`, undefined, 'error');
        } else {
            const dayText = dateStr === todayDate ? 'Bugün' : 'Yarın';
            const actionText = isCurrentlyAbsent ? 'servise binecek' : 'servise binmeyecek';
            showCustomAlert('Durum Güncellendi', `Öğrenci ${dayText} ${actionText} olarak işaretlendi.`, undefined, 'success');
        }
    };

    const confirmAbsenceToggle = (dateStr: string, isCurrentlyAbsent: boolean) => {
        const dayText = dateStr === todayDate ? 'Bugün' : 'Yarın';
        const actionText = isCurrentlyAbsent ? 'Binilecek İşaretle' : 'Gelmeyecek İşaretle';

        showCustomAlert(
            `${dayText} Durum Değişikliği`,
            `Öğrencinin ${dayText} için servis durumunu güncellemek istiyor musunuz?`,
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: actionText,
                    style: isCurrentlyAbsent ? 'default' : 'destructive',
                    onPress: () => handleToggleAbsence(dateStr, isCurrentlyAbsent)
                }
            ],
            'warning'
        );
    };

    return (
        <View style={tw`flex-1 bg-white`}>
            <MapLibreGL.MapView
                ref={mapRef}
                style={tw`flex-1`}
                mapStyle={STYLE_URL}
                onLongPress={handleSetHomeLocation}
                logoEnabled={false}
                attributionEnabled={false}
            >
                <MapLibreGL.Camera
                    ref={cameraRef}
                    defaultSettings={{
                        centerCoordinate: DEFAULT_LOCATION,
                        zoomLevel: 13,
                    }}
                />

                {/* Student Home Marker */}
                {selectedStudent?.home_latitude && (
                    <MapLibreGL.PointAnnotation
                        id="homeMarker"
                        coordinate={[selectedStudent.home_longitude, selectedStudent.home_latitude]}
                        title="Ev"
                    >
                        <View style={tw`bg-white p-2 rounded-full border-2 border-blue-500 shadow-md`}>
                            <Feather name="home" size={18} color="#3b82f6" />
                        </View>
                    </MapLibreGL.PointAnnotation>
                )}

                {/* Bus Location Marker */}
                {busLocation && (
                    <MapLibreGL.PointAnnotation
                        id="busMarker"
                        coordinate={busLocation}
                        title="Servis"
                    >
                        <View style={tw`bg-white p-2 rounded-full border-2 border-emerald-500 shadow-md`}>
                            <Feather name="truck" size={18} color="#10b981" />
                        </View>
                    </MapLibreGL.PointAnnotation>
                )}
            </MapLibreGL.MapView>


            {/* Öğrenci Seçici (Multi-Student) */}
            <View style={tw`absolute top-12 left-0 right-0 p-4 flex-row justify-center gap-3`}>
                <View style={tw`bg-white/90 p-1.5 rounded-3xl flex-row gap-1 shadow-lg backdrop-blur-md border border-white/50`}>
                    {students.map((s) => (
                        <TouchableOpacity
                            key={s.id}
                            onPress={() => setSelectedStudent(s)}
                            style={tw`px-4 py-2 rounded-2xl ${selectedStudent?.id === s.id ? 'bg-blue-600 shadow-md shadow-blue-200' : 'bg-transparent'}`}
                        >
                            <Text style={tw`font-bold ${selectedStudent?.id === s.id ? 'text-white' : 'text-slate-600'}`}>
                                {s.full_name.split(' ')[0]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    
                    {/* Yeni Öğrenci Ekle (+) */}
                    <TouchableOpacity
                        onPress={() => router.push('/qr-scanner')}
                        style={tw`px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-100 items-center justify-center`}
                    >
                        <Feather name="plus" size={18} color="#059669" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Bilgi Kartı */}
            <View style={tw`absolute bottom-10 left-4 right-4 bg-white p-4 rounded-xl shadow-lg border border-slate-100`}>
                <View style={tw`flex-row items-center justify-between mb-4`}>
                    <View style={tw`flex-row items-center gap-3`}>
                        <View style={tw`w-12 h-12 bg-blue-100 rounded-full items-center justify-center`}>
                            <Feather name="user" size={24} color="#3b82f6" />
                        </View>
                        <View>
                            <Text style={tw`font-bold text-lg text-slate-800`}>{selectedStudent?.full_name || 'Öğrenci Yükleniyor...'}</Text>
                            <Text style={tw`text-slate-500 text-sm`}>{selectedStudent?.school_level === 'primary' ? 'İlkokul' : 'Öğrenci'}</Text>
                        </View>
                    </View>
                    <View style={tw`bg-emerald-100 px-3 py-1 rounded-full`}>
                        <Text style={tw`text-emerald-700 font-medium text-xs`}>
                            {busLocation ? 'Canlı Takip' : 'Bağlantı Bekleniyor'}
                        </Text>
                    </View>
                </View>

                <View style={tw`flex-row gap-4 border-t border-slate-100 pt-4`}>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-slate-400 text-xs`}>Servis Durumu</Text>
                        <Text style={tw`font-bold text-slate-800 text-base`}>
                            {vehicle ? 'Aktif' : 'Atanmadı'}
                        </Text>
                    </View>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-slate-400 text-xs`}>Plaka</Text>
                        <Text style={tw`font-bold text-slate-800 text-base`}>
                            {vehicle?.plate_number || '--'}
                        </Text>
                    </View>
                    <View style={tw`flex-1 items-end`}>
                        <TouchableOpacity
                            onPress={() => {
                                if (vehicle?.driver_phone) {
                                    showCustomAlert('Şoförü Ara', `${vehicle.driver_name}\n${vehicle.driver_phone}`, [
                                        { text: 'Vazgeç', style: 'cancel' },
                                        { 
                                            text: 'Ara', 
                                            style: 'default',
                                            onPress: () => {
                                                Linking.openURL(`tel:${vehicle.driver_phone}`).catch(() => {
                                                    showCustomAlert('Hata', 'Desteklenmeyen cihaz veya arama başlatılamadı.', undefined, 'error');
                                                });
                                            }
                                        }
                                    ], 'info');
                                } else {
                                    showCustomAlert('Bilgi Eksik', 'Şoför telefonu araç kayıtlarında bulunmuyor.', undefined, 'warning');
                                }
                            }}
                            style={tw`bg-blue-600 w-10 h-10 rounded-full items-center justify-center`}
                        >
                            <Feather name="phone" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {!selectedStudent?.home_latitude && (
                    <View style={tw`mt-3 bg-yellow-50 p-2 rounded-lg border border-yellow-100`}>
                        <Text style={tw`text-yellow-700 text-xs text-center`}>
                            Ev konumu ayarlanmamış. Haritaya uzun basarak ev konumunu belirleyebilirsiniz.
                        </Text>
                    </View>
                )}

                {selectedStudent && (
                    <View style={tw`mt-4 pt-4 border-t border-slate-100`}>
                        <Text style={tw`text-slate-500 font-medium text-xs mb-3 uppercase tracking-wider`}>Devamsızlık Bildirimi</Text>

                        <View style={tw`flex-row gap-2`}>
                            {/* Bugün Butonu */}
                            <TouchableOpacity
                                onPress={() => confirmAbsenceToggle(todayDate, isAbsentToday)}
                                style={tw`flex-1 rounded-xl p-3 border items-center justify-center ${isAbsentToday ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}
                            >
                                <Feather name={isAbsentToday ? "x-circle" : "calendar"} size={20} color={isAbsentToday ? '#ef4444' : '#64748b'} style={tw`mb-1`} />
                                <Text style={tw`font-bold ${isAbsentToday ? 'text-red-700' : 'text-slate-700'}`}>Bugün</Text>
                                <Text style={tw`text-xs mt-0.5 font-medium ${isAbsentToday ? 'text-red-500' : 'text-slate-500'}`}>
                                    {isAbsentToday ? "Gelmeyecek" : "Yoklama Bildir"}
                                </Text>
                            </TouchableOpacity>

                            {/* Yarın Butonu */}
                            <TouchableOpacity
                                onPress={() => confirmAbsenceToggle(tomorrowDate, isAbsentTomorrow)}
                                style={tw`flex-1 rounded-xl p-3 border items-center justify-center ${isAbsentTomorrow ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}
                            >
                                <Feather name={isAbsentTomorrow ? "x-circle" : "calendar"} size={20} color={isAbsentTomorrow ? '#f97316' : '#64748b'} style={tw`mb-1`} />
                                <Text style={tw`font-bold ${isAbsentTomorrow ? 'text-orange-700' : 'text-slate-700'}`}>Yarın</Text>
                                <Text style={tw`text-xs mt-0.5 font-medium ${isAbsentTomorrow ? 'text-orange-500' : 'text-slate-500'}`}>
                                    {isAbsentTomorrow ? "Gelmeyecek" : "Yoklama Bildir"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}
