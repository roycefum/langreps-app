import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { BackButton } from "@/components/back-button";
import { LanguageOrderConfirm } from "@/components/language-order-confirm";
import { PairsReview } from "@/components/pairs-review";
import { TranslateSkippedLines } from "@/components/translate-skipped-lines";
import { PressButton } from "@/components/press-button";
import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { detectLanguages } from "@/lib/language-detect";
import { usePairs } from "@/lib/pairs-context";
import type { VocabPair } from "@/lib/pairs-context";
import { swapPairLanguages } from "@/lib/text";

type PendingOrder = { firstLanguage: string; secondLanguage: string };

export default function UploadFile() {
  const { t } = useI18n();
  const { pairs, addPairs, setPairs, setSourceLanguage, setTargetLanguage } = usePairs();
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState<string | null>(null);
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

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/plain", "text/csv", "*/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const pickedFile = result.assets[0];
    // Captured before this parse's pairs are added — only auto-detect
    // language when starting a fresh list, never when appending to one
    // that already has an established language pair.
    const wasEmpty = pairs.length === 0;
    setLastFileName(pickedFile.name);
    setIsParsing(true);
    setError(null);
    try {
      const formData = new FormData();
      // The classic RN {uri, name, type} object trick doesn't work with
      // Expo's fetch in this SDK — it needs a real Blob-compatible value,
      // which expo-file-system's File class provides.
      formData.append("file", new File(pickedFile.uri) as unknown as Blob);
      const response = await apiRequest<{ pairs: VocabPair[]; skipped_lines: string[] }>(
        "/parse-vocab-text",
        { method: "POST", formData }
      );
      addPairs(response.pairs);
      setSkippedLines(response.skipped_lines);
      if (wasEmpty && response.pairs.length > 0) {
        const detected = await detectLanguages(response.pairs);
        if (detected) {
          setPendingOrder({
            firstLanguage: detected.source_language,
            secondLanguage: detected.target_language,
          });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_parsing_file"));
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/" />
      <Text style={shared.title}>{t("upload_a_file_title")}</Text>

      <Text style={shared.hint}>{t("upload_file_instructions")}</Text>

      <PressButton
        style={[shared.secondaryButton, shared.fileActionButton]}
        onPress={handlePickFile}
        disabled={isParsing}
      >
        <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
          {isParsing ? t("parsing_ellipsis") : t("choose_file")}
        </Text>
      </PressButton>

      {lastFileName && !error && (
        <Text style={shared.hint}>{t("last_file", { name: lastFileName })}</Text>
      )}
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
            // The translated words' own language isn't necessarily the
            // user's known language — e.g. translating a French textbook
            // list you're trying to learn FROM means French should end up
            // as the learning language, not "known" just because it was
            // the original text. Ask instead of assuming.
            setPendingOrder({ firstLanguage: detectedSource, secondLanguage: chosenTarget });
          } else {
            setSourceLanguage(detectedSource);
            setTargetLanguage(chosenTarget);
          }
        }}
      />

      <PairsReview source="file" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 32,
  },
});
