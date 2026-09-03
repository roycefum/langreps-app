import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { CefrLevelPicker } from "@/components/cefr-level-picker";
import { LanguagePicker } from "@/components/language-picker";
import { ParsingWarning } from "@/components/parsing-warning";
import { PairsReview } from "@/components/pairs-review";
import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { usePairs } from "@/lib/pairs-context";
import type { VocabPair } from "@/lib/pairs-context";

export default function UploadFile() {
  const { addPairs } = usePairs();
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState<string | null>(null);
  const [skippedLines, setSkippedLines] = useState<string[]>([]);

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/plain", "text/csv", "*/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const pickedFile = result.assets[0];
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong parsing that file.");
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <View style={shared.screen}>
      <Text style={shared.title}>Upload a File</Text>

      <LanguagePicker />
      <CefrLevelPicker />

      <Text style={shared.hint}>
        A plain text or CSV file, one pair per line — a tab, &quot;-&gt;&quot;, &quot;:&quot;, or
        similar between each word and its translation.
      </Text>

      <ParsingWarning />

      <Pressable style={shared.secondaryButton} onPress={handlePickFile} disabled={isParsing}>
        <Text style={shared.secondaryButtonText}>{isParsing ? "Parsing…" : "Choose File"}</Text>
      </Pressable>

      {lastFileName && !error && <Text style={shared.hint}>Last file: {lastFileName}</Text>}
      {error && <Text style={shared.errorText}>{error}</Text>}

      {skippedLines.length > 0 && (
        <Text style={shared.errorText}>
          Couldn&apos;t parse {skippedLines.length} line{skippedLines.length === 1 ? "" : "s"}:{" "}
          {skippedLines.join(" / ")}
        </Text>
      )}

      <PairsReview source="file" />

      <Link href="/" style={shared.backLink}>
        <Text>← Back to Home</Text>
      </Link>
    </View>
  );
}
