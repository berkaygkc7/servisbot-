import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import tw from 'twrnc';
import { useState } from 'react';
import { supabase } from '../src/lib/supabase';

export default function ParentLogin() {
    const router = useRouter();
    const { signIn } = useAuth();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!phone) {
            Alert.alert('Hata', 'Lütfen telefon numaranızı girin.');
            return;
        }

        setLoading(true);
        try {
            // 1. Telefon numarasına göre öğrenciyi bul
            // Not: Gerçek uygulamada SMS doğrulaması yapılır. Şimdilik birebir eşleşme.
            const { data: students, error } = await supabase
                .from('students')
                .select('id, full_name, vehicle_id')
                .eq('parent_phone', phone)
                .limit(1);

            if (error) throw error;

            if (students && students.length > 0) {
                const student = students[0];

                if (!student.vehicle_id) {
                    Alert.alert('Bilgi', 'Öğrencinize henüz bir servis aracı atanmamış.');
                    // Yine de giriş yapabilir ama araç göremez
                }

                // signIn fonksiyonunu güncelledik, artık parentPhone da gönderiyoruz.
                signIn('parent', student.vehicle_id || undefined, student.id, phone);

                // 3. Yönlendir
                router.replace('/(app)/parent');
            } else {
                Alert.alert('Hata', 'Bu telefon numarası ile kayıtlı öğrenci bulunamadı.');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            Alert.alert('Hata', 'Giriş yapılırken bir sorun oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={tw`flex-1 justify-center p-6`}
            >
                <View style={tw`items-center mb-10`}>
                    <View style={tw`w-20 h-20 bg-blue-600 rounded-2xl items-center justify-center mb-4 shadow-lg shadow-blue-200`}>
                        <Feather name="users" size={40} color="white" />
                    </View>
                    <Text style={tw`text-2xl font-bold text-slate-800`}>Veli Girişi</Text>
                    <Text style={tw`text-slate-500 mt-2 text-center`}>
                        Öğrenci takibi için okulda kayıtlı{'\n'}telefon numaranızı girin.
                    </Text>
                </View>

                <View style={tw`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4 mb-6`}>
                    <View>
                        <Text style={tw`text-sm font-medium text-slate-700 mb-2`}>Telefon Numarası</Text>
                        <View style={tw`flex-row items-center border border-slate-200 rounded-xl px-4 h-12 focus:border-blue-500 bg-slate-50`}>
                            <Feather name="phone" size={20} color="#94a3b8" />
                            <TextInput
                                style={tw`flex-1 ml-3 text-slate-800`}
                                placeholder="05XX XXX XX XX"
                                placeholderTextColor="#cbd5e1"
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={setPhone}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleLogin}
                        disabled={loading}
                        style={tw`bg-blue-600 h-12 rounded-xl items-center justify-center shadow-lg shadow-blue-200 ${loading ? 'opacity-70' : ''}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={tw`text-white font-bold text-base`}>Giriş Yap</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={() => router.back()}
                    style={tw`items-center`}
                >
                    <Text style={tw`text-slate-500`}>Geri Dön</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
