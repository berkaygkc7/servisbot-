import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import "../global.css";

SplashScreen.preventAutoHideAsync();

import { AuthProvider } from '../src/context/AuthContext';
import { CustomAlertProvider } from '../src/components/ui/CustomAlert';

export default function RootLayout() {
    const [loaded, error] = useFonts({
        // Add custom fonts here if needed
    });

    useEffect(() => {
        if (loaded || error) {
            SplashScreen.hideAsync();
        }
    }, [loaded, error]);

    if (!loaded && !error) {
        return null;
    }

    return (
        <AuthProvider>
            <CustomAlertProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="driver-login" options={{ headerShown: false }} />
                    <Stack.Screen name="(app)" options={{ headerShown: false }} />
                </Stack>
            </CustomAlertProvider>
        </AuthProvider>
    );
}
