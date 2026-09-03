import { Platform } from 'react-native';
import { PROVIDER_GOOGLE, type Provider } from 'react-native-maps';

export const nativeMapProvider: Provider =
  Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;
