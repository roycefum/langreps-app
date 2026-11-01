import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Dropdown } from "@/components/dropdown";
import { PressButton } from "@/components/press-button";
import { shared } from "@/constants/styles";
import { LOCALE_NAMES, useI18n } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/types";

type LanguageFormProps = {
  submitLabel: string;
  onSubmit: (sourceLanguage: string, targetLanguage: string) => void;
  disabled?: boolean;
};

// "I speak / I'm learning" — the one place a language mode is chosen (first
// run on Home, "Add a language" in the chip's sheet, and Settings). The
// native side starts as the phone's own language; the learning side as the
// first other language.
export function LanguageForm({ submitLabel, onSubmit, disabled }: LanguageFormProps) {
  const { t, locale } = useI18n();
  const deviceLanguage = LOCALE_NAMES[locale];
  const [source, setSource] = useState<string>(deviceLanguage);
  const [target, setTarget] = useState<string>(LANGUAGES.find((l) => l !== deviceLanguage) ?? LANGUAGES[0]);
  const same = source === target;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={shared.hint}>{t("i_speak_label")}</Text>
          <Dropdown value={source} onChange={setSource} options={LANGUAGES} disabled={disabled} />
        </View>
        <View style={styles.field}>
          <Text style={shared.hint}>{t("im_learning_label")}</Text>
          <Dropdown value={target} onChange={setTarget} options={LANGUAGES} disabled={disabled} />
        </View>
      </View>
      {same && <Text style={shared.hint}>{t("choose_different_languages")}</Text>}
      <PressButton
        style={[shared.primaryButton, (same || disabled) && shared.primaryButtonDisabled]}
        disabled={same || disabled}
        onPress={() => onSubmit(source, target)}
      >
        <Text style={shared.primaryButtonText}>{submitLabel}</Text>
      </PressButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    alignSelf: "stretch",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  field: {
    flex: 1,
    gap: 4,
  },
});
