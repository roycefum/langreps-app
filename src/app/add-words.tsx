import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { LanguagePicker } from "@/components/language-picker";
import { PairsReview } from "@/components/pairs-review";
import { shared } from "@/constants/styles";
import { usePairs } from "@/lib/pairs-context";

export default function AddWords() {
  const { addPair } = usePairs();
  const [sourceWord, setSourceWord] = useState("");
  const [targetWord, setTargetWord] = useState("");

  function handleAdd() {
    if (!sourceWord.trim() || !targetWord.trim()) return;
    addPair(sourceWord.trim(), targetWord.trim());
    setSourceWord("");
    setTargetWord("");
  }

  return (
    <View style={shared.screen}>
      <Text style={shared.title}>Add Words</Text>

      <LanguagePicker />

      <View style={shared.row}>
        <TextInput
          style={shared.input}
          placeholder="Source word"
          value={sourceWord}
          onChangeText={setSourceWord}
        />
        <TextInput
          style={shared.input}
          placeholder="Target word"
          value={targetWord}
          onChangeText={setTargetWord}
        />
      </View>

      <Pressable style={shared.secondaryButton} onPress={handleAdd}>
        <Text style={shared.secondaryButtonText}>Add to list</Text>
      </Pressable>

      <PairsReview />

      <Link href="/" style={shared.backLink}>
        <Text>← Back to Home</Text>
      </Link>
    </View>
  );
}
