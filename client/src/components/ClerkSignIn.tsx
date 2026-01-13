import React from "react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";

export function ClerkSignIn() {
    const { isSignedIn } = useUser();

    return (
        <div className="flex items-center space-x-4">
            {!isSignedIn ? (
                <>
                    <SignInButton mode="modal">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                            Sign In
                        </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                        <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                            Sign Up
                        </button>
                    </SignUpButton>
                </>
            ) : (
                <UserButton afterSignOutUrl="/" />
            )}
        </div>
    );
}

export function ClerkAuthStatus() {
    const { isSignedIn, user } = useUser();

    if (!isSignedIn) {
        return (
            <div className="text-sm text-gray-600">
                Not signed in
            </div>
        );
    }

    return (
        <div className="text-sm text-gray-600">
            Signed in as: {user?.fullName || user?.username || user?.id}
        </div>
    );
}
