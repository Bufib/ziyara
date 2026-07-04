import { Linking, StyleSheet, View } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { Button, type ButtonVariant } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import type { SourceReference } from '@/domain/types';
import { useI18n } from '@/features/i18n/i18n';

type SourceReferenceListProps = {
  emptyMessage?: string;
  openButtonLabel?: string;
  openButtonVariant?: ButtonVariant;
  showExcerpt?: boolean;
  showLastChecked?: boolean;
  showNotes?: boolean;
  showOpenButton?: boolean;
  showPolicy?: boolean;
  showUrl?: boolean;
  sources: SourceReference[];
  titleType?: ThemedTextProps['type'];
};

type SourceLinkButtonsProps = {
  label?: string;
  sources: SourceReference[];
  variant?: ButtonVariant;
};

function hasUrl(source: SourceReference): source is SourceReference & { url: string } {
  return Boolean(source.url);
}

function openUrl(url: string) {
  void Linking.openURL(url);
}

export function SourceLinkButtons({
  label,
  sources,
  variant = 'secondary',
}: SourceLinkButtonsProps) {
  const { t } = useI18n();
  const linkedSources = sources.filter(hasUrl);
  const buttonLabel = label ?? t('common.openSource');

  if (linkedSources.length === 0) {
    return null;
  }

  return (
    <View style={styles.actions}>
      {linkedSources.map((source) => (
        <Button
          icon="external-link"
          key={source.id}
          label={buttonLabel}
          variant={variant}
          onPress={() => openUrl(source.url)}
        />
      ))}
    </View>
  );
}

export function SourceReferenceList({
  emptyMessage,
  openButtonLabel,
  openButtonVariant = 'secondary',
  showExcerpt = true,
  showLastChecked = true,
  showNotes = false,
  showOpenButton = false,
  showPolicy = true,
  showUrl = true,
  sources,
  titleType = 'smallBold',
}: SourceReferenceListProps) {
  const { t } = useI18n();

  if (sources.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        {emptyMessage ?? t('sources.empty')}
      </ThemedText>
    );
  }

  return (
    <View style={styles.list}>
      {sources.map((source) => (
        <View key={source.id} style={styles.item}>
          <ThemedText type={titleType}>{source.title}</ThemedText>
          {showNotes ? (
            <ThemedText type="small" themeColor="textSecondary">
              {source.notes}
            </ThemedText>
          ) : null}
          {showExcerpt && source.quotedExcerpt ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('sources.excerptPrefix', { excerpt: source.quotedExcerpt })}
            </ThemedText>
          ) : null}
          {showPolicy && source.contentPolicy ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('sources.policyPrefix', {
                status: t(`labels.sourcePolicy.${source.contentPolicy}`),
              })}
            </ThemedText>
          ) : null}
          {showLastChecked && source.lastCheckedAt ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('sources.lastChecked', { date: source.lastCheckedAt })}
            </ThemedText>
          ) : null}
          {showUrl && source.url ? (
            <ThemedText type="small" themeColor="accent">
              {source.url}
            </ThemedText>
          ) : null}
          {showOpenButton ? (
            <SourceLinkButtons
              label={openButtonLabel ?? t('common.openSource')}
              sources={[source]}
              variant={openButtonVariant}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  item: {
    gap: Spacing.half,
  },
  list: {
    gap: Spacing.three,
  },
});
