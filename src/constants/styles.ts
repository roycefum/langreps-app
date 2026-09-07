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
  // One color per distinct action on the vocab-builder screens — "Add to
  // list" (add-words, paste-text), "Choose File" (upload-file), and
  // "Take Photo"/"Choose from Library" (upload-picture, same function:
  // extract pairs from an image) each get their own color so the builder
  // screens don't all look like plain grey secondary buttons.
  addAction: "#88B892",
  addActionShadow: "#6f9778",
  fileAction: "#8896B8",
  fileActionShadow: "#707b97",
  photoAction: "#B888AE",
  photoActionShadow: "#97708f",
  // Every builder screen's Save List button shares this one color, since
  // it's the same save function everywhere (PairsReview is one shared
  // component) — distinct from the per-screen action colors above.
  saveAction: "#B8AA88",
  saveActionShadow: "#978b70",
  secondaryBackground: "#eee",
  secondaryShadow: "#d4d4d4",
  // Darker than a typical light-grey border/text — the parchment
  // background (colors.background) washes out anything too pale.
  border: "#9C8F6E",
  error: "#c0392b",
  success: "#27ae60",
  // Generate Quiz specifically gets its own color, distinct from every
  // other primary button, since it's the one action that actually costs
  // a Gemini call.
  generateQuiz: "#3D6646",
  generateQuizShadow: "#325439",
  background: "#F5EFD5",
  // Default body text color — dark brown rather than pure black, to sit
  // better against the parchment background than stark black would.
  text: "#2E2718",
};

// Shared building blocks reused across screens (buttons, inputs, layout,
// links) — screen files import these instead of redefining near-identical
// StyleSheet.create blocks. Screen-specific styles stay local to that file.
export const shared = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    gap: 16,
    backgroundColor: colors.background,
  },
  screenCentered: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  hint: {
    fontSize: 13,
    color: colors.text,
    opacity: 0.7,
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
    color: colors.text,
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
  // Colorful variants of secondaryButton for the vocab-builder screens'
  // action buttons — plain grey read as too dull/inactive-looking for the
  // main action on those screens.
  addActionButton: {
    backgroundColor: colors.addAction,
    borderBottomColor: colors.addActionShadow,
  },
  fileActionButton: {
    backgroundColor: colors.fileAction,
    borderBottomColor: colors.fileActionShadow,
  },
  photoActionButton: {
    backgroundColor: colors.photoAction,
    borderBottomColor: colors.photoActionShadow,
  },
  saveActionButton: {
    backgroundColor: colors.saveAction,
    borderBottomColor: colors.saveActionShadow,
  },
  myListsButton: {
    backgroundColor: colors.tertiary,
    borderBottomColor: colors.tertiaryShadow,
  },
  accentButtonText: {
    color: "white",
  },
  errorText: {
    color: colors.error,
  },
  backLink: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  topBackButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  topBackButtonText: {
    fontSize: 32,
    lineHeight: 32,
    fontWeight: "600",
  },
});
