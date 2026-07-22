import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated } from 'react-native';
import tw from 'twrnc';
import { Feather } from '@expo/vector-icons';

type DialogButton = {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
};

type CustomAlertOptions = {
    title: string;
    message: string;
    buttons?: DialogButton[];
    type?: 'success' | 'error' | 'info' | 'warning';
};

// Singleton variable to expose show method globally
let globalShowAlert: (options: CustomAlertOptions) => void;

export const CustomAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [options, setOptions] = useState<CustomAlertOptions | null>(null);

    // Animation value for scale effect
    const scaleValue = React.useRef(new Animated.Value(0.9)).current;
    const opacityValue = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        globalShowAlert = (opt) => {
            setOptions(opt);
            setVisible(true);

            // Animate in
            Animated.parallel([
                Animated.spring(scaleValue, {
                    toValue: 1,
                    friction: 7,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityValue, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        };
    }, []);

    const closeAlert = () => {
        // Animate out
        Animated.parallel([
            Animated.timing(scaleValue, {
                toValue: 0.9,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(opacityValue, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            })
        ]).start(() => {
            setVisible(false);
        });
    };

    const getIconConfig = (type?: string) => {
        switch (type) {
            case 'success':
                return { name: 'check-circle', color: '#10b981', bg: 'bg-emerald-100' };
            case 'error':
                return { name: 'x-circle', color: '#ef4444', bg: 'bg-red-100' };
            case 'warning':
                return { name: 'alert-triangle', color: '#f59e0b', bg: 'bg-amber-100' };
            case 'info':
            default:
                return { name: 'info', color: '#3b82f6', bg: 'bg-blue-100' };
        }
    };

    const buttons = options?.buttons || [{ text: 'Tamam', onPress: closeAlert }];
    const iconConfig = getIconConfig(options?.type);

    return (
        <>
            {children}
            <Modal
                transparent={true}
                visible={visible}
                animationType="none"
                onRequestClose={closeAlert}
            >
                <View style={tw`flex-1 justify-center items-center px-6`}>
                    {/* Backdrop */}
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={closeAlert}
                        style={[tw`absolute inset-0 bg-slate-900/60`, { backgroundColor: 'rgba(15, 23, 42, 0.6)' }]}
                    />

                    {/* Alert Box */}
                    <Animated.View
                        style={[
                            tw`bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl`,
                            {
                                transform: [{ scale: scaleValue }],
                                opacity: opacityValue,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 10 },
                                shadowOpacity: 0.2,
                                shadowRadius: 20,
                                elevation: 10,
                            }
                        ]}
                    >
                        {/* Icon */}
                        <View style={tw`items-center mb-4 mt-2`}>
                            <View style={tw`w-16 h-16 rounded-full ${iconConfig.bg} items-center justify-center`}>
                                <Feather name={iconConfig.name as any} size={32} color={iconConfig.color} />
                            </View>
                        </View>

                        {/* Texts */}
                        <Text style={tw`text-xl font-bold text-center text-slate-800 mb-2`}>
                            {options?.title}
                        </Text>
                        <Text style={tw`text-sm text-center text-slate-500 mb-8 leading-relaxed px-2`}>
                            {options?.message}
                        </Text>

                        {/* Buttons */}
                        <View style={tw`flex-row justify-center gap-3`}>
                            {buttons.map((btn, idx) => {
                                const isDestructive = btn.style === 'destructive';
                                const isCancel = btn.style === 'cancel';

                                // If it's a primary action (not cancel)
                                const isPrimary = !isCancel;

                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => {
                                            if (btn.onPress) {
                                                btn.onPress();
                                            }
                                            closeAlert();
                                        }}
                                        style={tw`flex-1 py-3.5 rounded-xl items-center justify-center ${isPrimary
                                                ? isDestructive ? 'bg-red-500' : 'bg-slate-900'
                                                : 'bg-slate-100'
                                            }`}
                                    >
                                        <Text style={tw`font-bold ${isPrimary ? 'text-white' : 'text-slate-700'}`}>
                                            {btn.text}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
};

// Exported trigger function
export const showCustomAlert = (title: string, message: string, buttons?: DialogButton[], type?: 'success' | 'error' | 'info' | 'warning') => {
    if (globalShowAlert) {
        globalShowAlert({ title, message, buttons, type });
    } else {
        // Fallback to native alert if provider isn't mounted somehow
        import('react-native').then(({ Alert }) => {
            Alert.alert(title, message, buttons);
        });
    }
};
