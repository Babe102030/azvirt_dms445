import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import DriverDeliveryView from "@/components/DriverDeliveryView";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * Mobile full-screen delivery page
 * Route: /driver/deliveries/[id]
 *
 * Behavior:
 * - Parses the `id` route param and renders the `DriverDeliveryView` component full-screen.
 * - Provides a back button in a sticky header to behave like a native PWA screen.
 */

export default function MobileDeliveryPage() {
  const router = useRouter();
  const { id } = router.query;
  const [deliveryId, setDeliveryId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    const parsed = Array.isArray(id) ? parseInt(id[0], 10) : parseInt(id as string, 10);
    if (!isNaN(parsed)) setDeliveryId(parsed);
  }, [id]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-card/95">
        {/* Sticky header for mobile full-screen experience */}
        <div className="sticky top-0 z-40 bg-card/95 border-b border-border p-3 flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-medium">Delivery</h2>
            <p className="text-xs text-muted-foreground">Mobile view</p>
          </div>
          <div>
            {/* Optional: quick close to root route */}
            <Button
              variant="ghost"
              onClick={() => router.push("/driver/deliveries")}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>

        <main className="p-3">
          {deliveryId ? (
            <div className="w-full">
              <DriverDeliveryView deliveryId={deliveryId} onClose={() => router.back()} />
            </div>
          ) : (
            <div className="p-6 text-center text-white/80">Loading delivery...</div>
          )}
        </main>
      </div>
    </DashboardLayout>
  );
}
