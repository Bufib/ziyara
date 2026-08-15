import { SymbolView } from 'expo-symbols';
import { Text } from 'react-native';
import type { ColorValue } from 'react-native';

export type SymbolIconName =
  | 'account'
  | 'book'
  | 'bookmark'
  | 'close'
  | 'confirm'
  | 'copy'
  | 'decline'
  | 'external-link'
  | 'home'
  | 'info'
  | 'logout'
  | 'map'
  | 'minus'
  | 'people'
  | 'plus'
  | 'question'
  | 'refresh'
  | 'search'
  | 'settings'
  | 'share'
  | 'unchecked';

const symbolNames: Record<SymbolIconName, React.ComponentProps<typeof SymbolView>['name']> = {
  account: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  book: { ios: 'book.closed', android: 'menu_book', web: 'menu_book' },
  bookmark: { ios: 'bookmark', android: 'bookmark', web: 'bookmark' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  confirm: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  copy: { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' },
  decline: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' },
  'external-link': { ios: 'arrow.up.forward.square', android: 'open_in_new', web: 'open_in_new' },
  home: { ios: 'house', android: 'home', web: 'home' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  logout: {
    ios: 'rectangle.portrait.and.arrow.right',
    android: 'logout',
    web: 'logout',
  },
  map: { ios: 'map', android: 'map', web: 'map' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  people: { ios: 'person.3', android: 'group', web: 'group' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  question: { ios: 'questionmark.bubble', android: 'help', web: 'help' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  unchecked: { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' },
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
