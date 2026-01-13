import React from "react";
import { SignUpButton } from "@clerk/clerk-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";

export function ClerkSignUp() {
    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
                <CardDescription>
                    Enter your information to create an account
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" placeholder="name@example.com" type="email" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input id="confirm-password" type="password" />
                </div>
                <Separator />
                <div className="space-y-3">
                    <Label>Sign up with</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <SignUpButton mode="modal">
                            <Button variant="outline" className="w-full">
                                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 36.7 160.2 94.3 211.6 91.4-23.4 149.5-94.8 149.5-189.5 0-11.8-1.1-23.4-3.2-34.7H248v70.3h122.8c-1.1 12.2-3.2 24.2-3.2 36.2z"></path></svg>
                                Google
                            </Button>
                        </SignUpButton>
                        <SignUpButton mode="modal">
                            <Button variant="outline" className="w-full">
                                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="github" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512"><path fill="currentColor" d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3.3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 20.9 1.3 26.7 24.4 26.7 24.4 30.8 45.7 71.1 27.1 90.5 20.9 1.7-6.2 3.3-12.6 3.3-19.2 0-22.5-26.8-37.5-37.5-37.5-16.4 16.9-27 37.1-27 60.2 0 27.2 22.7 47.7 52.7 47.7-4.1 20.2-13.7 36.6-27.2 47.7-14.1 11.5-31.4 17.3-51.4 17.3-1.1 0-2.1-.1-3.2-.3 10.7-6.1 21.9-11.9 33.5-17.3-24.4-7.7-51.7-24.9-51.7-61.8 0-27.2 22.7-47.7 52.7-47.7 24.1 0 44.2-17.3 44.2-40.1 0-17.9-12.7-33.1-30.3-39.2 13.3-7.6 29.2-11.5 46.8-11.5-1.1 0-2.1-.1-3.2-.3zM488 252c0-113.3-69.8-205.8-169.5-239.2C318.6 18.4 313.1 8 299.9 8c-106.1 0-192 85.3-192 192s85.3 192 192 192c13.2 0 18.7-10.4 22.2-18.4C302.4 457.8 488 365.3 488 252z"></path></svg>
                                GitHub
                            </Button>
                        </SignUpButton>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
                <SignUpButton mode="modal">
                    <Button className="w-full">
                        Create Account
                    </Button>
                </SignUpButton>
                <p className="text-sm text-muted-foreground text-center">
                    Already have an account?{" "}
                    <a href="#" className="underline hover:text-primary">
                        Sign in
                    </a>
                </p>
            </CardFooter>
        </Card>
    );
}

export function SocialAuthButtons() {
    return (
        <div className="grid grid-cols-2 gap-2 w-full max-w-sm mx-auto">
            <SignUpButton mode="modal">
                <Button variant="outline" className="w-full">
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 36.7 160.2 94.3 211.6 91.4-23.4 149.5-94.8 149.5-189.5 0-11.8-1.1-23.4-3.2-34.7H248v70.3h122.8c-1.1 12.2-3.2 24.2-3.2 36.2z"></path>
                    </svg>
                    Continue with Google
                </Button>
            </SignUpButton>
            <SignUpButton mode="modal">
                <Button variant="outline" className="w-full">
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="github" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512">
                        <path fill="currentColor" d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3.3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 20.9 1.3 26.7 24.4 26.7 24.4 30.8 45.7 71.1 27.1 90.5 20.9 1.7-6.2 3.3-12.6 3.3-19.2 0-22.5-26.8-37.5-37.5-37.5-16.4 16.9-27 37.1-27 60.2 0 27.2 22.7 47.7 52.7 47.7-4.1 20.2-13.7 36.6-27.2 47.7-14.1 11.5-31.4 17.3-51.4 17.3-1.1 0-2.1-.1-3.2-.3 10.7-6.1 21.9-11.9 33.5-17.3-24.4-7.7-51.7-24.9-51.7-61.8 0-27.2 22.7-47.7 52.7-47.7 24.1 0 44.2-17.3 44.2-40.1 0-17.9-12.7-33.1-30.3-39.2 13.3-7.6 29.2-11.5 46.8-11.5-1.1 0-2.1-.1-3.2-.3zM488 252c0-113.3-69.8-205.8-169.5-239.2C318.6 18.4 313.1 8 299.9 8c-106.1 0-192 85.3-192 192s85.3 192 192 192c13.2 0 18.7-10.4 22.2-18.4C302.4 457.8 488 365.3 488 252z"></path>
                    </svg>
                    Continue with GitHub
                </Button>
            </SignUpButton>
        </div>
    );
}
