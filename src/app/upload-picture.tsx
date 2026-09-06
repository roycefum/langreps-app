import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { LanguagePicker } from "@/components/language-picker";
import { PairsReview } from "@/components/pairs-review";
import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { usePairs } from "@/lib/pairs-context";

// The extraction endpoint returns {source_term, target_term} (matching
// data/models.py's VocabPair), which differs from the "source word"/"target
// word" shape used everywhere else in this app (matching the pairs dict
// convention from core/helpers.py). Map it once, here, at the boundary.
type ExtractedPair = { source_term: string; target_term: string };

export default function UploadPicture() {
  const { addPairs } = usePairs();
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function extractFromAsset(asset: ImagePicker.ImagePickerAsset) {
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
      addPairs(
        response.pairs.map((p) => ({
          "source word": p.source_term,
          "target word": p.target_term,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong reading that image.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera access is needed to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    await extractFromAsset(result.assets[0]);
  }

  async function handleChooseFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed to choose an image.");
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
    <View style={shared.screen}>
      <BackButton href="/" />
      <Text style={shared.title}>Share a Picture</Text>

      <LanguagePicker />

      <Text style={shared.hint}>
        A photo or screenshot of word pairs (e.g. &quot;house -&gt; casa&quot;) — AI will read the
        pairs out of it.
      </Text>

      <Pressable
        style={[shared.secondaryButton, shared.photoActionButton]}
        onPress={handleTakePhoto}
        disabled={isExtracting}
      >
        <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
          {isExtracting ? "Reading…" : "Take Photo"}
        </Text>
      </Pressable>
      <Pressable
        style={[shared.secondaryButton, shared.photoActionButton]}
        onPress={handleChooseFromLibrary}
        disabled={isExtracting}
      >
        <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
          {isExtracting ? "Reading…" : "Choose from Library"}
        </Text>
      </Pressable>

      {error && <Text style={shared.errorText}>{error}</Text>}

      <PairsReview source="photo" />
    </View>
  );
}
