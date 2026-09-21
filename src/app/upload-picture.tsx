import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { BackButton } from "@/components/back-button";
import { PairsReview } from "@/components/pairs-review";
import { PressButton } from "@/components/press-button";
import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { detectLanguages } from "@/lib/language-detect";
import { usePairs } from "@/lib/pairs-context";

// The extraction endpoint returns {source_term, target_term} (matching
// data/models.py's VocabPair), which differs from the "source word"/"target
// word" shape used everywhere else in this app (matching the pairs dict
// convention from core/helpers.py). Map it once, here, at the boundary.
type ExtractedPair = { source_term: string; target_term: string };

export default function UploadPicture() {
  const { t } = useI18n();
  const { pairs, addPairs, setSourceLanguage, setTargetLanguage } = usePairs();
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function extractFromAsset(asset: ImagePicker.ImagePickerAsset) {
    // Captured before this extraction's pairs are added — only auto-detect
    // language when starting a fresh list, never when appending to one
    // that already has an established language pair.
    const wasEmpty = pairs.length === 0;
    setIsExtracting(true);
    setError(null);
    try {
      const formData = new FormData();
      // The classic RN {uri, name, type} object trick doesn't work with
      // Expo's fetch in this SDK — it needs a real Blob-compatible value,
      // which expo-file-system's File class provides.
      formData.append("file", new File(asset.uri) as unknown as Blob);
      const response = await apiRequest<{ pairs: ExtractedPair[] }>(
        "/extract-vocab-from-image",
        { method: "POST", formData }
      );
      const newPairs = response.pairs.map((p) => ({
        "source word": p.source_term,
        "target word": p.target_term,
      }));
      addPairs(newPairs);
      if (wasEmpty) {
        const detected = await detectLanguages(newPairs);
        if (detected) {
          setSourceLanguage(detected.source_language);
          setTargetLanguage(detected.target_language);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_reading_image"));
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError(t("error_camera_permission"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    await extractFromAsset(result.assets[0]);
  }

  async function handleChooseFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t("error_library_permission"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    await extractFromAsset(result.assets[0]);
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/" />
      <Text style={shared.title}>{t("share_a_picture_title")}</Text>

      <Text style={shared.hint}>{t("share_picture_instructions")}</Text>

      <PressButton
        style={[shared.secondaryButton, shared.photoActionButton]}
        onPress={handleTakePhoto}
        disabled={isExtracting}
      >
        <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
          {isExtracting ? t("reading_ellipsis") : t("take_photo")}
        </Text>
      </PressButton>
      <PressButton
        style={[shared.secondaryButton, shared.photoActionButton]}
        onPress={handleChooseFromLibrary}
        disabled={isExtracting}
      >
        <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
          {isExtracting ? t("reading_ellipsis") : t("choose_from_library")}
        </Text>
      </PressButton>

      {error && <Text style={shared.errorText}>{error}</Text>}

      <PairsReview source="photo" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 32,
  },
});
