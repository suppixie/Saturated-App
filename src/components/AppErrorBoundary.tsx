import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { captureCrash } from "../../lib/telemetry";
import { C, F } from "../theme";

type State = { failed: boolean };

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    void captureCrash(error, {
      source: "react_error_boundary",
      component_stack: info.componentStack?.slice(0, 100),
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View accessibilityRole="alert" style={styles.screen}>
        <Text style={styles.brand}>Saturated</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.copy}>
          The issue was recorded without including your review text or personal details.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try loading Saturated again"
          onPress={() => this.setState({ failed: false })}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 30, alignItems: "center", justifyContent: "center", backgroundColor: C.cream },
  brand: { fontFamily: F.display, fontSize: 35, color: C.red },
  title: { marginTop: 30, fontFamily: F.bold, fontSize: 20, color: C.ink },
  copy: { maxWidth: 320, marginTop: 10, textAlign: "center", fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.teal },
  button: { minWidth: 180, minHeight: 48, marginTop: 24, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: C.red },
  buttonText: { fontFamily: F.bold, fontSize: 14, color: "#fff" },
});
