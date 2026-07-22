import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import tw from 'twrnc';
import { useState } from 'react';

export default function LinkLoginScreen() {
    const router = useRouter();
    const { loginWithToken } = useAuth();
    const [linkInput, setLinkInput] = useState('');
    const [loading, setLoading] = useState(false);

    const extractToken = (input: string): string | null => {
        const trimmed = input.trim();

        // Try deep link: servisbot://login?token=<uuid>&type=...
        const deepLinkMatch = trimmed.match(/[?&]token=([0-9a-f-]{36})/i);
        if (deepLinkMatch) return deepLinkMatch[1];

        // Try raw UUID
        const uuidMatch = trimmed.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        if (uuidMatch) return trimmed;

        return null;
    };

    const handleLogin = async () => {
        const token = extractToken(linkInput);
        if (!token) {
            Alert.alert('Geçersiz Giriş', 'Lütfen geçerli bir giriş linki veya kod girin.\n\nÖrnek:\nservisbot://login?token=...');
            return;
        }

        setLoading(true);
        try {
            const result = await loginWithToken(token);
            if (result.success) {
                const targetRoute = result.role === 'parent' ? '/(app)/parent' : '/(app)/driver';
                router.replace(targetRoute as any);
            } else {
                Alert.alert('Giriş Başarısız', result.message || 'Geçersiz veya süresi dolmuş giriş linki.');
            }
        } catch (err) {
            Alert.alert('Hata', 'Beklenmeyen bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={tw`flex-1`}
            >
                <ScrollView contentContainerStyle={tw`flex-1 p-6 justify-center`} keyboardShouldPersistTaps="handled">

                    {/* Back button */}
                    <TouchableOpacity onPress={() => router.back()} style={tw`absolute top-0 left-0 p-2`}>
                        <Feather name="arrow-left" size={22} color="#64748b" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={tw`items-center mb-10`}>
                        <View style={tw`w-20 h-20 bg-blue-600 rounded-3xl items-center justify-center mb-5 shadow-lg`}>
                            <Feather name="link" size={38} color="white" />
                        </View>
                        <Text style={tw`text-2xl font-black text-slate-800`}>Link ile Giriş</Text>
                        <Text style={tw`text-slate-500 mt-2 text-center text-sm leading-relaxed px-4`}>
                            Yöneticiniz tarafından gönderilen giriş linkini veya kodu aşağıya yapıştırın.
                        </Text>
                    </View>

                    {/* Input */}
                    <View style={tw`bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 mb-4 min-h-[100px]`}>
                        <TextInput
                            style={[tw`text-slate-800 text-sm leading-relaxed flex-1`, { minHeight: 80 }]}
                            placeholder={'servisbot://login?token=...\n\nveya sadece UUID\'yi yapıştırın'}
                            placeholderTextColor="#94a3b8"
                            value={linkInput}
                            onChangeText={setLinkInput}
                            multiline
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                        />
                    </View>

                    {/* Clear button */}
                    {linkInput.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setLinkInput('')}
                            style={tw`self-end mb-4 flex-row items-center gap-1`}
                        >
                            <Feather name="x-circle" size={14} color="#94a3b8" />
                            <Text style={tw`text-slate-400 text-xs`}>Temizle</Text>
                        </TouchableOpacity>
                    )}

                    {/* Submit */}
                    <TouchableOpacity
                        onPress={handleLogin}
                        disabled={loading || linkInput.trim().length === 0}
                        style={tw`bg-blue-600 h-14 rounded-2xl items-center justify-center shadow-lg ${(loading || linkInput.trim().length === 0) ? 'opacity-50' : ''}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <View style={tw`flex-row items-center gap-2`}>
                                <Feather name="log-in" size={18} color="white" />
                                <Text style={tw`text-white font-bold text-base`}>Giriş Yap</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <Text style={tw`text-slate-400 text-xs text-center mt-6 px-4 leading-relaxed`}>
                        Giriş linki yönetici panelinde{'\n'}Sürücüler veya Öğrenciler bölümünden oluşturulabilir.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
