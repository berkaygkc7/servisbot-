import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, BellRing, Check, Send, AlertCircle, X, ExternalLink } from 'lucide-react';
import {
  isWebPushSupported,
  getPushPermissionStatus,
  subscribeToPushNotifications,
  sendLocalNotification,
  type PushPermissionState,
} from '../../services/pushNotificationService';
import { useAuth } from '../../contexts/AuthContext';

export const NotificationBell: React.FC = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPermission(getPushPermissionStatus());
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    try {
      const res = await subscribeToPushNotifications({
        companyId: profile?.company_id,
        userId: profile?.id,
      });

      if (res.success) {
        setPermission('granted');
        await sendLocalNotification('🎉 ServisBot Bildirimleri Açıldı', {
          body: 'Artık öğrenci binişleri, canlı rota güncellemeleri ve ödemeler anında ekranınıza gelecek.',
          url: '/dashboard',
        });
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSendTest = async () => {
    setTestSent(true);
    await sendLocalNotification('🚌 Test: Servis Aracı Yaklaşıyor!', {
      body: '34 SB 2026 plakalı okul servisi durak noktasına 3 dakika mesafede.',
      url: '/dashboard/routes',
    });
    setTimeout(() => setTestSent(false), 2500);
  };

  if (!isWebPushSupported()) {
    return null; // Don't render if browser doesn't support notifications
  }

  const isGranted = permission === 'granted';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-full border transition-all cursor-pointer ${
          isOpen
            ? 'bg-blue-50 text-blue-600 border-blue-200 ring-2 ring-blue-100'
            : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border-slate-200 shadow-2xs'
        }`}
        title="Bildirim Ayarları & Canlı Alarmlar"
        aria-label="Bildirimler"
      >
        {isGranted ? <Bell size={19} /> : <BellOff size={19} className="text-slate-400" />}

        {/* Status Indicator Dot */}
        <span
          className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full border border-white ${
            isGranted ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        />
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-84 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <BellRing size={16} />
              </span>
              <span className="text-sm font-bold text-slate-800">Web Bildirimleri</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body / Status */}
          <div className="p-4 space-y-3">
            {isGranted ? (
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 text-emerald-800 flex items-start gap-2.5 text-xs">
                <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Tarayıcı Bildirimleri Aktif</div>
                  <div className="text-emerald-700/90 mt-0.5 leading-relaxed">
                    Öğrenci yoklamaları, rota başlangıcı ve yeni başvurularda masaüstü bildirimleri anında gösterilir.
                  </div>
                </div>
              </div>
            ) : permission === 'denied' ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 flex items-start gap-2.5 text-xs">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Bildirim İzni Engellenmiş</div>
                  <div className="text-red-700/90 mt-0.5 leading-relaxed">
                    Bildirimleri almak için tarayıcı adres çubuğundaki kilit simgesine tıklayıp bildirimlere izin vermelisiniz.
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-blue-800 flex items-start gap-2.5 text-xs">
                <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Anlık Uyarıları Kaçırmayın</div>
                  <div className="text-blue-700/90 mt-0.5 leading-relaxed">
                    SMS beklemeden, servisin öğrenciye yaklaşmasını ve ödeme bildirimlerini tarayıcınızdan ücretsiz alın.
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isGranted ? (
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testSent}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {testSent ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span>Test Bildirimi Gönderildi</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Örnek Bildirim Gönder (Test Et)</span>
                  </>
                )}
              </button>
            ) : permission !== 'denied' ? (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isSubscribing}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <BellRing size={14} />
                <span>{isSubscribing ? 'İzin İsteniyor...' : 'Bildirimleri Şimdi Aç'}</span>
              </button>
            ) : null}
          </div>

          {/* Footer info */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>ServisBot Web Push API</span>
            <span className="flex items-center gap-1 font-medium text-blue-600">
              <ExternalLink size={11} /> PWA Destekli
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
