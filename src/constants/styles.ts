import { StyleSheet } from "react-native";

export const colors = {
  primary: "#88B892",
  primaryShadow: "#6f9778",
  // Triadic accent colors (same three hex bytes, cycled) — accent for
  // things that should stand apart from primary CTAs (e.g. a selected
  // picker option), tertiary for secondary links/highlights.
  accent: "#9288B8",
  accentShadow: "#787097",
  tertiary: "#B89288",
  tertiaryShadow: "#977870",
  secondaryBackground: "#eee",
  secondaryShadow: "#d4d4d4",
  border: "#ccc",
  error: "#c0392b",
  success: "#27ae60",
  // Generate Quiz specifically gets its own color, distinct from every
  // other primary button, since it's the one action that actually costs
  // a Gemini call.
  generateQuiz: "#3D6646",
  generateQuizShadow: "#325439",
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
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: colors.primaryShadow,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  generateQuizButton: {
    backgroundColor: colors.generateQuiz,
    borderBottomColor: colors.generateQuizShadow,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: colors.secondaryShadow,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  errorText: {
    color: colors.error,
  },
  backLink: {
    alignSelf: "center",
    paddingVertical: 8,
  },
});
