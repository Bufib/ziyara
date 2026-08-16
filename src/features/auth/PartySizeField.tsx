import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SymbolIcon } from '@/components/ui/symbol-icon';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/features/i18n/i18n';
import { useTheme } from '@/hooks/use-theme';

export const minimumPartySize = 1;
export const maximumPartySize = 50;

export function getPartySize(value: string, minimum = minimumPartySize) {
  const partySize = Number(value);

  return Number.isInteger(partySize) && partySize >= minimum && partySize <= maximumPartySize
    ? partySize
    : null;
}

export function PartySizeField({
  disabled = false,
  minimum = minimumPartySize,
  onChange,
  value,
}: {
  disabled?: boolean;
  minimum?: number;
  onChange: (value: string) => void;
  value: string;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const parsedValue = getPartySize(value, minimum);
  const displayedValue = parsedValue ?? minimum;

  const changeBy = (difference: number) => {
    const nextValue = Math.min(
      maximumPartySize,
      Math.max(minimum, displayedValue + difference),
    );
    onChange(String(nextValue));
  };

  const changeText = (nextValue: string) => {
    const digits = nextValue.replace(/\D/g, '').slice(0, 2);

    if (!digits) {
      onChange('');
      return;
    }

    onChange(String(Math.min(Number(digits), maximumPartySize)));
  };

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{t('family.partySize')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('family.partySizeBody')}
      </ThemedText>

      <View style={styles.controls}>
        <PartySizeButton
          disabled={disabled || displayedValue <= minimum}
          label={t('family.decrease')}
          name="minus"
          onPress={() => changeBy(-1)}
        />
        <TextInput
          accessibilityLabel={t('family.partySize')}
          editable={!disabled}
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={2}
          onBlur={() => {
            if (parsedValue === null) {
              onChange(String(minimum));
            }
          }}
          onChangeText={changeText}
          selectTextOnFocus
          style={[
            styles.input,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          value={value}
        />
        <PartySizeButton
          disabled={disabled || displayedValue >= maximumPartySize}
          label={t('family.increase')}
          name="plus"
          onPress={() => changeBy(1)}
        />
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {t('family.partySizeLimit', { maximum: maximumPartySize, minimum })}
      </ThemedText>
    </View>
  );
}

function PartySizeButton({
  disabled,
  label,
  name,
  onPress,
}: {
  disabled: boolean;
  label: string;
  name: 'minus' | 'plus';
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepButton,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <SymbolIcon color={theme.text} name={name} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
    minWidth: 0,
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    minHeight: 52,
    minWidth: 72,
    paddingHorizontal: Spacing.two,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  stepButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
});
