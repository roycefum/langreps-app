import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { EssentialsView } from "@/components/essentials-view";
import { ModeChip } from "@/components/mode-chip";
import { MyListsView } from "@/components/my-lists-view";
import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { inMode, useMode } from "@/lib/mode-context";

type TabKey = "mine" | "essentials";

// Flattened because Link asChild's Slot rejects an array of styles on its child.
const loginButtonStyle = StyleSheet.flatten([
  shared.secondaryButton,
  shared.addActionButton,
  { alignSelf: "stretch" as const },
]);

// One home for every list: the learner's own (My Lists) and the ready-made
// ones (Essentials), as two equal tabs. Which opens first depends on who is
// looking — someone with no lists yet lands on Essentials, since that is what
// gets them started; someone with lists lands on their own.
export default function Lists() {
  const { t } = useI18n();
  const { userId } = useAuth();
  const { mode } = useMode();
  const { tab: requestedTab } = useLocalSearchParams<{ tab?: string }>();
  // null while the default is being decided, so the wrong tab never flashes.
  const [tab, setTab] = useState<TabKey | null>(null);

  useEffect(() => {
    if (requestedTab === "mine" || requestedTab === "essentials") {
      setTab(requestedTab);
      return;
    }
    if (!userId) {
      setTab("essentials");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await apiRequest<{ lists: { source_language: string; target_language: string }[] }>(
          "/lists"
        );
        const hasLists = result.lists.some((l) => inMode(mode, l));
        if (!cancelled) setTab(hasLists ? "mine" : "essentials");
      } catch {
        // can't tell — the learner's own lists are the safer place to start
        if (!cancelled) setTab("mine");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, requestedTab, mode]);

  return (
    <View style={shared.screen}>
      <BackButton href="/" />
      <Text style={shared.title}>{t("lists")}</Text>
      <ModeChip />

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, tab === "mine" && styles.tabActive]}
          onPress={() => setTab("mine")}
        >
          <Text style={[styles.tabText, tab === "mine" && styles.tabTextActive]}>{t("my_lists")}</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "essentials" && styles.tabActive]}
          onPress={() => setTab("essentials")}
        >
          <Text style={[styles.tabText, tab === "essentials" && styles.tabTextActive]}>
            {t("essentials")}
          </Text>
        </Pressable>
      </View>

      {tab === null && <Text style={shared.hint}>{t("loading_ellipsis")}</Text>}

      {tab === "mine" &&
        (userId ? (
          <MyListsView onBrowseEssentials={() => setTab("essentials")} />
        ) : (
          <View style={styles.notice}>
            <Text style={shared.hint}>{t("lists_signin_prompt")}</Text>
            <Link href="/login" asChild>
              <PressButton style={loginButtonStyle}>
                <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
                  {t("log_in_sign_up")}
                </Text>
              </PressButton>
            </Link>
          </View>
        ))}

      {tab === "essentials" && <EssentialsView />}
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
  },
  tabActive: {
    backgroundColor: colors.tertiary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  tabTextActive: {
    color: "white",
  },
  notice: {
    gap: 10,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 10,
    padding: 14,
  },
});
