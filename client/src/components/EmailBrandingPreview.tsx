import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Calendar, Building2 } from "lucide-react";

interface EmailBrandingPreviewProps {
  branding: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    companyName: string;
    footerText?: string;
    headerStyle: string;
    fontFamily: string;
  };
  sampleContent?: {
    subject?: string;
    previewText?: string;
    bodyTitle?: string;
    bodyContent?: string[];
  };
}

export default function EmailBrandingPreview({
  branding,
  sampleContent = {
    subject: "Daily Production Report - {{date}}",
    previewText: "Your daily production summary is ready",
    bodyTitle: "Daily Production Summary",
    bodyContent: [
      "Total Deliveries: 25",
      "Total Volume: 150 m³",
      "Active Projects: 8",
      "Quality Tests Passed: 23/25",
    ],
  },
}: EmailBrandingPreviewProps) {
  const getHeaderStyle = (): React.CSSProperties => {
    if (branding.headerStyle === "gradient") {
      return {
        background: `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`,
      };
    } else if (branding.headerStyle === "solid") {
      return {
        backgroundColor: branding.primaryColor,
      };
    } else {
      // two-tone
      return {
        background: `linear-gradient(to right, ${branding.primaryColor} 50%, ${branding.secondaryColor} 50%)`,
      };
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Preview
        </CardTitle>
        <CardDescription>
          Preview how your emails will appear to recipients
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden shadow-lg bg-white">
          {/* Email Client Header Simulation */}
          <div className="bg-gray-100 px-4 py-3 border-b">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                <span className="font-semibold text-gray-900">
                  {branding.companyName}
                </span>
                <span className="text-gray-500">
                  &lt;noreply@{branding.companyName.toLowerCase().replace(/\s/g, "")}.com&gt;
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-base font-semibold text-gray-900">
                {sampleContent.subject}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {sampleContent.previewText}
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div
            className="max-w-2xl mx-auto"
            style={{ fontFamily: branding.fontFamily }}
          >
            {/* Header */}
            <div
              className="text-white px-8 py-6 text-center"
              style={getHeaderStyle()}
            >
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.companyName}
                  className="h-12 mx-auto mb-3 object-contain"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              ) : (
                <div className="text-2xl font-bold mb-2">
                  {branding.companyName}
                </div>
              )}
              <div className="text-sm opacity-90">
                Concrete Management System
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6">
              {/* Title */}
              <h1
                className="text-2xl font-bold mb-4"
                style={{ color: branding.primaryColor }}
              >
                {sampleContent.bodyTitle}
              </h1>

              {/* Content */}
              <div className="space-y-3 text-gray-700">
                <p>Dear Team,</p>
                <p>
                  Here is your summary for today's operations:
                </p>

                {/* Stats Grid */}
                <div className="bg-gray-50 rounded-lg p-4 my-4 space-y-2">
                  {sampleContent.bodyContent?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <span className="font-medium text-gray-900">
                        {item.split(":")[0]}:
                      </span>
                      <span
                        className="font-bold"
                        style={{ color: branding.primaryColor }}
                      >
                        {item.split(":")[1]}
                      </span>
                    </div>
                  ))}
                </div>

                <p>
                  Thank you for your continued dedication to excellence.
                </p>
              </div>

              {/* CTA Button */}
              <div className="mt-6">
                <button
                  className="px-6 py-3 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  style={{
                    backgroundColor: branding.primaryColor,
                  }}
                >
                  View Full Report
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="px-8">
              <div
                className="h-px"
                style={{
                  background: `linear-gradient(to right, transparent, ${branding.primaryColor}, transparent)`,
                }}
              />
            </div>

            {/* Footer */}
            <div className="px-8 py-6 text-center bg-gray-50">
              <div className="text-sm text-gray-600 space-y-2">
                {branding.footerText ? (
                  <p>{branding.footerText}</p>
                ) : (
                  <>
                    <p>
                      <strong>{branding.companyName}</strong>
                    </p>
                    <p>Concrete Management & Delivery Services</p>
                  </>
                )}
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mt-4">
                  <a
                    href="#"
                    className="hover:underline"
                    style={{ color: branding.primaryColor }}
                  >
                    Unsubscribe
                  </a>
                  <span>|</span>
                  <a
                    href="#"
                    className="hover:underline"
                    style={{ color: branding.primaryColor }}
                  >
                    Privacy Policy
                  </a>
                  <span>|</span>
                  <a
                    href="#"
                    className="hover:underline"
                    style={{ color: branding.primaryColor }}
                  >
                    Contact Us
                  </a>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  © {new Date().getFullYear()} {branding.companyName}. All
                  rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Branding Details */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              Primary Color
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded border shadow-sm"
                style={{ backgroundColor: branding.primaryColor }}
              />
              <span className="text-sm font-mono">{branding.primaryColor}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              Secondary Color
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded border shadow-sm"
                style={{ backgroundColor: branding.secondaryColor }}
              />
              <span className="text-sm font-mono">
                {branding.secondaryColor}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              Header Style
            </div>
            <div className="text-sm capitalize">{branding.headerStyle}</div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              Font Family
            </div>
            <div className="text-sm">{branding.fontFamily}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
