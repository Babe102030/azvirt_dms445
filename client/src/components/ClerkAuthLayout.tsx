import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Button } from "./ui/button";

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    description: string;
    showSocial?: boolean;
}

export function ClerkAuthLayout({
    children,
    title,
    description,
    showSocial = true
}: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Tabs defaultValue="email" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="email">Email</TabsTrigger>
                            {showSocial && <TabsTrigger value="social">Social</TabsTrigger>}
                        </TabsList>
                    </Tabs>
                    <div className="space-y-4">
                        {children}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function AuthHeader() {
    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground">Sign in to your account</p>
            </div>
            <div className="flex items-center space-x-2">
                <SignInButton mode="modal">
                    <Button variant="outline" size="sm">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                    <Button size="sm">Sign Up</Button>
                </SignUpButton>
            </div>
        </div>
    );
}

export function AuthFooter() {
    return (
        <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>By continuing, you agree to our <a href="#" className="underline hover:text-primary">Terms of Service</a> and <a href="#" className="underline hover:text-primary">Privacy Policy</a>.</p>
        </div>
    );
}
