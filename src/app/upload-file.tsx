import * as DocumentPicker from "expo-document-picker";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

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

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/plain", "text/csv", "*/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const file = result.assets[0];
    setLastFileName(file.name);
    setIsParsing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? "text/plain",
      } as unknown as Blob);
      const response = await apiRequest<{ pairs: VocabPair[] }>("/parse-vocab-text", {
        method: "POST",
        formData,
      });
      addPairs(response.pairs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong parsing that file.");
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <View style={shared.screen}>
      <Text style={shared.title}>Upload a File</Text>
      <Text style={shared.hint}>
        A plain text or CSV file with one pair per line, separated by a tab, &quot;-&gt;&quot;, or
        &quot;:&quot;.
      </Text>

      <Pressable style={shared.secondaryButton} onPress={handlePickFile} disabled={isParsing}>
        <Text style={shared.secondaryButtonText}>{isParsing ? "Parsing…" : "Choose File"}</Text>
      </Pressable>

      {lastFileName && !error && <Text style={shared.hint}>Last file: {lastFileName}</Text>}
      {error && <Text style={shared.errorText}>{error}</Text>}

      <PairsReview />

      <Link href="/" style={shared.backLink}>
        <Text>← Back to Home</Text>
      </Link>
    </View>
  );
}
