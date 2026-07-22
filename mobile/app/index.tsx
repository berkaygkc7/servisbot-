import { View, Text, TouchableOpacity, Image, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';

const logoImg = require('../../src/assets/servisbot_bus_logo.png');

export default function LoginScreen() {
    const router = useRouter();
    const { width, height } = Dimensions.get('window');

    return (
        <>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#0f172a', '#1e3a5f', '#0f172a']}
                locations={[0, 0.5, 1]}
                style={{ flex: 1 }}
            >
                <SafeAreaView style={tw`flex-1`}>

                    {/* Decorative blobs */}
                    <View style={[tw`absolute rounded-full bg-blue-500/20`, { width: 320, height: 320, top: -60, right: -80, borderRadius: 160 }]} />
                    <View style={[tw`absolute rounded-full bg-indigo-600/15`, { width: 240, height: 240, top: 100, left: -100, borderRadius: 120 }]} />
                    <View style={[tw`absolute rounded-full bg-cyan-400/10`, { width: 200, height: 200, bottom: 120, right: -60, borderRadius: 100 }]} />

                    {/* Logo + Brand — centred hero */}
                    <View style={tw`flex-1 items-center justify-center px-6`}>
                        {/* Logo Card */}
                        <View style={[tw`bg-white/10 rounded-3xl items-center justify-center mb-6 border border-white/20`, { width: width * 0.45, height: width * 0.45 }]}>
                            <Image
                                source={logoImg}
                                style={{ width: width * 0.32, height: width * 0.32, tintColor: '#ffffff' }}
                                resizeMode="contain"
                            />
                        </View>

                        {/* Brand Name */}
                        <Text style={tw`text-5xl font-black text-white tracking-tight`}>
                            Servis<Text style={tw`text-blue-400`}>Bot</Text>
                        </Text>
                        <Text style={tw`text-slate-400 mt-3 text-center text-base leading-6 max-w-[70%]`}>
                            Okul servisi için{'\n'}yeni nesil dijital takip
                        </Text>
                    </View>

                    {/* Bottom Card */}
                    <View style={tw`px-5 pb-8`}>
                        {/* Divider label */}
                        <Text style={tw`text-slate-500 text-xs font-bold uppercase tracking-widest text-center mb-4`}>Giriş Yöntemi Seçin</Text>

                        {/* QR Button — primary */}
                        <TouchableOpacity
                            onPress={() => router.push('/qr-scanner')}
                            activeOpacity={0.85}
                            style={tw`bg-blue-600 rounded-2xl mb-3 overflow-hidden`}
                        >
                            <LinearGradient
                                colors={['#3b82f6', '#2563eb']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={tw`flex-row items-center p-5 gap-4`}
                            >
                                <View style={tw`w-12 h-12 bg-white/20 rounded-xl items-center justify-center`}>
                                    <Feather name="camera" size={24} color="#ffffff" />
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-white font-black text-lg`}>QR Kod ile Giriş</Text>
                                    <Text style={tw`text-blue-100/80 text-xs mt-0.5`}>Kameranızı QR koda doğrultun</Text>
                                </View>
                                <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Link Button — secondary */}
                        <TouchableOpacity
                            onPress={() => router.push('/link-login')}
                            activeOpacity={0.85}
                            style={tw`bg-white/10 border border-white/20 rounded-2xl flex-row items-center p-5 gap-4`}
                        >
                            <View style={tw`w-12 h-12 bg-white/15 rounded-xl items-center justify-center`}>
                                <Feather name="link" size={22} color="#94a3b8" />
                            </View>
                            <View style={tw`flex-1`}>
                                <Text style={tw`text-white font-bold text-base`}>Link ile Giriş</Text>
                                <Text style={tw`text-slate-400 text-xs mt-0.5`}>Giriş linkini veya UUID'yi yapıştırın</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>

                        {/* Footer */}
                        <Text style={tw`text-center text-slate-600 text-xs mt-6`}>
                            Giriş bilgileriniz yönetici tarafından sağlanır.
                        </Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </>
    );
}
