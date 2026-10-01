import React, {useEffect} from 'react';
import {PermissionsAndroid, Platform} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {
  getMessaging,
  requestPermission,
  getToken,
  registerDeviceForRemoteMessages,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import Toast from 'react-native-toast-message';
import RootNavigator from '@navigation/index';

import {
  getFirebaseFid,
  getDeviceType,
  getDeviceName,
  getAppVersion,
} from '@utils/deviceUtils';

const App = () => {
  useEffect(() => {
    async function getFcmToken() {
      try {
        // 1. Request Android 13+ runtime notification permission
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('User denied notification permission');
            return;
          }
        }

        // Initialize Messaging instance
        const messagingInstance = getMessaging();

        // Ensure physical device is registered for remote messages
        await registerDeviceForRemoteMessages(messagingInstance);

        // 2. Request FCM permission
        const authStatus = await requestPermission(messagingInstance);

        const enabled =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          // 3. Get FCM Token from Firebase
          const token = await getToken(messagingInstance);

          // 4. Get Firebase Installation ID (FID)
          const fid = await getFirebaseFid();

          // 5. Get device information
          const deviceType = getDeviceType();
          const deviceName = await getDeviceName();
          const appVersion = getAppVersion();

          console.log('\n====================================');
          console.log('DEVICE REGISTRATION DETAILS');
          console.log('FID:', fid);
          console.log('Device Type:', deviceType);
          console.log('Device Name:', deviceName);
          console.log('App Version:', appVersion);
          console.log('====================================');

          console.log('\n====================================');
          console.log('SUCCESS! FCM TOKEN:');
          console.log(token);
          console.log('====================================\n');
        } else {
          console.log('FCM permission denied');
        }
      } catch (error) {
        console.error('Error fetching FCM token/FID:', error);
      }
    }

    getFcmToken();
  }, []);

  return (
    <SafeAreaProvider>
      <RootNavigator />
      <Toast />
    </SafeAreaProvider>
  );
};

export default App;