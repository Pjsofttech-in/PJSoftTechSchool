import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {
  getInstallations,
  getId,
} from '@react-native-firebase/installations';

export const getFirebaseFid = async () => {
  const installationsInstance = getInstallations();
  return await getId(installationsInstance);
};

export const getDeviceType = () => {
  if (Platform.OS === 'android') {
    return 'ANDROID';
  }

  if (Platform.OS === 'ios') {
    return 'IOS';
  }

  return Platform.OS?.toUpperCase() || 'UNKNOWN';
};

export const getDeviceName = async () => {
  return await DeviceInfo.getDeviceName();
};

export const getAppVersion = () => {
  return DeviceInfo.getVersion();
};