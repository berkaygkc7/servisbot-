import { supabase } from '../lib/supabase';

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface PushSubscriptionDetails {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

/**
 * Checks if the current browser environment supports W3C Web Push Notifications.
 */
export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PushManager' in window
  );
}

/**
 * Returns current notification permission state ('default' | 'granted' | 'denied' | 'unsupported').
 */
export function getPushPermissionStatus(): PushPermissionState {
  if (!isWebPushSupported()) return 'unsupported';
  return Notification.permission as PushPermissionState;
}

/**
 * Requests permission from the user to send browser push notifications.
 */
export async function requestPushPermission(): Promise<PushPermissionState> {
  if (!isWebPushSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    return permission as PushPermissionState;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return 'denied';
  }
}

/**
 * Subscribes the current device to push notifications and records the token in Supabase.
 */
export async function subscribeToPushNotifications(options: {
  companyId?: string;
  studentId?: string;
  userId?: string;
} = {}): Promise<{ success: boolean; error?: string }> {
  if (!isWebPushSupported()) {
    return { success: false, error: 'Tarayıcınız Web Push bildirimlerini desteklemiyor.' };
  }

  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    return { success: false, error: 'Bildirim izni verilmedi.' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription or create new
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Optional VAPID public key if configured in environment
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      const subscribeOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
      };

      if (vapidKey) {
        subscribeOptions.applicationServerKey = urlBase64ToUint8Array(vapidKey) as unknown as BufferSource;
      }

      try {
        subscription = await registration.pushManager.subscribe(subscribeOptions);
      } catch (subErr) {
        // Fallback for browsers that require standard permission notification without VAPID
        console.warn('VAPID subscription error, falling back to local notification support:', subErr);
      }
    }

    const endpoint = subscription ? subscription.endpoint : `local-${navigator.userAgent.slice(0, 50)}-${Date.now()}`;
    const subscriptionPayload = subscription ? subscription.toJSON() : { localOnly: true };

    // Save to Supabase push_tokens
    const { error: rpcError } = await supabase.rpc('save_web_push_subscription' as any, {
      p_token: endpoint,
      p_platform: 'web',
      p_company_id: options.companyId || null,
      p_student_id: options.studentId || null,
      p_subscription: subscriptionPayload,
    });

    if (rpcError) {
      console.warn('Could not save push subscription to Supabase:', rpcError);
    }

    localStorage.setItem('servisbot_push_enabled', 'true');
    return { success: true };
  } catch (error: any) {
    console.error('Error during push subscription:', error);
    return { success: false, error: error?.message || 'Abonelik oluşturulamadı.' };
  }
}

/**
 * Dispatches an instant local system notification via Service Worker or Notification API.
 */
export async function sendLocalNotification(
  title: string,
  options: {
    body: string;
    url?: string;
    icon?: string;
    tag?: string;
  }
): Promise<boolean> {
  if (!isWebPushSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration) {
      await (registration as any).showNotification(title, {
        body: options.body,
        icon: options.icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: options.tag || 'servisbot-local-alert',
        vibrate: [200, 100, 200],
        data: {
          url: options.url || '/dashboard',
          timestamp: Date.now(),
        },
      });
      return true;
    } else {
      new Notification(title, {
        body: options.body,
        icon: options.icon || '/pwa-192x192.png',
      });
      return true;
    }
  } catch (err) {
    console.error('Failed to trigger notification:', err);
    return false;
  }
}

/**
 * Helper to convert URL-safe base64 VAPID string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
