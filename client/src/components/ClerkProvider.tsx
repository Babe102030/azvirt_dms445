import React from "react";
import { ClerkProvider as BaseClerkProvider, useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

// Clerk Provider wrapper for the application
export function ClerkProvider({ children }: { children: React.ReactNode }) {
    const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

    if (!publishableKey || publishableKey === 'pk_test_placeholder') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
                <div className="max-w-md w-full space-y-4 text-center border p-8 rounded-lg shadow-lg bg-card">
                    <h1 className="text-2xl font-bold text-destructive">Clerk Configuration Required</h1>
                    <p className="text-muted-foreground">
                        The Clerk Publishable Key is missing or invalid. 
                        Please add a valid key to your <code>.env</code> file:
                    </p>
                    <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto text-left border">
                        VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_real_key
                    </pre>
                    <p className="text-sm">
                        You can get your keys from the <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Clerk Dashboard</a>.
                    </p>
                    <div className="pt-4">
                        <Button onClick={() => window.location.reload()} variant="outline">
                            Retry After Updating .env
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <BaseClerkProvider
            publishableKey={publishableKey}
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
