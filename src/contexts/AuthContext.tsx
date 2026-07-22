import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';



// Temporarily using any to bypass Vite import issues with types
type User = any;
type Session = any;

// Define the shape of our User Profile (from the users table)
export interface UserProfile {
    id: string;
    company_id: string;
    full_name: string;
    role: string;
    companies?: {
        company_name: string;
        city?: string;
        public_token?: string;
    };
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: UserProfile | null;
    profileError: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: (overrideId?: string) => Promise<void>;
}



const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    profileError: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);



export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const isFetchingProfile = React.useRef(false);
    const lastFetchedUserId = React.useRef<string | null>(null);


    useEffect(() => {
        // Initialize Auth state
        const initializeAuth = async () => {
            const startTime = performance.now();
            console.log("Auth init started");

            const { data: { session: activeSession } } = await supabase.auth.getSession();
            const sessionTime = performance.now();
            console.log(`Session fetched in ${(sessionTime - startTime).toFixed(2)}ms`);

            setSession(activeSession);
            setUser(activeSession?.user || null);

            if (activeSession?.user) {
                // Initial fetch
                await fetchProfile(activeSession.user.id);
            } else {
                setLoading(false);
            }
            console.log(`Auth init total time: ${(performance.now() - startTime).toFixed(2)}ms`);
        };


        initializeAuth();

        // Listen for Auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            console.log("Auth state change:", event, newSession?.user?.email);

            const newUser = newSession?.user || null;
            setSession(newSession);
            setUser(newUser);

            if (newUser) {
                // Only fetch if it's a new user or we haven't fetched yet
                if (newUser.id !== lastFetchedUserId.current) {
                    setLoading(true);
                    await fetchProfile(newUser.id);
                }
            } else {
                setProfile(null);
                lastFetchedUserId.current = null;
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        if (isFetchingProfile.current && lastFetchedUserId.current === userId) {
            console.log("Profile fetch already in progress for:", userId);
            return;
        }

        console.log("Fetching primary profile for:", userId);
        isFetchingProfile.current = true;
        lastFetchedUserId.current = userId;

        // Add a safety timeout (15 seconds) - local Supabase can sometimes be slow
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Database timeout (Likely RLS recursion)")), 15000)
        );


        try {
            const fetchJob = (async () => {
                // 1. Fetch the user profile first (Simple query)
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (userError) throw userError;
                console.log("User data fetched:", userData);

                // 2. Fetch company info (Separate simple query)
                const { data: companyData } = await supabase
                    .from('companies')
                    .select('company_name, city, public_token')
                    .eq('id', userData.company_id)
                    .single();

                return { ...userData, companies: companyData };
            })();

            const profileData = await Promise.race([fetchJob, timeout]) as UserProfile;
            console.log("Full profile assembled for", userId, ":", profileData);
            setProfile(profileData);
            setProfileError(null);
        } catch (error: any) {
            console.error("Critical error in fetchProfile for", userId, ":", {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                stack: error.stack
            });

            // Fallback retry for PGRST116 (Not Found) - handles potential replication lag and registration race condition
            if (error.code === 'PGRST116') {
                let retries = 4;
                let success = false;

                while (retries > 0 && !success) {
                    console.log(`Profile not found for ${userId}. Retrying in 2s... (${retries} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    try {
                        const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', userId).single();
                        if (userError) throw userError;
                        const { data: companyData } = await supabase.from('companies').select('company_name, city').eq('id', userData.company_id).single();

                        const profileData = { ...userData, companies: companyData } as UserProfile;
                        console.log("Profile found on retry:", profileData);
                        setProfile(profileData);
                        setProfileError(null);
                        success = true;

                        // Critical: Update fetching state before returning
                        isFetchingProfile.current = false;
                        setLoading(false);
                        return; // Success!
                    } catch (retryError: any) {
                        console.error("Retry failed this time:", retryError.message || retryError.code);
                        retries--;
                    }
                }

                if (!success) {
                    setProfileError("Profil Kaydı Tamamlanamadı (Kısa süreli gecikme olabilir, lütfen sayfayı yenileyin)");
                }
            } else if (error.message?.includes("timeout")) {
                setProfileError("Veritabanı Zaman Aşımı (Bağlantı çok yavaş)");
            } else {
                setProfileError(error.message);
            }
            setProfile(null);
        } finally {

            isFetchingProfile.current = false;
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        user,
        session,
        profile,
        profileError,
        loading,
        signOut,
        refreshProfile: async (overrideId?: string) => {
            const targetId = overrideId || user?.id || session?.user?.id;
            if (targetId) {
                await fetchProfile(targetId);
            }
        }
    };

    return (

        <AuthContext.Provider value={value}>

            {children}
        </AuthContext.Provider>
    );
};

