import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";

import { BackButton } from "@/components/back-button";
import { ParsingWarning } from "@/components/parsing-warning";
import { PairsReview } from "@/components/pairs-review";
import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { detectLanguages } from "@/lib/language-detect";
import { usePairs } from "@/lib/pairs-context";
import type { VocabPair } from "@/lib/pairs-context";

export default function PasteText() {
  const { pairs, addPairs, setSourceLanguage, setTargetLanguage } = usePairs();
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skippedLines, setSkippedLines] = useState<string[]>([]);

  async function handleParse() {
    if (!rawText.trim()) return;
    // Captured before this parse's pairs are added — only auto-detect
    // language when starting a fresh list, never when appending to one
    // that already has an established language pair.
    const wasEmpty = pairs.length === 0;
    setIsParsing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("raw_text", rawText);
      const result = await apiRequest<{ pairs: VocabPair[]; skipped_lines: string[] }>(
        "/parse-vocab-text",
        { method: "POST", formData }
      );
      addPairs(result.pairs);
      setSkippedLines(result.skipped_lines);
      setRawText("");
      if (wasEmpty) {
        const detected = await detectLanguages(result.pairs);
        if (detected) {
          setSourceLanguage(detected.source_language);
          setTargetLanguage(detected.target_language);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong parsing that text.");
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/" />
      <Text style={shared.title}>Paste Vocab List</Text>

      <Text style={shared.hint}>
        One pair per line — a tab, &quot;-&gt;&quot;, &quot;:&quot;, or similar between each word
        and its translation. e.g.{"\n"}
        hello -&gt; hola
      </Text>

      <ParsingWarning />

      <TextInput
        style={styles.textArea}
        placeholder="Paste your vocab list here"
        value={rawText}
        onChangeText={setRawText}
        multiline
        numberOfLines={6}
      />

      {error && <Text style={shared.errorText}>{error}</Text>}

      {skippedLines.length > 0 && (
        <Text style={shared.errorText}>
          Couldn&apos;t parse {skippedLines.length} line{skippedLines.length === 1 ? "" : "s"}:{" "}
          {skippedLines.join(" / ")}
        </Text>
      )}

      <Pressable
        style={[
          shared.secondaryButton,
          shared.addActionButton,
          (!rawText.trim() || isParsing) && shared.primaryButtonDisabled,
        ]}
        disabled={!rawText.trim() || isParsing}
        onPress={handleParse}
      >
        <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
          {isParsing ? "Parsing…" : "Add to list"}
        </Text>
      </Pressable>

      <PairsReview source="paste" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  textArea: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 120,
    textAlignVertical: "top",
  },
  content: {
    gap: 16,
    paddingBottom: 32,
  },
});
