import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

let cachedModule: any = null;

export const isGoogleMobileAdsAvailable = !isExpoGo;

export const getGoogleMobileAdsModule = () => {
  if (isExpoGo) {
    return null;
  }

  if (cachedModule) {
    return cachedModule;
  }

  try {
    cachedModule = require('react-native-google-mobile-ads');
    return cachedModule;
  } catch (error) {
    console.warn('Google Mobile Ads indisponivel neste ambiente:', error);
    return null;
  }
};