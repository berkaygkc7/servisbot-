import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../src/context/AuthContext';
import tw from 'twrnc';

export default function LoginDeepLinkScreen() {
    const { token, type } = useLocalSearchParams<{ token: string; type: string }>();
    const router = useRouter();
    const { loginWithToken } = useAuth();
    const [statusText, setStatusText] = useState('Giriş kodunuz doğrulanıyor...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setError('Geçersiz veya eksik giriş kodu.');
            return;
        }

        const verifyToken = async () => {
            try {
                const result = await loginWithToken(token);
                if (result.success) {
                    setStatusText('Giriş başarılı! Yönlendiriliyorsunuz...');
                    setTimeout(() => {
                        const targetRoute = result.role === 'parent' ? '/(app)/parent' : '/(app)/driver';
                        router.replace(targetRoute as any);
                    }, 500);
                } else {
                    setError(result.message || 'Geçersiz giriş kodu.');
                }
            } catch (err) {
                setError('Beklenmeyen bir hata oluştu.');
            }
        };

        verifyToken();
    }, [token, loginWithToken, router]);

    return (
        <View style={tw`flex-1 bg-slate-900 justify-center items-center p-6`}>
            {error ? (
                <View style={tw`bg-red-50 p-6 rounded-2xl items-center`}>
                    <Text style={tw`text-red-600 font-bold text-lg mb-2 text-center`}>Giriş Başarısız</Text>
                    <Text style={tw`text-slate-700 text-center mb-6`}>{error}</Text>
                    <Text
                        onPress={() => router.replace('/')}
                        style={tw`bg-slate-900 text-white font-bold py-3 px-6 rounded-xl overflow-hidden`}
                    >
                        Ana Sayfaya Dön
                    </Text>
                </View>
            ) : (
                <View style={tw`items-center`}>
                    <ActivityIndicator size="large" color="#3b82f6" style={tw`mb-4`} />
                    <Text style={tw`text-white text-base font-bold text-center`}>{statusText}</Text>
                    <Text style={tw`text-slate-400 mt-2 text-sm text-center`}>Lütfen bekleyin...</Text>
                </View>
            )}
        </View>
    );
}
