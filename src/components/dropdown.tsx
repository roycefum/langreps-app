import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";

type DropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  disabled?: boolean;
};

type Anchor = { x: number; y: number; width: number; height: number };

const OPTION_HEIGHT = 48;
const MAX_MENU_HEIGHT = 300;
const EDGE_MARGIN = 16;

// A compact, closed-by-default dropdown — RN has no built-in <select>, and
// @react-native-picker/picker renders as a full inline spinning wheel on
// iOS (no compact mode available there), which was too much screen space
// for a field that's just one of several settings on a builder screen.
// The options open as a menu anchored right under the field (or above it
// when there's no room below), not as a sheet at the bottom of the screen.
export function Dropdown({ value, onChange, options, disabled }: DropdownProps) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const fieldRef = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();

  function open() {
    if (disabled) return;
    fieldRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  }

  const wanted = Math.min(options.length * OPTION_HEIGHT + 8, MAX_MENU_HEIGHT);
  let menuPosition = null;
  if (anchor) {
    const spaceBelow = windowHeight - (anchor.y + anchor.height) - EDGE_MARGIN;
    const spaceAbove = anchor.y - EDGE_MARGIN;
    const openAbove = wanted > spaceBelow && spaceAbove > spaceBelow;
    menuPosition = openAbove
      ? { bottom: windowHeight - anchor.y + 4, maxHeight: Math.min(wanted, spaceAbove) }
      : { top: anchor.y + anchor.height + 4, maxHeight: Math.min(wanted, spaceBelow) };
  }

  return (
    <>
      <View ref={fieldRef} collapsable={false}>
        <PressButton
          style={[shared.input, styles.button, disabled && styles.disabled]}
          onPress={open}
        >
          <Text style={styles.value}>{value}</Text>
          {/* Without this, a Dropdown looked identical to a plain, static
              text field — nothing signaled it was tappable/editable. */}
          <Text style={styles.chevron}>▾</Text>
        </PressButton>
      </View>
      <Modal visible={anchor !== null} transparent animationType="none" onRequestClose={() => setAnchor(null)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setAnchor(null)}>
          {anchor && menuPosition && (
            // Empty onPress so a tap inside the menu doesn't fall through
            // to the backdrop's onPress and close it.
            <Animated.View
              entering={FadeIn.duration(120)}
              style={[styles.menu, { left: anchor.x, minWidth: Math.max(anchor.width, 140) }, menuPosition]}
            >
              <Pressable onPress={() => {}}>
                <FlatList
                  data={options}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => {
                    const selected = item === value;
                    return (
                      <Pressable
                        style={styles.option}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          onChange(item);
                          setAnchor(null);
                        }}
                      >
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {item}
                        </Text>
                      </Pressable>
                    );
                  }}
                />
              </Pressable>
            </Animated.View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  chevron: {
    fontSize: 20,
    color: colors.tertiary,
    fontWeight: "700",
  },
  menu: {
    position: "absolute",
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  option: {
    height: OPTION_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 17,
  },
  optionTextSelected: {
    fontWeight: "700",
    color: colors.primary,
  },
});
