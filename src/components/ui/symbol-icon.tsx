import { SymbolView } from 'expo-symbols';
import { Text } from 'react-native';
import type { ColorValue } from 'react-native';

export type SymbolIconName =
  | 'book'
  | 'bookmark'
  | 'copy'
  | 'external-link'
  | 'home'
  | 'info'
  | 'map'
  | 'minus'
  | 'plus'
  | 'search'
  | 'settings'
  | 'share';

const symbolNames: Record<SymbolIconName, React.ComponentProps<typeof SymbolView>['name']> = {
  book: { ios: 'book.closed', android: 'menu_book', web: 'menu_book' },
  bookmark: { ios: 'bookmark', android: 'bookmark', web: 'bookmark' },
  copy: { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' },
  'external-link': { ios: 'arrow.up.forward.square', android: 'open_in_new', web: 'open_in_new' },
  home: { ios: 'house', android: 'home', web: 'home' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  map: { ios: 'map', android: 'map', web: 'map' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
};

export function SymbolIcon({
  color,
  name,
  size = 20,
}: {
  color: ColorValue;
  name: SymbolIconName;
  size?: number;
}) {
  return (
    <SymbolView
      fallback={<Text style={{ color, fontSize: size }}>#</Text>}
      name={symbolNames[name]}
      size={size}
      tintColor={color}
    />
  );
}
