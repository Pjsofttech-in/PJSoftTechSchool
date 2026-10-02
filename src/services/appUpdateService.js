import SpInAppUpdates, {
  IAUUpdateKind,
} from 'sp-react-native-in-app-updates';

import {getAppVersion} from '@utils/deviceUtils';

const inAppUpdates = new SpInAppUpdates(false);

const checkForAppUpdate = async () => {
  try {
    const currentVersion = getAppVersion();

    console.log('\n====================================');
    console.log('IN-APP UPDATE CHECK');
    console.log('Current Version:', currentVersion);
    console.log('====================================');

    const result = await inAppUpdates.checkNeedsUpdate({
      curVersion: currentVersion,
    });

    console.log('Update Check Result:', result);

    if (result.shouldUpdate) {
      console.log('New version available!');
      console.log('Starting Flexible Update...');

      await inAppUpdates.startUpdate({
        updateType: IAUUpdateKind.FLEXIBLE,
      });

      console.log('Flexible Update started successfully');
    } else {
      console.log('App is already up to date');
    }

    return result;
  } catch (error) {
    console.error('In-App Update Error:', error);
    return null;
  }
};

export default checkForAppUpdate;