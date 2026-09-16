import { useRouter, type Href } from "expo-router";
import { Alert, Pressable, Text } from "react-native";

import { shared } from "@/constants/styles";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();

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
