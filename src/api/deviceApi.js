import axios from 'axios';
import {getSession} from '@utils/storage';

const BASE_URL = 'https://pjsofttech.in:54443';

const deviceApi = {
  registerDevice: async ({
    fid,
    deviceType,
    deviceName,
    appVersion,
  }) => {
    const token = getSession()?.token;

    const response = await axios.post(
      `${BASE_URL}/api/device/register`,
      {
        fid,
        deviceType,
        deviceName,
        appVersion,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
        timeout: 10000,
      },
    );

    return response.data;
  },

  deactivateDevice: async fid => {
    const token = getSession()?.token;

    const response = await axios.delete(
      `${BASE_URL}/api/device/deactivate`,
      {
        params: {
          fid,
        },
        headers: {
          'Content-Type': 'application/json',
          ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
        timeout: 10000,
      },
    );

    return response.data;
  },
};

export default deviceApi;