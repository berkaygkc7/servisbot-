import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

// Minimum distance (in meters) to trigger an update
const UPDATE_DISTANCE = 10;
// Minimum time (in milliseconds) between updates
const UPDATE_INTERVAL = 5000;

class LocationService {
    private subscriber: Location.LocationSubscription | null = null;
    private currentVehicleId: string | null = null;

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

    stopTracking(): void {
        if (this.subscriber) {
            this.subscriber.remove();
            this.subscriber = null;
            this.currentVehicleId = null;
            console.log('Location tracking stopped');
        }
    }

    private handleLocationUpdate = async (location: Location.LocationObject, onUpdate?: (loc: Location.LocationObject, status?: string) => void) => {
        if (!this.currentVehicleId) {
            if (onUpdate) onUpdate(location, 'Hata: Araç ID yok');
            return;
        }

        const { latitude, longitude } = location.coords;
        if (onUpdate) onUpdate(location, 'Gönderiliyor...');

        try {
            // First update DB via secure RPC
            const { error } = await supabase.rpc('update_driver_location', {
                p_vehicle_id: this.currentVehicleId,
                p_latitude: latitude,
                p_longitude: longitude
            });

            if (error) {
                console.error('LocationService: Error updating vehicle location (RPC):', error);
                if (onUpdate) onUpdate(location, `Hata (DB): ${error.message}`);
            } else {
                // Secondary fallback broadcast for parent apps actively listening without full Realtime Auth
                await supabase.channel(`public:vehicles:${this.currentVehicleId}`)
                    .send({
                        type: 'broadcast',
                        event: 'location_update',
                        payload: { latitude, longitude }
                    });

                if (onUpdate) onUpdate(location, `Canlı: ${new Date().toLocaleTimeString()}`);
            }
        } catch (error: any) {
            console.error('LocationService: Exception in handleLocationUpdate:', error);
            if (onUpdate) onUpdate(location, `İstisna: ${error.message}`);
        }
    };
}

export const locationService = new LocationService();
