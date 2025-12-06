import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Phone, Bell, Save } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [smsEnabled, setSmsEnabled] = useState(user?.smsNotificationsEnabled || false);
  const [isSaving, setIsSaving] = useState(false);

  const updateSMSMutation = trpc.auth.updateSMSSettings.useMutation({
    onSuccess: () => {
      toast.success("SMS settings updated successfully");
      setIsSaving(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to update SMS settings: ${error.message}`);
      setIsSaving(false);
    },
  });

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    setIsSaving(true);
    updateSMSMutation.mutate({
      phoneNumber: phoneNumber.trim(),
      smsNotificationsEnabled: smsEnabled,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-white/70">Manage your notification preferences</p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          <Card className="bg-card/90 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                SMS Notifications
              </CardTitle>
              <CardDescription>
                Receive critical stock alerts via SMS when materials fall below critical thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your phone number in international format (e.g., +1234567890)
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-primary/20">
                  <input
                    type="checkbox"
                    id="smsEnabled"
                    checked={smsEnabled}
                    onChange={(e) => setSmsEnabled(e.target.checked)}
                    disabled={isSaving}
                    className="h-4 w-4 rounded border-primary cursor-pointer"
                  />
                  <Label htmlFor="smsEnabled" className="cursor-pointer flex-1 m-0">
                    <span className="font-medium">Enable SMS Alerts</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      You will receive SMS notifications for critical stock levels
                    </p>
                  </Label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-card/90 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Critical Stock Threshold
              </CardTitle>
              <CardDescription>
                How SMS alerts work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-white mb-2">Alert Levels</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 font-bold">⚠️</span>
                    <span><strong>Low Stock:</strong> Material quantity falls below minimum stock level</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">🚨</span>
                    <span><strong>Critical Stock:</strong> Material quantity falls below critical threshold (triggers SMS)</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">Setting Critical Thresholds</h4>
                <p className="text-muted-foreground">
                  Go to Materials page and set the "Critical Threshold" for each material. When stock falls below this level, SMS alerts will be sent to all managers with SMS notifications enabled.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">Requirements</h4>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li>You must be an admin user to receive SMS alerts</li>
                  <li>Phone number must be valid and in international format</li>
                  <li>SMS notifications must be enabled in these settings</li>
                  <li>Material must have a critical threshold value set</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
