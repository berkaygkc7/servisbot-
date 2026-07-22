/**
 * Push Notification Service
 *
 * NOTE: expo-notifications remote push is NOT supported in Expo Go (SDK 53+).
 * All functions below safely no-op when running in Expo Go.
 * Use `npx expo run:android` (development build) to test push notifications.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

export async function registerForPushNotifications(): Promise<string | null> {
    if (isExpoGo) {
        console.info('[Notifications] Expo Go - Kayit atlandi.');
        return null;
    }

    try {
        const Device = await import('expo-device');
        const DeviceModule = Device.default ?? Device;
        
        const Notifications = await import('expo-notifications');
        const NotificationsModule = Notifications.default ?? Notifications;

        NotificationsModule.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });

        const isDevice = DeviceModule.isDevice;

        if (!isDevice) {
            console.warn('[Notifications] Fiziksel cihaz gerekli.');
            return null;
        }

        if (Platform.OS === 'android') {
            await NotificationsModule.setNotificationChannelAsync('default', {
                name: 'ServisBot',
                importance: NotificationsModule.AndroidImportance?.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#3b82f6',
            });
        }

        const { status: existingStatus } = await NotificationsModule.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await NotificationsModule.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('[Notifications] Izin reddedildi.');
            return null;
        }

        const tokenData = await NotificationsModule.getExpoPushTokenAsync({
            projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        });

        console.log('[Notifications] Token alindi:', tokenData.data);
        return tokenData.data;
    } catch (e) {
        console.warn('[Notifications] Kayit hatasi:', e);
        return null;
    }
}

export async function savePushToken(studentId: string, token: string): Promise<void> {
    if (isExpoGo) return;
    try {
        const platform = Platform.OS as 'ios' | 'android';
        console.log(`[Notifications] Token kaydediliyor: Student=${studentId}, Token=${token}`);
        
        const { error } = await supabase.rpc('save_push_token', {
            p_student_id: studentId,
            p_token: token,
            p_platform: platform,
        });

        if (error) {
            console.error('[Notifications] Supabase Hatasi:', error.message);
        } else {
            console.log('[Notifications] Token Supabase\'e kaydedildi! 🎉');
        }
    } catch (e) {
        console.error('[Notifications] savePushToken Beklenmedik Hata:', e);
    }
}

export async function notifyStudentBoarded(studentId: string): Promise<void> {
    await supabase.rpc('notify_student_boarded', { p_student_id: studentId });
}

export async function notifyStudentAlighted(studentId: string): Promise<void> {
    await supabase.rpc('notify_student_alighted', { p_student_id: studentId });
}

export async function notifyRouteStarted(routeId: string): Promise<void> {
    await supabase.rpc('notify_route_started', { p_route_id: routeId });
}
