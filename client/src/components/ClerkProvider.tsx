import React from "react";
import { ClerkProvider as BaseClerkProvider, useAuth } from "@clerk/clerk-react";

// Clerk Provider wrapper for the application
export function ClerkProvider({ children }: { children: React.ReactNode }) {
    return (
        <BaseClerkProvider
            publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
        >
            {children}
        </BaseClerkProvider>
    );
}

// Custom hook to get Clerk auth state
export function useClerkAuth() {
    const { isSignedIn, userId, sessionId, getToken, signOut } = useAuth();

    return {
        isAuthenticated: isSignedIn,
        user: isSignedIn ? {
            id: userId || "",
            name: "Current User", // Would get from user object if available
            email: null,
            image: null,
        } : null,
        signOut: () => signOut(),
    };
}

// Authenticated component wrapper
export function Authenticated({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useClerkAuth();

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Please sign in</h2>
                    <p className="text-gray-600">You need to be authenticated to access this content.</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
