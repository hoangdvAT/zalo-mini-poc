import { atom } from "jotai";
import type { AuthUser } from "@/types/auth";

// Global auth state
export const authTokenAtom = atom<string | null>(null);
export const userAtom = atom<AuthUser | null>(null);

/** true = guest token (browse only), false = logged-in user */
export const isGuestAtom = atom<boolean>(true);

/** Refresh token for renewal */
export const refreshTokenAtom = atom<string | null>(null);
