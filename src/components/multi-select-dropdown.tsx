import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { useI18n } from "@/lib/i18n";

type Option = { value: string; label: string };

type MultiSelectDropdownProps = {
  // What the closed field shows — built by the caller (e.g. "Preterite,
  // Imperfect" or a placeholder when nothing's selected yet), since with
  // more than one selected there's no single option to show as-is the way
  // a plain Dropdown shows its one value.
  displayValue: string;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  options: readonly Option[];
  disabled?: boolean;
};

type Anchor = { x: number; y: number; width: number; height: number };

const OPTION_HEIGHT = 48;
const MAX_MENU_HEIGHT = 300;
const EDGE_MARGIN = 16;

// Same anchored-menu shell as Dropdown, but for choosing several options at
// once instead of one — built specifically because some option sets (e.g.
// verb tenses: "Present Subjunctive (presente de subjuntivo)") have labels
// far too long to lay out as a row of pills, wrapping or otherwise, without
// the field's height becoming unpredictable as selections change. A
// checkbox list that stays open until dismissed keeps the collapsed field's
// size constant regardless of how many options are picked.
export function MultiSelectDropdown({
  displayValue,
  selectedValues,
  onChange,
  options,
  disabled,
}: MultiSelectDropdownProps) {
  const { t } = useI18n();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const fieldRef = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();

  function open() {
    if (disabled) return;
    fieldRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  }

  function toggle(value: string) {
    Haptics.selectionAsync().catch(() => {});
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  }

  // +1 row's worth of height for the "Done" footer.
  const wanted = Math.min((options.length + 1) * OPTION_HEIGHT + 8, MAX_MENU_HEIGHT);
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
          <Text style={styles.value} numberOfLines={1}>
            {displayValue}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </PressButton>
      </View>
      <Modal visible={anchor !== null} transparent animationType="none" onRequestClose={() => setAnchor(null)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setAnchor(null)}>
          {anchor && menuPosition && (
            <Animated.View
              entering={FadeIn.duration(120)}
              style={[styles.menu, { left: anchor.x, minWidth: Math.max(anchor.width, 220) }, menuPosition]}
            >
              {/* Empty onPress so a tap inside the menu doesn't fall through
                  to the backdrop's onPress and close it. */}
              <Pressable onPress={() => {}}>
                <FlatList
                  data={options}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => {
                    const selected = selectedValues.includes(item.value);
                    return (
                      <Pressable style={styles.option} onPress={() => toggle(item.value)}>
                        <Text style={styles.checkboxMark}>{selected ? "☑" : "☐"}</Text>
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  }}
                />
                <Pressable style={styles.doneRow} onPress={() => setAnchor(null)}>
                  <Text style={styles.doneText}>{t("done_label")}</Text>
                </Pressable>
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
    flex: 1,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  checkboxMark: {
    fontSize: 20,
    color: colors.tertiary,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
  },
  optionTextSelected: {
    fontWeight: "700",
    color: colors.primary,
  },
  doneRow: {
    height: OPTION_HEIGHT,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  doneText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
});
