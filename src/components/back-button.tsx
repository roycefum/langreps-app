import { useRouter, type Href } from "expo-router";
import { Alert, Pressable, Text } from "react-native";

import { shared } from "@/constants/styles";
import { useI18n } from "@/lib/i18n";

type BackButtonProps = {
  // A fixed destination, or "back" to pop the actual navigation stack
  // instead — needed for screens reachable from more than one place (e.g.
  // Generate Quiz, reached either fresh from Home via a builder screen, or
  // from My Lists via List Details), where a single fixed href can't be right
  // for every entry point.
  href: Href | "back";
  // Called right before navigating away; return true to show a confirm
  // prompt first (e.g. unsaved words), false/omitted to navigate straight
  // through — same as the plain Link this used to be.
  confirmLeave?: () => boolean;
  // Blocks navigation entirely, no confirm prompt — for a moment where
  // leaving genuinely shouldn't be allowed (e.g. Settings' first-time
  // learning-pair save, which triggers sample-list generation server-side;
  // navigating away mid-request wouldn't stop that generation, but the
  // point is guaranteeing it's finished by the time the user could
  // possibly reach My Lists, not just "usually" finished).
  disabled?: boolean;
};

// A big, tappable arrow at the top of a screen — replaces the old small
// "← Back to X" text link that used to sit at the bottom of the screen,
// which was an awkward spot to reach for the app's main way back.
export function BackButton({ href, confirmLeave, disabled }: BackButtonProps) {
  const router = useRouter();
  const { t } = useI18n();

  function navigate() {
    if (href === "back") {
      router.back();
    } else {
      router.push(href);
    }
  }

  function handlePress() {
    if (confirmLeave?.()) {
      Alert.alert(
        t("discard_unsaved_alert_title"),
        t("discard_unsaved_alert_message"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("leave_without_saving"),
            style: "destructive",
            onPress: navigate,
          },
        ]
      );
    } else {
      navigate();
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[shared.topBackButton, disabled && shared.primaryButtonDisabled]}
    >
      <Text style={shared.topBackButtonText}>←</Text>
    </Pressable>
  );
}
