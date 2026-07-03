import { Linking, Platform } from 'react-native';

import type { Place } from '@/domain/types';

export function getNavigationUrl(place: Pick<Place, 'latitude' | 'longitude' | 'name'>) {
  const query = `${place.latitude},${place.longitude}`;
  if (Platform.OS === 'ios') {
    return `maps://?q=${encodeURIComponent(place.name)}&ll=${query}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function openNavigation(place: Pick<Place, 'latitude' | 'longitude' | 'name'>) {
  return Linking.openURL(getNavigationUrl(place));
}
