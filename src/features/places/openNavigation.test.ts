import { describe, expect, it } from '@jest/globals';
import { Platform } from 'react-native';

import {
  getNavigationQueryUrl,
  getNavigationUrl,
} from '@/features/places/openNavigation';

describe('navigation URLs', () => {
  it('öffnet Koordinaten in der plattformeigenen Karten-URL', () => {
    const url = getNavigationUrl({ latitude: 32.616, longitude: 44.032, name: 'Tor 3' });
    expect(url).toContain('32.616,44.032');
    expect(url).toContain(Platform.OS === 'ios' ? 'maps://' : 'google.com/maps');
  });

  it('ermöglicht eine Kartensuche auch ohne hinterlegte Koordinaten', () => {
    const url = getNavigationQueryUrl('Treffpunkt Tor 3');
    expect(url).toContain('Treffpunkt%20Tor%203');
    expect(url).toContain(Platform.OS === 'ios' ? 'maps://' : 'google.com/maps');
  });
});
