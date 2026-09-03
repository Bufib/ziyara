import type { ConfigContext, ExpoConfig } from 'expo/config';

type ReactNativeMapsPluginOptions = {
  androidGoogleMapsApiKey?: string;
};

function configuredValue(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidGoogleMapsApiKey = configuredValue(
    process.env.GOOGLE_MAPS_ANDROID_API_KEY,
  );
  const mapsPluginOptions: ReactNativeMapsPluginOptions = {
    ...(androidGoogleMapsApiKey ? { androidGoogleMapsApiKey } : {}),
  };

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', mapsPluginOptions],
    ],
  };
};
