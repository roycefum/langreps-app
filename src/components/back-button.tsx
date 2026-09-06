import { Link, type Href } from "expo-router";
import { Text } from "react-native";

import { shared } from "@/constants/styles";

type BackButtonProps = {
  href: Href;
};

// A big, tappable arrow at the top of a screen — replaces the old small
// "← Back to X" text link that used to sit at the bottom of the screen,
// which was an awkward spot to reach for the app's main way back.
export function BackButton({ href }: BackButtonProps) {
  return (
    <Link href={href} style={shared.topBackButton}>
      <Text style={shared.topBackButtonText}>←</Text>
    </Link>
  );
}
