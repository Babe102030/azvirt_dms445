import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Camera,
  MapPin,
  CheckCircle,
  Navigation,
  Truck,
  Package,
  WifiOff,
  Wifi,
  Mic,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * DriverDeliveryView
 *
 * Mobile-optimized delivery view for drivers.
 *
 * Features:
 * - Large touch-friendly status buttons
 * - GPS capture on status change (uses getCurrentPosition at moment of update)
 * - Camera integration for delivery site photos (file input with capture, fallback to getUserMedia)
 * - Driver notes with voice-to-text
 * - Offline mode support + persistent offline action queue (localStorage)
 * - Haptic feedback on button presses (navigator.vibrate)
 *
 * Usage:
 * <DriverDeliveryView deliveryId={123} onClose={() => {}} />
 */

type Props = {
  deliveryId: number;
  onClose?: () => void;
};

type OfflineAction =
  | {
      type: "updateStatus";
      payload: {
        deliveryId: number;
        status: string;
        gpsLocation?: string;
        driverNotes?: string;
        timestamp: string;
      };
    }
  | {
      type: "uploadPhoto";
      payload: {
        deliveryId: number;
        photoData: string; // base64
        mimeType: string;
        timestamp: string;
      };
    };

const OFFLINE_QUEUE_KEY = "driver-offline-queue-v1";

export default function DriverDeliveryView({ deliveryId, onClose }: Props) {
  const [driverNotes, setDriverNotes] = useState<string>("");
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [queueLength, setQueueLength] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMounted = useRef(true);

  // TRPC mutations - using same backend endpoints as the other component
  const updateStatus = trpc.deliveries.updateStatusWithGPS.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      trpc.deliveries.list.invalidate();
    },
    onError: (err) => {
      toast.error("Status update failed, queued for retry");
    },
  });

  const uploadPhoto = trpc.deliveries.uploadDeliveryPhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo uploaded");
      trpc.deliveries.list.invalidate();
    },
    onError: () => {
      toast.error("Photo upload failed, queued for retry");
    },
  });

  const { data: deliveries } = trpc.deliveries.list.useQuery();
  const delivery = deliveries?.find((d: any) => d.id === deliveryId) as any;

  // Helper: persist and read offline queue
  const readQueue = (): OfflineAction[] => {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as OfflineAction[];
    } catch {
      return [];
    }
  };

  const writeQueue = (queue: OfflineAction[]) => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      setQueueLength(queue.length);
    } catch (e) {
      console.error("Failed to write offline queue", e);
    }
  };

  const enqueueAction = (action: OfflineAction) => {
    const q = readQueue();
    q.push(action);
    writeQueue(q);
  };

  // Update queue length on mount
  useEffect(() => {
    setQueueLength(readQueue().length);
  }, []);

  // Online/offline listeners
  useEffect(() => {
    isMounted.current = true;
    const onOnline = () => {
      if (!isMounted.current) return;
      setIsOnline(true);
      toast("You are online", { icon: <Wifi className="w-4 h-4" /> });
      processQueue();
    };
    const onOffline = () => {
      if (!isMounted.current) return;
      setIsOnline(false);
      toast("You are offline", { icon: <WifiOff className="w-4 h-4" /> });
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      isMounted.current = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Try to process queue when becoming online
  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Try to capture continuous location (low-power watch) but also ensure we get fresh location on status change
  useEffect(() => {
    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const s = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
            setCurrentLocation(s);
          },
          (err) => {
            console.warn("watchPosition error", err);
          },
          { enableHighAccuracy: false, maximumAge: 30_000, timeout: 7000 }
        );
      } catch (e) {
        console.warn("geolocation watch failed", e);
      }
    }
    return () => {
      if (watchId !== null && "geolocation" in navigator) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {}
      }
    };
  }, []);

  // Process offline queue: send actions via trpc. Simple serial processing with best-effort.
  const processQueue = async () => {
    if (!isOnline) return;
    const queue = readQueue();
    if (queue.length === 0) return;
    if (processingQueue) return;

    setProcessingQueue(true);
    try {
      for (const action of queue) {
        if (!isMounted.current) break;
        try {
          if (action.type === "updateStatus") {
            const p = action.payload;
            await updateStatus.mutateAsync({
              deliveryId: p.deliveryId,
              status: p.status as any,
              gpsLocation: p.gpsLocation,
              driverNotes: p.driverNotes,
            });
          } else if (action.type === "uploadPhoto") {
            const p = action.payload;
            await uploadPhoto.mutateAsync({
              deliveryId: p.deliveryId,
              photoData: p.photoData,
              mimeType: p.mimeType,
            });
          }
          // If success, remove the action from queue
          const current = readQueue();
          current.shift();
          writeQueue(current);
        } catch (err) {
          // If an action fails due to server, stop processing and keep action queued
          console.warn("Processing queued action failed, will retry later", err);
          break;
        }
      }
    } finally {
      setProcessingQueue(false);
    }
  };

  // Haptic feedback helper
  const haptic = (duration = 50) => {
    try {
      if ("vibrate" in navigator) {
        (navigator as any).vibrate(duration);
      }
    } catch {}
  };

  // Get a fresh GPS location at the moment of status change (better than stale watch)
  const getCurrentGPSString = (): Promise<string | null> =>
    new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      const opts = { enableHighAccuracy: true, maximumAge: 0, timeout: 7000 };
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
        () => resolve(currentLocation),
        opts
      );
    });

  // Handler for status update (large touch buttons will call this)
  const handleStatusUpdate = async (status: string) => {
    haptic(60);
    const gps = await getCurrentGPSString();
    const timestamp = new Date().toISOString();

    // If offline, enqueue
    if (!isOnline) {
      enqueueAction({
        type: "updateStatus",
        payload: {
          deliveryId,
          status,
          gpsLocation: gps || undefined,
          driverNotes: driverNotes || undefined,
          timestamp,
        },
      });
      toast("Queued status update (offline)", { icon: <WifiOff className="w-4 h-4" /> });
      setDriverNotes("");
      setQueueLength(readQueue().length);
      return;
    }

    // Online: try immediate update, fallback to queue on error
    try {
      await updateStatus.mutateAsync({
        deliveryId,
        status: status as any,
        gpsLocation: gps || undefined,
        driverNotes: driverNotes || undefined,
      });
      setDriverNotes("");
    } catch (err) {
      // enqueue for retry
      enqueueAction({
        type: "updateStatus",
        payload: {
          deliveryId,
          status,
          gpsLocation: gps || undefined,
          driverNotes: driverNotes || undefined,
          timestamp,
        },
      });
      toast("Failed to update immediately, queued for retry");
      setQueueLength(readQueue().length);
    }
  };

  // Photo capture flow
  const handlePhotoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const photoData = base64.split(",")[1];
      const timestamp = new Date().toISOString();

      if (!isOnline) {
        enqueueAction({
          type: "uploadPhoto",
          payload: {
            deliveryId,
            photoData,
            mimeType: file.type,
            timestamp,
          },
        });
        toast("Photo queued for upload (offline)");
        setQueueLength(readQueue().length);
        return;
      }

      try {
        await uploadPhoto.mutateAsync({
          deliveryId,
          photoData,
          mimeType: file.type,
        });
      } catch (err) {
        enqueueAction({
          type: "uploadPhoto",
          payload: {
            deliveryId,
            photoData,
            mimeType: file.type,
            timestamp,
          },
        });
        toast("Upload failed, queued for retry");
        setQueueLength(readQueue().length);
      }
    };
    reader.readAsDataURL(file);
    // Clear input so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Attempt advanced camera capture via getUserMedia when file input not available
  const startCameraCapture = async () => {
    haptic(30);
    // Prefer file input for simplicity (mobile browsers open camera)
    if (fileInputRef.current) {
      fileInputRef.current.click();
      return;
    }
    // Fallback to getUserMedia snapshot (not ideal on mobile, but included)
    if (!("mediaDevices" in navigator && navigator.mediaDevices.getUserMedia)) {
      toast.error("Camera access not available");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const track = stream.getVideoTracks()[0];
      // Create ImageCapture if available
      // Capture via canvas fallback
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/jpeg", 0.85);
      const photoData = base64.split(",")[1];
      // Stop tracks
      track.stop();
      // Upload or queue
      if (!isOnline) {
        enqueueAction({
          type: "uploadPhoto",
          payload: {
            deliveryId,
            photoData,
            mimeType: "image/jpeg",
            timestamp: new Date().toISOString(),
          },
        });
        toast("Photo queued for upload (offline)");
        setQueueLength(readQueue().length);
        return;
      }
      await uploadPhoto.mutateAsync({
        deliveryId,
        photoData,
        mimeType: "image/jpeg",
      });
    } catch (err) {
      console.error("camera capture failed", err);
      toast.error("Camera capture failed");
    }
  };

  // Voice-to-text for driver notes
  const startVoiceToText = () => {
    haptic(20);
    const SpeechCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechCtor) {
      toast.error("Speech recognition not supported");
      return;
    }
    const recognition = new SpeechCtor();
    recognition.lang = "sr-RS";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (evt: any) => {
      const txt = evt.results[0][0].transcript as string;
      setDriverNotes((prev) => (prev ? prev + " " + txt : txt));
    };
    recognition.onerror = (e: any) => {
      console.warn("speech error", e);
      toast.error("Voice recognition error");
    };
    recognition.onend = () => {
      toast("Voice input finished");
    };
    recognition.start();
    toast("Listening...");
  };

  // UI helpers
  const statusFlow = [
    { key: "scheduled", label: "Zakazano", icon: Package },
    { key: "loaded", label: "Natovareno", icon: Truck },
    { key: "en_route", label: "Na putu", icon: Navigation },
    { key: "arrived", label: "Stigao", icon: MapPin },
    { key: "delivered", label: "Isporučeno", icon: CheckCircle },
  ];

  const currentStatusIndex = statusFlow.findIndex((s) => s.key === delivery?.status);
  const nextStatus = statusFlow[currentStatusIndex + 1];

  // Small helper to show GPS badge
  const GPSBadge = () => (
    <div className="flex items-center gap-2 text-xs">
      <MapPin className="w-4 h-4 text-green-400" />
      <span className="text-white/80">{currentLocation ?? "N/A"}</span>
    </div>
  );

  return (
    <div className="max-w-md mx-auto w-full p-4 bg-transparent">
      <Card className="rounded-xl bg-card/95 p-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-400" />
              <span className="text-base">Isporuka #{delivery?.id ?? deliveryId}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                {isOnline ? "Online" : "Offline"}
              </Badge>
              <button
                aria-label="Close"
                onClick={() => onClose && onClose()}
                className="text-white/60 text-sm"
              >
                Zatvori
              </button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">Projekat</p>
                <p className="font-medium">{delivery?.projectName ?? "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Volume</p>
                <p className="font-medium">{delivery?.volume ?? "—"} m³</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-muted/30 rounded flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Trenutni status</p>
              <p className="font-semibold">{delivery?.status?.replace("_", " ") ?? "—"}</p>
            </div>
            <div>
              {currentLocation ? <GPSBadge /> : <p className="text-xs text-yellow-400">Čeka se GPS...</p>}
            </div>
          </div>

          {/* Notes + Voice */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Napomene</label>
            <Textarea
              value={driverNotes}
              onChange={(e) => setDriverNotes(e.target.value)}
              placeholder="Dodajte napomene..."
              rows={3}
              className="text-base bg-muted/20"
            />
            <div className="flex gap-2 mt-2">
              <Button
                variant="ghost"
                className="flex-0 p-3 h-12 rounded-lg border border-orange-500/20"
                onClick={startVoiceToText}
                aria-label="Voice to text"
              >
                <Mic className="w-5 h-5 text-orange-400 mr-2" />
                <span className="text-sm">Voice</span>
              </Button>

              {/* Camera button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoInput}
                className="hidden"
              />
              <Button
                onClick={startCameraCapture}
                className="flex-1 h-12 rounded-lg bg-orange-500 text-white font-semibold text-base"
              >
                <Camera className="w-5 h-5 mr-2" />
                Fotografija
              </Button>
            </div>
          </div>

          {/* Big status update button (mobile touch friendly) */}
          {nextStatus && (
            <div className="pt-2">
              <div className="text-xs text-muted-foreground mb-2">Brze akcije</div>
              <div className="grid grid-cols-1 gap-3">
                {/* Primary next action */}
                <button
                  onClick={() => handleStatusUpdate(nextStatus.key)}
                  disabled={processingQueue || (!isOnline && !currentLocation && readQueue().length > 100)}
                  className="w-full h-16 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-lg font-bold flex items-center justify-center gap-3 touch-manipulation"
                >
                  <nextStatus.icon className="w-6 h-6" />
                  {nextStatus.label}
                </button>

                {/* Optional full flow buttons (for skipping back/forth) */}
                <div className="flex gap-2">
                  {statusFlow.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => handleStatusUpdate(s.key)}
                      className={`flex-1 h-14 rounded-lg text-sm font-semibold ${
                        s.key === delivery?.status ? "bg-green-600 text-white" : "bg-card/60 text-white/90"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <s.icon className="w-5 h-5" />
                        <span>{s.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Offline queue status */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-2">
              <span>Offline queue: </span>
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                {queueLength}
              </Badge>
            </div>
            <div className="text-right">
              <span className="text-xxs text-muted-foreground">
                {processingQueue ? "Syncing..." : isOnline ? "Ready to sync" : "Offline"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
