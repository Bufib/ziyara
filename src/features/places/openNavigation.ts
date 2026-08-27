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
  return Linking.openURL(getNavigationUrl(place))
    .then(() => true)
    .catch(() => false);
}

export function getNavigationQueryUrl(name: string) {
  if (Platform.OS === 'ios') {
    return `maps://?q=${encodeURIComponent(name)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
}

export function openNavigationQuery(name: string) {
  return Linking.openURL(getNavigationQueryUrl(name))
    .then(() => true)
    .catch(() => false);
}
