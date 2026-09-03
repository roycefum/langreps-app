import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, shared } from "@/constants/styles";

type DropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
};

// A compact, closed-by-default dropdown — RN has no built-in <select>, and
// @react-native-picker/picker renders as a full inline spinning wheel on
// iOS (no compact mode available there), which was too much screen space
// for a field that's just one of several settings on a builder screen.
export function Dropdown({ value, onChange, options }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Pressable style={shared.input} onPress={() => setIsOpen(true)}>
        <Text>{value}</Text>
      </Pressable>
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          {/* Empty onPress so a tap inside the sheet doesn't fall through
              to the backdrop's onPress and close it. */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <Pressable
                    style={styles.option}
                    onPress={() => {
                      onChange(item);
                      setIsOpen(false);
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
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "60%",
    paddingVertical: 8,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 16,
  },
  optionTextSelected: {
    fontWeight: "700",
    color: colors.primary,
  },
});
