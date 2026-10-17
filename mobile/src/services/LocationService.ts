import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

// Minimum distance (in meters) to trigger an update
const UPDATE_DISTANCE = 10;
// Minimum time (in milliseconds) between updates
const UPDATE_INTERVAL = 5000;

class LocationService {
    private subscriber: Location.LocationSubscription | null = null;
    private currentVehicleId: string | null = null;
    private vehicleChannel: any = null;
    private globalChannel: any = null;
    private lastDbWriteTime: number = 0;
    private lastLocation: { latitude: number; longitude: number } | null = null;

    async requestPermissions(): Promise<boolean> {
        try {
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            if (foregroundStatus !== 'granted') {
                console.warn('Foreground location permission denied');
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error requesting location permissions:', error);
            return false;
        }
    }

    async startTracking(vehicleId: string, onUpdate?: (location: Location.LocationObject | null, status?: string) => void): Promise<void> {
        if (this.subscriber) {
            console.warn('Already tracking location');
            return;
        }

        this.currentVehicleId = vehicleId;
        this.lastDbWriteTime = 0;
        this.lastLocation = null;

        // Persistent Realtime Broadcast Channels
        try {
            this.vehicleChannel = supabase.channel(`public:vehicles:${vehicleId}`);
            this.vehicleChannel.subscribe();

            this.globalChannel = supabase.channel('public:vehicles');
            this.globalChannel.subscribe();
        } catch (chanErr) {
            console.warn('Realtime channel init warning:', chanErr);
        }

        try {
            const hasServicesEnabled = await Location.hasServicesEnabledAsync();
            if (!hasServicesEnabled) {
                console.warn('Location services are not enabled');
                if (onUpdate) onUpdate(null, 'Hata: Cihazın konumu (GPS) kapalı. Lütfen açın.');
                return;
            }

            const hasPermission = await this.requestPermissions();
            if (!hasPermission) {
                if (onUpdate) onUpdate(null, 'Hata: Konum izni verilmedi.');
                return;
            }

            this.subscriber = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: UPDATE_INTERVAL,
                    distanceInterval: UPDATE_DISTANCE,
                },
                (location) => {
                    this.handleLocationUpdate(location, onUpdate);
                }
            );
            console.log('Location tracking started for vehicle:', vehicleId);
        } catch (error: any) {
            console.error('Error starting location tracking:', error);
            if (onUpdate) onUpdate(null, `Hata: Konum başlatılamadı (${error.message})`);
        }
    }

    async stopTracking(): Promise<void> {
        if (this.subscriber) {
            this.subscriber.remove();
            this.subscriber = null;
        }

        // Son park konumunu kalıcı olarak DB'ye yaz
        if (this.currentVehicleId && this.lastLocation) {
            try {
                await supabase.rpc('update_driver_location', {
                    p_vehicle_id: this.currentVehicleId,
                    p_latitude: this.lastLocation.latitude,
                    p_longitude: this.lastLocation.longitude
                });
            } catch (e) {
                console.warn('Final location write error:', e);
            }
        }

        // Kanalları güvenli şekilde kapat
        if (this.vehicleChannel) {
            supabase.removeChannel(this.vehicleChannel);
            this.vehicleChannel = null;
        }

        if (this.globalChannel) {
            supabase.removeChannel(this.globalChannel);
            this.globalChannel = null;
        }

        this.currentVehicleId = null;
        this.lastDbWriteTime = 0;
        this.lastLocation = null;
        console.log('Location tracking stopped');
    }

    private handleLocationUpdate = async (location: Location.LocationObject, onUpdate?: (loc: Location.LocationObject, status?: string) => void) => {
        if (!this.currentVehicleId) {
            if (onUpdate) onUpdate(location, 'Hata: Araç ID yok');
            return;
        }

        const { latitude, longitude, heading, speed } = location.coords;
        this.lastLocation = { latitude, longitude };
        if (onUpdate) onUpdate(location, 'Gönderiliyor...');

        try {
            // 1. WebSocket Broadcast: Veli ve Web Paneline anlık ve sıfır DB maliyetiyle yayın
            const broadcastPayload = {
                vehicle_id: this.currentVehicleId,
                id: this.currentVehicleId,
                latitude,
                longitude,
                current_latitude: latitude,
                current_longitude: longitude,
                heading: heading || 0,
                speed: speed || 0,
                timestamp: location.timestamp
            };

            if (this.vehicleChannel) {
                this.vehicleChannel.send({
                    type: 'broadcast',
                    event: 'location_update',
                    payload: broadcastPayload
                }).catch(() => {});
            }

            if (this.globalChannel) {
                this.globalChannel.send({
                    type: 'broadcast',
                    event: 'location_update',
                    payload: broadcastPayload
                }).catch(() => {});
            }

            // 2. Throttled DB Write: Veritabanına her 5 sn yerine 25 sn'de bir yaz (I/O yükünü %80 azaltır)
            const now = Date.now();
            const shouldWriteToDb = !this.lastDbWriteTime || (now - this.lastDbWriteTime >= 25000);

            if (shouldWriteToDb) {
                this.lastDbWriteTime = now;
                const { error } = await supabase.rpc('update_driver_location', {
                    p_vehicle_id: this.currentVehicleId,
                    p_latitude: latitude,
                    p_longitude: longitude
                });

                if (error) {
                    console.error('LocationService: Error updating vehicle location (RPC):', error);
                    if (onUpdate) onUpdate(location, `Hata (DB): ${error.message}`);
                    return;
                }
            }

            if (onUpdate) onUpdate(location, `Canlı: ${new Date().toLocaleTimeString()}`);
        } catch (error: any) {
            console.error('LocationService: Exception in handleLocationUpdate:', error);
            if (onUpdate) onUpdate(location, `İstisna: ${error.message}`);
        }
    };
}

export const locationService = new LocationService();
