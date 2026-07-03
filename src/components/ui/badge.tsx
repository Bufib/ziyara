import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { verificationStatusLabels } from '@/data/labels';
import type { VerificationStatus } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

export function Badge({ status }: { status: VerificationStatus }) {
  const theme = useTheme();
  const background =
    status === 'verified'
      ? theme.successSoft
      : status === 'rejected'
        ? theme.dangerSoft
        : theme.warningSoft;
  const border =
    status === 'verified' ? theme.success : status === 'rejected' ? theme.danger : theme.warning;

  return (
    <View style={[styles.badge, { backgroundColor: background, borderColor: border }]}>
      <ThemedText type="tinyBold">{verificationStatusLabels[status]}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
});
