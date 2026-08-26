import { Component, type PropsWithChildren } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.card}>
          <Text style={styles.title}>Etwas ist schiefgelaufen</Text>
          <Text style={styles.body}>
            Die App konnte diesen Bildschirm nicht anzeigen. Deine lokalen Inhalte bleiben erhalten.
          </Text>
          <Text style={styles.translation}>Something went wrong. Please try again.</Text>
          <Pressable accessibilityRole="button" onPress={this.retry} style={styles.button}>
            <Text style={styles.buttonText}>Erneut versuchen / Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  body: {
    color: '#42534D',
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#16805F',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CAD8D2',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
    maxWidth: 520,
    padding: 24,
    width: '100%',
  },
  safeArea: {
    backgroundColor: '#F4F7F6',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#17221E',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  translation: {
    color: '#5D6B66',
    fontSize: 14,
    lineHeight: 20,
  },
});
