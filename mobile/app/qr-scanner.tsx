import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import tw from 'twrnc';

export default function QrScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const router = useRouter();
    const { loginWithToken, linkStudent, parentPhone } = useAuth();

    if (!permission) {
        return <View style={tw`flex-1 bg-black`} />;
    }

    if (!permission.granted) {
        return (
            <View style={tw`flex-1 bg-slate-900 justify-center items-center p-6`}>
                <Feather name="camera-off" size={64} color="#64748b" style={tw`mb-4`} />
                <Text style={tw`text-white text-center text-lg mb-6`}>
                    Kamerayı kullanabilmek için izin vermeniz gerekiyor.
                </Text>
                <TouchableOpacity
                    onPress={requestPermission}
                    style={tw`bg-blue-600 px-6 py-3 rounded-xl`}
                >
                    <Text style={tw`text-white font-bold text-base`}>Kameraya İzin Ver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={tw`mt-4 px-6 py-3 rounded-xl`}
                >
                    <Text style={tw`text-slate-400 font-medium text-base`}>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
        setScanned(true);

        try {
            // Data could be a simple token "xyz-abc" or a full URL like "servisbot://login?token=abc-123..."
            let token = data;

            if (data.includes('token=')) {
                // Parse URL
                const url = new URL(data);
                const urlParams = new URLSearchParams(url.search);
                token = urlParams.get('token') || data;
            }

            console.log('Scanned QR code data:', token);

            if (parentPhone) {
                // Link mode
                const result = await linkStudent(token);
                if (result.success) {
                    Alert.alert('Başarılı', result.message || 'Öğrenci başarıyla eklendi.', [
                        { text: 'Tamam', onPress: () => router.replace('/(app)/parent') }
                    ]);
                } else {
                    Alert.alert('Hata', result.message || 'İşlem yapılamadı.', [
                        { text: 'Tamam', onPress: () => setScanned(false) }
                    ]);
                }
            } else {
                // Login mode
                const result = await loginWithToken(token);

                if (result.success) {
                    // Determine destination based on auth context returning the role
                    const targetRoute = result.role === 'parent' ? '/(app)/parent' : '/(app)/driver';
                    Alert.alert('Giriş Başarılı', 'Hoş geldiniz!', [
                        { text: 'Devam Et', onPress: () => router.replace(targetRoute as any) }
                    ]);
                } else {
                    Alert.alert('Hata', result.message || 'Geçersiz QR Kod.', [
                        { text: 'Tamam', onPress: () => setScanned(false) } // Allow scanning again
                    ]);
                }
            }
        } catch (error) {
            console.error('QR scan processing error:', error);
            Alert.alert('Hata', 'Karekod okunamadı.', [
                { text: 'Tamam', onPress: () => setScanned(false) }
            ]);
        }
    };

    return (
        <View style={tw`flex-1 bg-black`}>
            <CameraView
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
                style={StyleSheet.absoluteFillObject}
            >
                {/* Overlay for Scanner */}
                <View style={tw`flex-1 bg-black/50 justify-center items-center`}>
                    <View style={tw`w-full flex-row justify-between items-center absolute top-12 px-6 z-10`}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={tw`w-12 h-12 bg-white/10 rounded-full items-center justify-center backdrop-blur-md`}
                        >
                            <Feather name="x" size={24} color="#ffffff" />
                        </TouchableOpacity>
                        <Text style={tw`text-white font-semibold text-lg`}>QR Kodu Tarayın</Text>
                        <View style={tw`w-12 h-12`} />
                    </View>

                    {/* Scanner Frame */}
                    <View style={tw`w-64 h-64 border-2 border-white/20 rounded-3xl overflow-hidden`}>
                        <View style={tw`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white`} />
                        <View style={tw`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white`} />
                        <View style={tw`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white`} />
                        <View style={tw`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white`} />
                        {/* Clear center */}
                        <View style={tw`flex-1 bg-transparent`} />
                    </View>

                    <Text style={tw`text-white mt-8 text-center text-sm px-10 opacity-80`}>
                        Giriş yapmak için yöneticinizin size verdiği QR kodu çerçevenin içine yerleştirin.
                    </Text>
                </View>
            </CameraView>
        </View>
    );
}
