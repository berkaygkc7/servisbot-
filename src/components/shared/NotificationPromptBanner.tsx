import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import {
  isWebPushSupported,
  getPushPermissionStatus,
  subscribeToPushNotifications,
  sendLocalNotification,
} from '../../services/pushNotificationService';
import { useAuth } from '../../contexts/AuthContext';

export const NotificationPromptBanner: React.FC = () => {
  const { profile } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (!isWebPushSupported()) return;

    const dismissed = sessionStorage.getItem('servisbot_push_banner_dismissed');
    const permission = getPushPermissionStatus();

    if (permission === 'default' && !dismissed) {
      // Show prompt after a gentle 3-second delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('servisbot_push_banner_dismissed', 'true');
  };

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      const res = await subscribeToPushNotifications({
        companyId: profile?.company_id,
        userId: profile?.id,
      });

      if (res.success) {
        setIsVisible(false);
        await sendLocalNotification('🎉 Bildirimler Etkinleştirildi', {
          body: 'Servis hareketleri ve operasyonel güncellemeler artık anında ekranınızda.',
          url: '/dashboard',
        });
      } else {
        setIsVisible(false);
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 max-w-md bg-white border border-blue-200/80 shadow-2xl rounded-2xl p-4.5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Bell size={20} className="animate-bounce" />
        </div>

        <div className="flex-1 pr-3">
          <div className="text-sm font-bold text-slate-800">
            Anlık Bildirimleri Açın 🔔
          </div>
          <div className="text-xs text-slate-600 mt-1 leading-relaxed">
            Servis duraklara yaklaştığında, öğrenci yoklamalarında ve yeni kayıtlarda tarayıcınızdan anında haberdar olun.
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={isSubscribing}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              {isSubscribing ? 'İzin İsteniyor...' : 'Bildirimleri Aç'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-medium hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Şimdi Değil
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default NotificationPromptBanner;
