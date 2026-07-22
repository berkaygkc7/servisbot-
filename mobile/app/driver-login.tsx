import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import tw from 'twrnc';
import { supabase } from '../src/lib/supabase';

interface Vehicle {
    id: string;
    plate_number: string;
    driver_name: string;
}

export default function DriverLoginScreen() {
    const router = useRouter();
    const { signIn } = useAuth();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            const { data, error } = await supabase.from('vehicles').select('id, plate_number, driver_name').order('plate_number');
            if (error) throw error;
            setVehicles(data || []);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (vehicle: Vehicle) => {
        signIn('driver', vehicle.id);
        router.replace('/(app)/driver');
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50 p-6`}>
            <View style={tw`mb-8`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`mb-4`}>
                    <Feather name="arrow-left" size={24} color="#64748b" />
                </TouchableOpacity>
                <Text style={tw`text-2xl font-bold text-slate-800`}>Sürücü Girişi</Text>
                <Text style={tw`text-slate-500 mt-2`}>Lütfen kullandığınız aracı seçiniz</Text>
            </View>

            {loading ? (
                <View style={tw`flex-1 justify-center items-center`}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={vehicles}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => handleLogin(item)}
                            style={tw`bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-3 flex-row items-center gap-4`}
                        >
                            <View style={tw`w-12 h-12 bg-blue-50 rounded-full items-center justify-center`}>
                                <Feather name="truck" size={20} color="#2563eb" />
                            </View>
                            <View>
                                <Text style={tw`font-bold text-slate-800 text-lg`}>{item.plate_number}</Text>
                                <Text style={tw`text-slate-500`}>{item.driver_name}</Text>
                            </View>
                            <View style={tw`flex-1 items-end`}>
                                <Feather name="chevron-right" size={20} color="#94a3b8" />
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={tw`items-center mt-10`}>
                            <Text style={tw`text-slate-400`}>Kayıtlı araç bulunamadı.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
