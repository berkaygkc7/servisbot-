import { createContext, useContext, useState, PropsWithChildren } from 'react';
import { supabase } from '../lib/supabase';

type AuthRole = 'driver' | 'parent' | null;

interface AuthContextType {
    role: AuthRole;
    vehicleId: string | null;
    studentId: string | null;
    parentPhone: string | null;
    userName: string | null;
    signIn: (role: AuthRole, vehicleId?: string, studentId?: string, parentPhone?: string, userName?: string) => void;
    loginWithToken: (token: string) => Promise<{ success: boolean; message?: string; role?: AuthRole }>;
    linkStudent: (token: string) => Promise<{ success: boolean; message?: string }>;
    signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
    role: null,
    vehicleId: null,
    studentId: null,
    parentPhone: null,
    userName: null,
    signIn: () => { },
    loginWithToken: async () => ({ success: false }),
    linkStudent: async () => ({ success: false }),
    signOut: () => { },
});

export function AuthProvider({ children }: PropsWithChildren) {
    const [role, setRole] = useState<AuthRole>(null);
    const [vehicleId, setVehicleId] = useState<string | null>(null);
    const [studentId, setStudentId] = useState<string | null>(null);
    const [parentPhone, setParentPhone] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);

    const signIn = (newRole: AuthRole, verhicleId?: string, sId?: string, pPhone?: string, uName?: string) => {
        setRole(newRole);
        if (verhicleId) setVehicleId(verhicleId);
        if (sId) setStudentId(sId);
        if (pPhone) setParentPhone(pPhone);
        if (uName) setUserName(uName);
    };

    const loginWithToken = async (token: string): Promise<{ success: boolean; message?: string; role?: AuthRole }> => {
        try {
            const { data, error } = await supabase.rpc('validate_login_token', {
                p_token: token
            });

            if (error) {
                console.error('RPC Error:', error);
                return { success: false, message: 'Sunucu ile iletişim kurulamadı.' };
            }

            if (data && data.success) {
                if (data.type === 'driver') {
                    setRole('driver');
                    if (data.user?.vehicle_id) {
                        setVehicleId(data.user.vehicle_id);
                    }
                    if (data.user?.full_name) {
                        setUserName(data.user.full_name);
                    }
                    return { success: true, role: 'driver' };
                } else if (data.type === 'parent') {
                    setRole('parent');
                    setStudentId(data.user.id);
                    setParentPhone(data.user.parent_phone);
                    if (data.user?.parent_name) {
                        setUserName(data.user.parent_name);
                    }
                    return { success: true, role: 'parent' };
                }
            }

            return { success: false, message: data?.message || 'Geçersiz giriş kodu.' };
        } catch (err) {
            console.error('Token login error:', err);
            return { success: false, message: 'Bir hata oluştu.' };
        }
    };

    const linkStudent = async (token: string): Promise<{ success: boolean; message?: string }> => {
        try {
            if (!parentPhone) return { success: false, message: 'Oturum bilgisi bulunamadı.' };

            const { data, error } = await supabase.rpc('link_student_by_token', {
                p_token: token,
                p_parent_phone: parentPhone
            });

            if (error) {
                console.error('RPC Error:', error);
                return { success: false, message: 'Sunucu ile iletişim kurulamadı.' };
            }

            return { success: data.success, message: data.message };
        } catch (err) {
            console.error('Link student error:', err);
            return { success: false, message: 'Bir hata oluştu.' };
        }
    };

    const signOut = () => {
        setRole(null);
        setVehicleId(null);
        setStudentId(null);
        setParentPhone(null);
        setUserName(null);
    };

    return (
        <AuthContext.Provider value={{ role, vehicleId, studentId, parentPhone, userName, signIn, loginWithToken, linkStudent, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
