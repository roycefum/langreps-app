import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { Dropdown } from "@/components/dropdown";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";

// Admin-only: fake quiz history for exercising feedback features without
// taking real quizzes. English-only on purpose (never shown to regular
// users). Home only links here when the server reports is_admin (from its
// ADMIN_EMAILS), this screen re-checks that itself, and the /debug
// endpoints enforce it again server-side — the client checks are just so
// non-admins never see a dead screen.

type ListSummary = { id: string; name: string };

const TRENDS: { key: string; label: string }[] = [
  { key: "improving_a_lot", label: "Improving a lot" },
  { key: "improving", label: "Improving" },
  { key: "steady", label: "Steady" },
  { key: "declining", label: "Declining" },
  { key: "declining_a_lot", label: "Declining a lot" },
];

export default function Debug() {
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ is_admin: boolean }>("/me/profile")
      .then((profile) => {
        setIsAdmin(profile.is_admin);
        if (!profile.is_admin) return;
        return apiRequest<{ lists: ListSummary[] }>("/lists").then((result) => {
          setLists(result.lists);
          setSelectedName(result.lists[0]?.name ?? null);
        });
      })
      .catch((e) => {
        setIsAdmin(false);
        setError(e instanceof Error ? e.message : "Couldn't load");
      });
  }, []);

  if (!isAdmin) return null;

  const selectedList = lists.find((l) => l.name === selectedName);

  async function run(path: string, body: object | undefined, success: string) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await apiRequest(path, { method: "POST", body });
      setMessage(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/" />
      <Text style={shared.title}>Admin tools</Text>
      <Text style={shared.hint}>
        Fake quiz history for testing feedback. Everything seeded is tagged and removed by
        &quot;Clear seeded data&quot;. Seeded quizzes show up in My Quizzes and Progress until cleared.
      </Text>

      {lists.length === 0 ? (
        <Text style={shared.hint}>No saved lists to seed against.</Text>
      ) : (
        <>
          <Text style={styles.sectionTitle}>List to seed</Text>
          <Dropdown
            value={selectedName ?? ""}
            onChange={setSelectedName}
            options={lists.map((l) => l.name)}
          />

          <Text style={styles.sectionTitle}>Tailored insight (Generate Quiz + Quiz Complete)</Text>
          <Text style={shared.hint}>
            Adds 2 wrong answers on each of the list&apos;s first 3 words. Reopen Generate Quiz for that
            list to see the message and the Target My Mistakes button.
          </Text>
          <Pressable
            style={[shared.secondaryButton, busy && shared.primaryButtonDisabled]}
            disabled={busy || !selectedList}
            onPress={() =>
              run("/debug/seed-missed-words", { list_id: selectedList?.id }, "Seeded missed words.")
            }
          >
            <Text style={shared.secondaryButtonText}>Seed missed words</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>Progress trend message</Text>
          <Text style={shared.hint}>
            Creates 4 completed quizzes with that score pattern. Open the list&apos;s Progress screen.
          </Text>
          {TRENDS.map((trend) => (
            <Pressable
              key={trend.key}
              style={[shared.secondaryButton, busy && shared.primaryButtonDisabled]}
              disabled={busy || !selectedList}
              onPress={() =>
                run(
                  "/debug/seed-history",
                  { list_id: selectedList?.id, trend: trend.key },
                  `Seeded history: ${trend.label}. Clear before seeding a different trend.`
                )
              }
            >
              <Text style={shared.secondaryButtonText}>{trend.label}</Text>
            </Pressable>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Cleanup</Text>
      <Pressable
        style={[shared.secondaryButton, busy && shared.primaryButtonDisabled]}
        disabled={busy}
        onPress={() => run("/debug/clear-seeded", undefined, "Cleared all seeded data.")}
      >
        <Text style={[shared.secondaryButtonText, styles.clearText]}>Clear seeded data</Text>
      </Pressable>

      <View>
        {message && <Text style={styles.success}>{message}</Text>}
        {error && <Text style={shared.errorText}>{error}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
    color: colors.text,
  },
  clearText: {
    color: colors.error,
  },
  success: {
    color: colors.success,
    fontWeight: "600",
  },
});
