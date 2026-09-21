import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput } from "react-native";

import { BackButton } from "@/components/back-button";
import { LanguageOrderConfirm } from "@/components/language-order-confirm";
import { PairsReview } from "@/components/pairs-review";
import { TranslateSkippedLines } from "@/components/translate-skipped-lines";
import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { detectLanguages } from "@/lib/language-detect";
import { usePairs } from "@/lib/pairs-context";
import type { VocabPair } from "@/lib/pairs-context";
import { swapPairLanguages } from "@/lib/text";

type PendingOrder = { firstLanguage: string; secondLanguage: string };

export default function PasteText() {
  const { t } = useI18n();
  const { pairs, addPairs, setPairs, setSourceLanguage, setTargetLanguage } = usePairs();
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skippedLines, setSkippedLines] = useState<string[]>([]);
  // Set right after a fresh parse detects the two languages involved —
  // never assumed to be known-then-learning order (a textbook list often
  // puts the foreign/learning word first) until the user confirms which
  // one they actually know.
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);

  function confirmLanguageOrder(knownIsFirst: boolean) {
    if (!pendingOrder) return;
    if (knownIsFirst) {
      setSourceLanguage(pendingOrder.firstLanguage);
      setTargetLanguage(pendingOrder.secondLanguage);
    } else {
      setSourceLanguage(pendingOrder.secondLanguage);
      setTargetLanguage(pendingOrder.firstLanguage);
      setPairs(swapPairLanguages(pairs));
    }
    setPendingOrder(null);
  }

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
      if (wasEmpty && result.pairs.length > 0) {
        const detected = await detectLanguages(result.pairs);
        if (detected) {
          setPendingOrder({
            firstLanguage: detected.source_language,
            secondLanguage: detected.target_language,
          });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_parsing_text"));
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/" />
      <Text style={shared.title}>{t("paste_vocab_list_title")}</Text>

      <Text style={shared.hint}>{t("paste_instructions")}</Text>

      <TextInput
        style={styles.textArea}
        placeholder={t("paste_placeholder")}
        placeholderTextColor={colors.placeholder}
        value={rawText}
        onChangeText={setRawText}
        multiline
        numberOfLines={6}
      />

      {error && <Text style={shared.errorText}>{error}</Text>}

      {skippedLines.length > 0 && (
        <Text style={shared.errorText}>
          {t("couldnt_parse_lines", { n: skippedLines.length, list: skippedLines.join(" / ") })}
        </Text>
      )}

      {pendingOrder && (
        <LanguageOrderConfirm
          firstLanguage={pendingOrder.firstLanguage}
          secondLanguage={pendingOrder.secondLanguage}
          onConfirm={confirmLanguageOrder}
        />
      )}

      <TranslateSkippedLines
        lines={skippedLines}
        onTranslated={(newPairs, detectedSource, chosenTarget) => {
          const wasEmptyBeforeTranslate = pairs.length === 0;
          addPairs(newPairs);
          setSkippedLines([]);
          if (wasEmptyBeforeTranslate) {
            setPendingOrder({ firstLanguage: detectedSource, secondLanguage: chosenTarget });
          } else {
            setSourceLanguage(detectedSource);
            setTargetLanguage(chosenTarget);
          }
        }}
      />

      <PressButton
        style={[
          shared.secondaryButton,
          shared.addActionButton,
          (!rawText.trim() || isParsing) && shared.primaryButtonDisabled,
        ]}
        disabled={!rawText.trim() || isParsing}
        onPress={handleParse}
      >
        <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
          {isParsing ? t("parsing_ellipsis") : t("add_to_list")}
        </Text>
      </PressButton>

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
