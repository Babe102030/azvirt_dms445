import React from "react";
import { useUser } from "@clerk/clerk-react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";

export function ClerkUserProfile() {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isSignedIn) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Please sign in to view your profile</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Manage your account information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
            <AvatarFallback>
              {user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">
              {user?.fullName || user?.username || "User"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
            {!!user?.publicMetadata?.role && (
              <Badge variant="secondary" className="mt-1">
                {String(user.publicMetadata.role)}
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">
              <Badge
                variant={
                  user?.emailAddresses[0]?.verification?.status === "verified"
                    ? "default"
                    : "secondary"
                }
              >
                {user?.emailAddresses[0]?.verification?.status === "verified"
                  ? "Verified"
                  : "Unverified"}
              </Badge>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Member Since</p>
            <p className="font-medium">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Email Addresses</p>
          {user?.emailAddresses?.map((email) => (
            <div
              key={email.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
            >
              <div>
                <p className="font-medium">{email.emailAddress}</p>
                <p className="text-xs text-muted-foreground">
                  {email.verification?.status === "verified"
                    ? "Verified"
                    : "Unverified"}
                </p>
              </div>
              {email.emailAddress ===
                user.primaryEmailAddress?.emailAddress && (
                <Badge variant="outline">Primary</Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="outline">Edit Profile</Button>
      </CardFooter>
    </Card>
  );
}

export function UserProfileCard() {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded || !isSignedIn) return null;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
            <AvatarFallback>
              {user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-sm font-medium">
              {user?.fullName || user?.username || "User"}
            </CardTitle>
            <CardDescription className="text-xs">
              {user?.primaryEmailAddress?.emailAddress}
            </CardDescription>
          </div>
        </div>
        <Badge variant="secondary">
          {user?.publicMetadata?.role
            ? String(user.publicMetadata.role)
            : "User"}
        </Badge>
      </CardHeader>
    </Card>
  );
}
