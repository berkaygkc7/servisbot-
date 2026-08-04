import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, Lock, Loader2, Save } from 'lucide-react';

export const AccountSettings: React.FC = () => {
    const { profile, user, refreshProfile } = useAuth();
    
    // States for Profile Update
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });

    // States for Password Update
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;
        
        setIsUpdatingProfile(true);
        setProfileMessage({ text: '', type: '' });
        
        try {
            const { error } = await supabase
                .from('users')
                .update({ full_name: fullName })
                .eq('id', user.id);
                
            if (error) throw error;
            
            // Also update auth user metadata
            await supabase.auth.updateUser({
                data: { full_name: fullName }
            });

            await refreshProfile();
            setProfileMessage({ text: 'Profil bilgileriniz başarıyla güncellendi.', type: 'success' });
        } catch (error: any) {
            console.error('Error updating profile:', error);
            setProfileMessage({ text: 'Profil güncellenirken bir hata oluştu.', type: 'error' });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ text: 'Yeni şifreler eşleşmiyor.', type: 'error' });
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            setPasswordMessage({ text: 'Şifreniz en az 8 karakter uzunluğunda olmalı; en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.', type: 'error' });
            return;
        }
        
        setIsUpdatingPassword(true);
        setPasswordMessage({ text: '', type: '' });
        
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            
            if (error) throw error;
            
            setPasswordMessage({ text: 'Şifreniz başarıyla güncellendi.', type: 'success' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Error updating password:', error);
            setPasswordMessage({ text: error.message || 'Şifre güncellenirken bir hata oluştu.', type: 'error' });
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Profile Info Section */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 xl:p-8">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <User size={20} />
                    </div>
                    Kişisel Bilgiler
                </h2>
                
                <form onSubmit={handleUpdateProfile} className="max-w-2xl space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Ad Soyad</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">E-posta Adresi</label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-500 cursor-not-allowed"
                            title="E-posta adresi değiştirilemez"
                        />
                        <p className="text-xs text-slate-400 mt-2">Sisteme giriş için kullandığınız e-posta adresiniz.</p>
                    </div>

                    {profileMessage.text && (
                        <div className={`p-4 rounded-xl text-sm font-medium ${profileMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {profileMessage.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isUpdatingProfile || fullName === profile?.full_name}
                        className="py-3 px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isUpdatingProfile ? <><Loader2 size={18} className="animate-spin" /> Kaydediliyor...</> : <><Save size={18} /> Değişiklikleri Kaydet</>}
                    </button>
                </form>
            </div>

            {/* Password Change Section */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 xl:p-8">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                        <Lock size={20} />
                    </div>
                    Şifre Değiştir
                </h2>
                
                <form onSubmit={handleUpdatePassword} className="max-w-2xl space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Yeni Şifre</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium text-slate-700"
                            required
                            minLength={8}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Yeni Şifre (Tekrar)</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium text-slate-700"
                            required
                            minLength={8}
                        />
                    </div>

                    {passwordMessage.text && (
                        <div className={`p-4 rounded-xl text-sm font-medium ${passwordMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {passwordMessage.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                        className="py-3 px-6 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isUpdatingPassword ? <><Loader2 size={18} className="animate-spin" /> Güncelleniyor...</> : <><Lock size={18} /> Şifreyi Güncelle</>}
                    </button>
                </form>
            </div>
        </div>
    );
};
