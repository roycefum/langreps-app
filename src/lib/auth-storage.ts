import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "langreps_access_token";
const REFRESH_TOKEN_KEY = "langreps_refresh_token";
const USER_ID_KEY = "langreps_user_id";

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

// expo-secure-store has no web implementation at all (it throws, not just
// no-ops), and this app is mobile-only — web is a convenience for local dev
// preview, not a target platform. Treat web as "never has a stored session"
// rather than crashing.
const isWeb = Platform.OS === "web";

export async function saveSession(session: StoredSession) {
  if (isWeb) return;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken),
    SecureStore.setItemAsync(USER_ID_KEY, session.userId),
  ]);
}

export async function getStoredSession(): Promise<StoredSession | null> {
  if (isWeb) return null;
  const [accessToken, refreshToken, userId] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(USER_ID_KEY),
  ]);
  if (!accessToken || !refreshToken || !userId) return null;
  return { accessToken, refreshToken, userId };
}

export async function clearSession() {
  if (isWeb) return;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_ID_KEY),
  ]);
}
