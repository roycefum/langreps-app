import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Dropdown } from "@/components/dropdown";
import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
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
      setError(e instanceof Error ? e.message : "Something went wrong translating those words.");
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={shared.hint}>
        {lines.length} line{lines.length === 1 ? "" : "s"} looked like single word
        {lines.length === 1 ? "" : "s"}, not pairs — translate into:
      </Text>
      <View style={styles.row}>
        <Dropdown value={targetLanguage} onChange={setTargetLanguage} options={LANGUAGES} />
        <Pressable
          style={[shared.secondaryButton, shared.addActionButton, styles.button]}
          onPress={handleTranslate}
          disabled={isTranslating}
        >
          <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
            {isTranslating ? "Translating…" : "Translate"}
          </Text>
        </Pressable>
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
