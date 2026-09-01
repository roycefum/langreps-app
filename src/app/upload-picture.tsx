import { Link } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

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
      formData.append("file", {
        uri: asset.uri,
        name: asset.fileName ?? "photo.jpg",
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as Blob);
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
      <Text style={shared.title}>Share a Picture</Text>
      <Text style={shared.hint}>
        A photo or screenshot of word pairs (e.g. &quot;house -&gt; casa&quot;) — AI will read the
        pairs out of it.
      </Text>

      <Pressable style={shared.secondaryButton} onPress={handleTakePhoto} disabled={isExtracting}>
        <Text style={shared.secondaryButtonText}>{isExtracting ? "Reading…" : "Take Photo"}</Text>
      </Pressable>
      <Pressable
        style={shared.secondaryButton}
        onPress={handleChooseFromLibrary}
        disabled={isExtracting}
      >
        <Text style={shared.secondaryButtonText}>
          {isExtracting ? "Reading…" : "Choose from Library"}
        </Text>
      </Pressable>

      {error && <Text style={shared.errorText}>{error}</Text>}

      <PairsReview />

      <Link href="/" style={shared.backLink}>
        <Text>← Back to Home</Text>
      </Link>
    </View>
  );
}
