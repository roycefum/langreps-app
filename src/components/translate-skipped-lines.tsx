import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Dropdown } from "@/components/dropdown";
import { PressButton } from "@/components/press-button";
import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { VocabPair } from "@/lib/pairs-context";
import { LANGUAGES } from "@/lib/types";

type TranslateSkippedLinesProps = {
  // Lines that failed to split into a pair (parse_pasted_list's
  // skipped_lines) — the signal that this might be a monolingual list
  // (e.g. a textbook vocab list with no translations) rather than
  // malformed input.
  lines: string[];
  onTranslated: (pairs: VocabPair[], sourceLanguage: string, targetLanguage: string) => void;
};

// Shown under a parse's "couldn't parse N lines" message on Upload File and
// Paste Vocab List — offers to translate those leftover single-word lines
// into a language of the user's choice instead of leaving them stuck as
// unusable skipped lines.
export function TranslateSkippedLines({ lines, onTranslated }: TranslateSkippedLinesProps) {
  const { t } = useI18n();
  const [targetLanguage, setTargetLanguage] = useState<string>(LANGUAGES[0]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (lines.length === 0) return null;

  async function handleTranslate() {
    setIsTranslating(true);
    setError(null);
    try {
      const result = await apiRequest<{ source_language: string; pairs: VocabPair[] }>(
        "/translate-word-list",
        { method: "POST", body: { words: lines, target_language: targetLanguage } }
      );
      onTranslated(result.pairs, result.source_language, targetLanguage);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_translating"));
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={shared.hint}>
        {t("translate_prompt_template", { n: lines.length })}
      </Text>
      <View style={styles.row}>
        <Dropdown value={targetLanguage} onChange={setTargetLanguage} options={LANGUAGES} />
        <PressButton
          style={[shared.secondaryButton, shared.addActionButton, styles.button]}
          onPress={handleTranslate}
          disabled={isTranslating}
        >
          <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
            {isTranslating ? t("translating_ellipsis") : t("translate_button")}
          </Text>
        </PressButton>
      </View>
      {error && <Text style={shared.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    flex: 1,
  },
});
