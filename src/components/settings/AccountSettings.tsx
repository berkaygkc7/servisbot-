import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, Lock, Loader2, Save, Shield, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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

    // States for MFA (Google Authenticator)
    const [mfaFactors, setMfaFactors] = useState<any[]>([]);
    const [mfaLoading, setMfaLoading] = useState(true);
    const [mfaError, setMfaError] = useState<string | null>(null);
    const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);
    
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [qrCodeUri, setQrCodeUri] = useState('');
    const [backupSecret, setBackupSecret] = useState('');
    const [enrollFactorId, setEnrollFactorId] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [copied, setCopied] = useState(false);

    const fetchMfaFactors = async () => {
        try {
            setMfaLoading(true);
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) throw error;
            setMfaFactors(data?.all || []);
        } catch (err: any) {
            console.error('Error listing MFA factors:', err);
        } finally {
            setMfaLoading(false);
        }
    };

    useEffect(() => {
        fetchMfaFactors();
    }, []);

    const handleStartEnroll = async () => {
        setMfaError(null);
        setMfaSuccess(null);
        setIsEnrolling(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                issuer: 'ServisBot',
                friendlyName: user?.email || 'ServisBot User'
            });
            if (error) throw error;
            
            setEnrollFactorId(data.id);
            setQrCodeUri(data.totp.uri);
            setBackupSecret(data.totp.secret);
        } catch (err: any) {
            setMfaError(err.message || 'MFA başlatılırken bir hata oluştu.');
            setIsEnrolling(false);
        }
    };

    const handleVerifyEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verificationCode || !enrollFactorId) return;

        setIsVerifying(true);
        setMfaError(null);

        try {
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: enrollFactorId
            });
            if (challengeError) throw challengeError;

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: enrollFactorId,
                challengeId: challengeData.id,
                code: verificationCode
            });
            if (verifyError) throw verifyError;

            setMfaSuccess('İki adımlı doğrulama (MFA) başarıyla aktif edildi.');
            setIsEnrolling(false);
            setQrCodeUri('');
            setBackupSecret('');
            setEnrollFactorId('');
            setVerificationCode('');
            await fetchMfaFactors();
        } catch (err: any) {
            setMfaError(err.message || 'Doğrulama kodu geçersiz. Lütfen tekrar deneyin.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleCancelEnroll = () => {
        setIsEnrolling(false);
        setQrCodeUri('');
        setBackupSecret('');
        setEnrollFactorId('');
        setVerificationCode('');
        setMfaError(null);
    };

    const handleDisableMfa = async (factorId: string) => {
        if (!window.confirm('İki adımlı doğrulamayı kapatmak istediğinize emin misiniz? Bu işlem hesabınızın güvenliğini azaltacaktır.')) {
            return;
        }

        setMfaLoading(true);
        setMfaError(null);
        setMfaSuccess(null);

        try {
            const { error } = await supabase.auth.mfa.unenroll({ factorId });
            if (error) throw error;
            setMfaSuccess('İki adımlı doğrulama başarıyla devre dışı bırakıldı.');
            await fetchMfaFactors();
        } catch (err: any) {
            setMfaError(err.message || 'MFA devre dışı bırakılırken bir hata oluştu.');
        } finally {
            setMfaLoading(false);
        }
    };

    const handleCopySecret = () => {
        navigator.clipboard.writeText(backupSecret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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

    const activeMfa = mfaFactors.find(f => f.status === 'verified');

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

            {/* MFA (Two-Factor Authentication) Section */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 xl:p-8">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Shield size={20} />
                    </div>
                    İki Adımlı Doğrulama (Google Authenticator)
                </h2>

                <div className="max-w-2xl space-y-6">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Hesabınızın güvenliğini artırmak için Google Authenticator, Microsoft Authenticator veya benzeri bir TOTP uygulamasını kullanarak iki adımlı doğrulamayı aktif edebilirsiniz. Aktif edildiğinde, giriş yaparken şifrenize ek olarak uygulamanın ürettiği geçici kodu girmeniz gerekir.
                    </p>

                    {mfaError && (
                        <div className="p-4 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{mfaError}</span>
                        </div>
                    )}

                    {mfaSuccess && (
                        <div className="p-4 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 shrink-0" />
                            <span>{mfaSuccess}</span>
                        </div>
                    )}

                    {mfaLoading ? (
                        <div className="flex items-center gap-2 text-slate-500">
                            <Loader2 className="animate-spin w-5 h-5" />
                            <span>Yükleniyor...</span>
                        </div>
                    ) : activeMfa ? (
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg mt-0.5">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">İki Adımlı Doğrulama Aktif</h4>
                                    <p className="text-xs text-slate-500 mt-1">Cihaz: {activeMfa.friendly_name || 'Kayıtlı Uygulama'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDisableMfa(activeMfa.id)}
                                className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold text-sm transition-colors self-start sm:self-center"
                            >
                                Devre Dışı Bırak
                            </button>
                        </div>
                    ) : isEnrolling ? (
                        <div className="border border-slate-200 rounded-2xl p-6 space-y-6 bg-slate-50/50">
                            <h3 className="text-base font-bold text-slate-800">Kurulum Adımları</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">1</div>
                                        <p className="text-sm text-slate-600">Telefonunuza Google Authenticator uygulamasını indirin.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">2</div>
                                        <p className="text-sm text-slate-600">Uygulamadaki "+" butonuna basıp sağdaki QR kodunu taratın.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">3</div>
                                        <div className="text-sm text-slate-600 space-y-1">
                                            <span>Veya bu gizli anahtarı manuel girin:</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <code className="bg-white border border-slate-200 px-2.5 py-1 rounded text-xs font-mono font-bold select-all text-indigo-600">{backupSecret}</code>
                                                <button onClick={handleCopySecret} className="text-slate-400 hover:text-slate-600">
                                                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center justify-center bg-white p-4 border border-slate-200 rounded-xl shadow-inner">
                                    {qrCodeUri && (
                                        <QRCodeSVG value={qrCodeUri} size={160} />
                                    )}
                                    <span className="text-xs text-slate-400 mt-2 font-medium">QR Kodu Taratın</span>
                                </div>
                            </div>

                            <form onSubmit={handleVerifyEnroll} className="border-t border-slate-200 pt-5 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                        4. Uygulamadaki 6 Haneli Kodu Girin
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        pattern="[0-9]*"
                                        placeholder="000 000"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        className="w-full max-w-xs px-4 py-3 bg-white border border-slate-200 rounded-xl text-center text-xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        required
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="submit"
                                        disabled={isVerifying || verificationCode.length !== 6}
                                        className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isVerifying ? <Loader2 size={18} className="animate-spin" /> : 'Kodu Doğrula ve Aktif Et'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancelEnroll}
                                        className="py-3 px-6 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors"
                                    >
                                        İptal Et
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <button
                            onClick={handleStartEnroll}
                            className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
                        >
                            <Shield size={18} />
                            İki Adımlı Doğrulamayı Aktif Et
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
