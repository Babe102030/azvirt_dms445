import React from "react";
import { useSessionList, useUser } from "@clerk/clerk-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Skeleton } from "./ui/skeleton";
import { Separator } from "./ui/separator";

export function ClerkSessionManagement() {
    const { isLoaded, sessions } = useSessionList();
    const { user, isSignedIn } = useUser();

    if (!isSignedIn) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Session Management</CardTitle>
                    <CardDescription>Please sign in to manage your sessions</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!isLoaded) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Session Management</CardTitle>
                    <CardDescription>Loading your active sessions...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>Manage your active sessions across devices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {sessions?.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">No active sessions found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sessions?.map((session) => (
                            <div key={session.id} className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50">
                                <div className="flex items-center space-x-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={user?.imageUrl} alt="Current session" />
                                        <AvatarFallback>
                                            {user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">
                                            {session.id || "Unknown Device"}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : "Unknown"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {session.id === sessions[0]?.id && (
                                        <Badge variant="outline">Current</Badge>
                                    )}
                                    <Badge variant={session.status === "active" ? "default" : "secondary"}>
                                        {session.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <Separator />
                <div className="flex justify-end">
                    <Button variant="outline" size="sm">
                        Sign out all sessions
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function ActiveSessionIndicator() {
    const { isLoaded, sessions } = useSessionList();
    const { isSignedIn } = useUser();

    if (!isSignedIn || !isLoaded) return null;

    const activeSessions = sessions?.filter(session => session.status === "active") || [];

    return (
        <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
                <span>🔒</span>
                <span>{activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''}</span>
            </Badge>
        </div>
    );
}
