import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false } = options ?? {};
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerkAuth();

  const user = useMemo(() => {
    if (!clerkUser) return null;
    return {
      openId: clerkUser.id,
      name: clerkUser.fullName || clerkUser.username || "User",
      email: clerkUser.primaryEmailAddress?.emailAddress || null,
      image: clerkUser.imageUrl,
      loginMethod: "clerk",
    };
  }, [clerkUser]);

  const state = useMemo(() => {
    // Keep this for backward compatibility if other parts of the app read from localStorage
    if (user) {
      localStorage.setItem("manus-runtime-user-info", JSON.stringify(user));
    } else {
      localStorage.removeItem("manus-runtime-user-info");
    }

    return {
      user,
      loading: !isLoaded,
      error: null,
      isAuthenticated: isSignedIn ?? false,
    };
  }, [user, isLoaded, isSignedIn]);

  const logout = useCallback(async () => {
    await signOut();
    // Redirect is handled by Clerk or the layout
    window.location.href = "/";
  }, [signOut]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (!isLoaded) return;
    if (isSignedIn) return;

    // With Clerk, we usually let the RedirectToSignIn component handle this,
    // but preserving this logic for now if specific redirect handling is needed.
    // However, since we are using Clerk, we might want to just rely on its components.
    // For now, we will do nothing here and let the specific protected route components handle redirection using <RedirectToSignIn />
    // or let the calling component handle it.

    // If we really definitely need to redirect:
    // navigate/redirect to sign in
  }, [redirectOnUnauthenticated, isLoaded, isSignedIn]);

  return {
    ...state,
    refresh: () => { }, // No-op for Clerk as it handles its own state
    logout,
  };
}
