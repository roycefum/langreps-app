import { useRouter, type Href } from "expo-router";
import { Alert, Pressable, Text } from "react-native";

import { shared } from "@/constants/styles";

type BackButtonProps = {
  href: Href;
  // Called right before navigating away; return true to show a confirm
  // prompt first (e.g. unsaved words), false/omitted to navigate straight
  // through — same as the plain Link this used to be.
  confirmLeave?: () => boolean;
};

// A big, tappable arrow at the top of a screen — replaces the old small
// "← Back to X" text link that used to sit at the bottom of the screen,
// which was an awkward spot to reach for the app's main way back.
export function BackButton({ href, confirmLeave }: BackButtonProps) {
  const router = useRouter();

  function handlePress() {
    if (confirmLeave?.()) {
      Alert.alert(
        "Discard unsaved words?",
        "You've added words that haven't been saved yet. Leaving now will lose them.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave Without Saving",
            style: "destructive",
            onPress: () => router.push(href),
          },
        ]
      );
    } else {
      router.push(href);
    }
  }

  return (
    <Pressable onPress={handlePress} style={shared.topBackButton}>
      <Text style={shared.topBackButtonText}>←</Text>
    </Pressable>
  );
}
