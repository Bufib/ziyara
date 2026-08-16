import {
  ScrollView,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ScreenProps = {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  onContentSizeChange?: (contentWidth: number, contentHeight: number) => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  safeAreaEdges?: Edge[];
  scrollViewRef?: React.RefObject<ScrollView | null>;
};

export function Screen({
  children,
  contentStyle,
  onContentSizeChange,
  onScroll,
  safeAreaEdges = ["top", "right", "bottom", "left"],
  scrollViewRef,
}: ScreenProps) {
  const theme = useTheme();

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView
        ref={scrollViewRef}
        onContentSizeChange={onContentSizeChange}
        onScroll={onScroll}
        scrollEventThrottle={500}
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    alignSelf: "center",
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: "100%",
  },
});
