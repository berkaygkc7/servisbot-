import { Stack } from 'expo-router';

export default function AppLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="parent/index" />
            <Stack.Screen name="driver/index" />
        </Stack>
    );
}
