import React from "react";
import {
    ClerkUserProfile,
    UserProfileCard,
    ClerkProtectedRoute,
    ClerkAuthWrapper,
    ClerkSignUp,
    SocialAuthButtons,
    ClerkAuthLayout,
    AuthHeader,
    AuthFooter,
    ClerkSessionManagement,
    ActiveSessionIndicator,
    ClerkEnhancedSignIn,
    ForgotPasswordForm
} from "./ClerkIndex";

export function ClerkComponentShowcase() {
    return (
        <div className="container mx-auto p-4 space-y-8">
            <h1 className="text-3xl font-bold">Clerk Authentication Components Showcase</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Profile Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">User Profile Components</h2>
                    <div className="space-y-2">
                        <UserProfileCard />
                        <ClerkUserProfile />
                    </div>
                </div>

                {/* Session Management Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Session Management</h2>
                    <ActiveSessionIndicator />
                    <ClerkSessionManagement />
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="text-xl font-semibold">Authentication Forms</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ClerkEnhancedSignIn />
                    <ClerkSignUp />
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Social Auth Buttons</h2>
                <SocialAuthButtons />
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Forgot Password</h2>
                <ForgotPasswordForm />
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Auth Layout Example</h2>
                <ClerkAuthLayout title="Authentication Demo" description="Example of auth layout">
                    <div className="space-y-2">
                        <AuthHeader />
                        <p>This is where your auth content would go</p>
                        <AuthFooter />
                    </div>
                </ClerkAuthLayout>
            </div>
        </div>
    );
}

export function ProtectedContentExample() {
    return (
        <ClerkProtectedRoute requiredRole="admin">
            <div className="p-6 border rounded-lg bg-background">
                <h2 className="text-xl font-semibold mb-4">Protected Content</h2>
                <p>This content is only visible to authenticated users with the "admin" role.</p>
            </div>
        </ClerkProtectedRoute>
    );
}

export function AuthWrapperExample() {
    return (
        <ClerkAuthWrapper fallback={<div>Loading auth...</div>}>
            <div className="p-6 border rounded-lg bg-background">
                <h2 className="text-xl font-semibold mb-4">Authenticated Content</h2>
                <p>This content is only visible to authenticated users.</p>
            </div>
        </ClerkAuthWrapper>
    );
}
