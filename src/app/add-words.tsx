import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { BackButton } from "@/components/back-button";
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
      <BackButton href="/" />
      <Text style={shared.title}>Add Words</Text>

      <LanguagePicker />

      <View style={shared.row}>
        <TextInput
          style={[shared.input, styles.rowInput]}
          placeholder="Source word"
          value={sourceWord}
          onChangeText={setSourceWord}
        />
        <TextInput
          style={[shared.input, styles.rowInput]}
          placeholder="Target word"
          value={targetWord}
          onChangeText={setTargetWord}
        />
      </View>

      <Pressable style={[shared.secondaryButton, shared.addActionButton]} onPress={handleAdd}>
        <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>Add to list</Text>
      </Pressable>

      <PairsReview source="manual" />
    </View>
  );
}

const styles = StyleSheet.create({
  rowInput: {
    flex: 1,
  },
});
