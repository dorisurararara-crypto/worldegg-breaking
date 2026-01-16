import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const usePushNotifications = (API_URL, clientId) => {
  useEffect(() => {
    // Only run on native platforms (Android/iOS)
    if (Capacitor.getPlatform() === 'web') return;

    const registerPush = async () => {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('Push notification permission denied.');
        return;
      }

      await PushNotifications.register();
    };

    // Listeners for registration
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      
      // Save token to server if we have clientId
      if (clientId && API_URL) {
        try {
          await fetch(`${API_URL}/register-push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, token: token.value })
          });
          console.log('Push token saved to server.');
        } catch (e) {
          console.error('Failed to save push token to server', e);
        }
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error: ', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ', notification);
    });

    registerPush();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [API_URL, clientId]);
};
