import React from "react";
import { useUser } from "@clerk/clerk-react";
import { Skeleton } from "./ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Button } from "./ui/button";

interface ProtectedRouteProps {
    children: React.ReactNode;
    redirectTo?: string;
    requiredRole?: string;
}

export function ClerkProtectedRoute({
    children,
    redirectTo = "/",
    requiredRole
}: ProtectedRouteProps) {
    const { isSignedIn, user, isLoaded } = useUser();

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle>Loading...</CardTitle>
                        <CardDescription>Please wait while we check your authentication</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>You need to sign in to access this page</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full"
                            onClick={() => {
                                // This will trigger Clerk's sign-in modal
                                const signInButton = document.createElement('button');
                                signInButton.click();
                            }}
                        >
                            Sign In
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Check role requirement if specified
    if (requiredRole && user?.publicMetadata?.role !== requiredRole) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>You don't have permission to access this page</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-muted-foreground">
                            Required role: <span className="font-medium">{requiredRole}</span>
                        </p>
                        <p className="text-center text-muted-foreground mt-2">
                            Your role: <span className="font-medium">{user?.publicMetadata?.role ? String(user.publicMetadata.role) : "None"}</span>
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}

interface AuthWrapperProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function ClerkAuthWrapper({ children, fallback }: AuthWrapperProps) {
    const { isSignedIn, isLoaded } = useUser();

    if (!isLoaded) {
        return fallback || (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle>Loading...</CardTitle>
                        <CardDescription>Checking authentication status</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (!isSignedIn) {
        return fallback || (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle>Authentication Required</CardTitle>
                        <CardDescription>Please sign in to continue</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}
