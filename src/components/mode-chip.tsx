import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text } from "react-native";

import { LanguageForm } from "@/components/language-form";
import { colors } from "@/constants/styles";
import { useI18n } from "@/lib/i18n";
import { useMode } from "@/lib/mode-context";

// The always-visible language switch: shows the active mode ("English →
// Spanish") and opens a sheet to change it or add another. A mode, not a
// filter — every list and quiz screen follows whatever it says.
export function ModeChip() {
  const { t } = useI18n();
  const { mode, modes, setMode } = useMode();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  if (!mode) return null;

  function close() {
    setOpen(false);
    setAdding(false);
  }

  async function choose(source: string, target: string) {
    await setMode(source, target);
    close();
  }

  return (
    <>
      <Pressable style={styles.chip} onPress={() => setOpen(true)} hitSlop={6}>
        <Text style={styles.chipText}>
          {mode.sourceLanguage} → {mode.targetLanguage} ▾
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          {/* Inner Pressable swallows taps so touching the sheet doesn't close it. */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{t("language_mode_title")}</Text>

            {modes.map((m) => {
              const active = m.sourceLanguage === mode.sourceLanguage && m.targetLanguage === mode.targetLanguage;
              return (
                <Pressable
                  key={`${m.sourceLanguage}-${m.targetLanguage}`}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => choose(m.sourceLanguage, m.targetLanguage)}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {m.sourceLanguage} → {m.targetLanguage}
                  </Text>
                  {active && <Text style={styles.optionTextActive}>✓</Text>}
                </Pressable>
              );
            })}

            {adding ? (
              <LanguageForm submitLabel={t("add_language_button")} onSubmit={choose} />
            ) : (
              <Pressable style={styles.addLink} onPress={() => setAdding(true)}>
                <Text style={styles.addLinkText}>+ {t("add_a_language")}</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.secondaryBackground,
  },
  chipText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.tertiary,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    gap: 10,
    padding: 20,
    paddingBottom: 36,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.background,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.secondaryBackground,
  },
  optionActive: {
    backgroundColor: colors.tertiary,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  optionTextActive: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  addLink: {
    paddingVertical: 10,
  },
  addLinkText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.tertiary,
  },
});
