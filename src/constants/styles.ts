import { StyleSheet } from "react-native";

export const colors = {
  primary: "#208AEF",
  secondaryBackground: "#eee",
  border: "#ccc",
  error: "#c0392b",
  success: "#27ae60",
};

// Shared building blocks reused across screens (buttons, inputs, layout,
// links) — screen files import these instead of redefining near-identical
// StyleSheet.create blocks. Screen-specific styles stay local to that file.
export const shared = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  screenCentered: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  hint: {
    fontSize: 13,
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    color: colors.error,
  },
  backLink: {
    alignSelf: "center",
    paddingVertical: 8,
  },
});
