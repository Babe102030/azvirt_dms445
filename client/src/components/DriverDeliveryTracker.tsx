import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Camera,
  MapPin,
  Navigation,
  CheckCircle,
  Truck,
  Package,
  ArrowRight,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface DriverDeliveryTrackerProps {
  deliveryId: number;
  onComplete?: () => void;
}

export function DriverDeliveryTracker({
  deliveryId,
  onComplete,
}: DriverDeliveryTrackerProps) {
  const [currentLocation, setCurrentLocation] = useState<string>("");
  const [driverNotes, setDriverNotes] = useState("");
  const [watchId, setWatchId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: deliveries, refetch } = trpc.deliveries.list.useQuery();
  const delivery = deliveries?.find((d) => d.id === deliveryId) as any;

  const updateStatus = trpc.deliveries.updateStatusWithGPS.useMutation({
    onSuccess: () => {
      toast.success("Status ažuriran / Status updated");
      refetch();
      refetchHistory();
    },
  });

  const { data: history, refetch: refetchHistory } =
    trpc.deliveries.getHistory.useQuery(
      { deliveryId },
      { enabled: !!deliveryId },
    );

  const { mutateAsync: calculateETA } =
    trpc.deliveries.calculateETA.useMutation();
  const [eta, setEta] = useState<number | null>(null);

  useEffect(() => {
    if (currentLocation && delivery?.status === "en_route") {
      const getETA = async () => {
        const result = await calculateETA({
          deliveryId,
          currentGPS: currentLocation,
        });
        if (result && result.eta) {
          setEta(result.eta);
        }
      };
      getETA();
    }
  }, [currentLocation, delivery?.status, deliveryId]);

  const uploadPhoto = trpc.deliveries.uploadDeliveryPhoto.useMutation({
    onSuccess: () => {
      toast.success("Fotografija sačuvana / Photo saved");
    },
  });

  // Start GPS tracking
  useEffect(() => {
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const location = `${position.coords.latitude},${position.coords.longitude}`;
          setCurrentLocation(location);
        },
        (error) => {
          console.error("GPS error:", error);
          toast.error("GPS greška / GPS error");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
      setWatchId(id);

      return () => {
        if (id) navigator.geolocation.clearWatch(id);
      };
    }
  }, []);

  const handleStatusUpdate = async (newStatus: string) => {
    // Provide haptic feedback if supported
    if ("vibrate" in navigator) {
      navigator.vibrate(50);
    }

    await updateStatus.mutateAsync({
      deliveryId,
      status: newStatus as any,
      gpsLocation: currentLocation,
      driverNotes: driverNotes || undefined,
    });
    setDriverNotes("");
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const photoData = base64.split(",")[1];

      await uploadPhoto.mutateAsync({
        deliveryId,
        photoData,
        mimeType: file.type,
      });
    };

    reader.readAsDataURL(file);
  };

  const startVoiceToText = () => {
    if (!("webkitSpeechRecognition" in window)) {
      toast.error(
        "Pretraživač ne podržava prepoznavanje glasa / Speech recognition not supported",
      );
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "sr-RS"; // Bosnian/Serbian
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setDriverNotes((prev) => (prev ? `${prev} ${text}` : text));
    };
    recognition.start();
    toast.info("Slušam... / Listening...");
  };

  if (!delivery) {
    return <div className="text-white">Loading delivery...</div>;
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-gray-500",
      loaded: "bg-blue-500",
      en_route: "bg-yellow-500",
      arrived: "bg-purple-500",
      delivered: "bg-green-500",
      returning: "bg-orange-500",
      completed: "bg-green-600",
    };
    return colors[status] || "bg-gray-500";
  };

  const statusFlow = [
    { key: "scheduled", label: "Zakazano / Scheduled", icon: Package },
    { key: "loaded", label: "Natovareno / Loaded", icon: Truck },
    { key: "en_route", label: "Na putu / En Route", icon: Navigation },
    { key: "arrived", label: "Stigao / Arrived", icon: MapPin },
    { key: "delivered", label: "Isporučeno / Delivered", icon: CheckCircle },
    { key: "returning", label: "Vraćanje / Returning", icon: ArrowRight },
  ];

  const currentStepIndex = statusFlow.findIndex(
    (s) => s.key === delivery.status,
  );
  const nextStep = statusFlow[currentStepIndex + 1];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Delivery Info Card */}
      <Card className="bg-card/90 backdrop-blur border-orange-500/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-500" />
              Isporuka #{delivery.id}
            </div>
            {eta && (
              <Badge
                variant="outline"
                className="text-orange-500 border-orange-500/50"
              >
                <Clock className="w-3 h-3 mr-1" />
                ETA:{" "}
                {new Date(eta).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Projekat / Project
              </p>
              <p className="font-medium">{delivery.projectName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Tip betona / Concrete Type
              </p>
              <p className="font-medium">{delivery.concreteType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Količina / Volume</p>
              <p className="font-medium">{delivery.volume} m³</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vozilo / Vehicle</p>
              <p className="font-medium">{delivery.vehicleNumber || "N/A"}</p>
            </div>
          </div>

          {/* Current Status */}
          <div className="mt-4 p-3 bg-muted/50 rounded border border-border">
            <p className="text-sm text-muted-foreground mb-2">
              Trenutni status / Current Status
            </p>
            <div
              className={`inline-flex items-center gap-2 px-3 py-2 rounded text-white ${getStatusColor(delivery.status)}`}
            >
              {statusFlow.find((s) => s.key === delivery.status)?.icon &&
                (() => {
                  const Icon = statusFlow.find(
                    (s) => s.key === delivery.status,
                  )!.icon;
                  return <Icon className="w-4 h-4" />;
                })()}
              <span className="font-medium">
                {statusFlow.find((s) => s.key === delivery.status)?.label ||
                  delivery.status}
              </span>
            </div>
          </div>

          {/* GPS Location */}
          {currentLocation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-green-500" />
              GPS: {currentLocation}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Progress */}
      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/30">
          <TabsTrigger value="progress">Napredak / Progress</TabsTrigger>
          <TabsTrigger value="history">Historija / History</TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <Card className="bg-card/90 backdrop-blur border-orange-500/20">
            <CardContent className="pt-6">
              <div className="space-y-2">
                {statusFlow.map((step, idx) => {
                  const Icon = step.icon;
                  const isCompleted = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div
                      key={step.key}
                      className={`flex items-center gap-3 p-3 rounded ${
                        isCurrent
                          ? "bg-orange-500/20 border border-orange-500/50"
                          : isCompleted
                            ? "bg-green-500/10 border border-green-500/30"
                            : "bg-muted/30"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isCurrent
                            ? "text-orange-500"
                            : isCompleted
                              ? "text-green-500"
                              : "text-muted-foreground"
                        }`}
                      />
                      <span
                        className={`flex-1 ${
                          isCurrent
                            ? "font-bold text-white"
                            : isCompleted
                              ? "text-white"
                              : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                      {isCompleted && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-card/90 backdrop-blur border-orange-500/20">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {history && history.length > 0 ? (
                  history.map((h: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex gap-3 relative pb-4 last:pb-0"
                    >
                      {idx < history.length - 1 && (
                        <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-orange-500/20" />
                      )}
                      <div
                        className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center bg-card ${
                          idx === 0
                            ? "border-orange-500"
                            : "border-orange-500/50"
                        }`}
                      >
                        <div
                          className={`h-2 w-2 rounded-full ${
                            idx === 0 ? "bg-orange-500" : "bg-orange-500/50"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-white">
                            {h.status.replace("_", " ").toUpperCase()}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(h.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {h.notes && (
                          <p className="text-sm text-white/70 mt-1 italic">
                            "{h.notes}"
                          </p>
                        )}
                        {h.gpsLocation && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> {h.gpsLocation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Nema historije / No history
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      {nextStep &&
        delivery.status !== "completed" &&
        delivery.status !== "cancelled" && (
          <Card className="bg-card/90 backdrop-blur border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex justify-between items-center">
                Akcije / Actions
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-orange-500"
                  onClick={startVoiceToText}
                >
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                    Voice
                  </div>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Napomene / Notes (opciono)
                </label>
                <Textarea
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="Dodajte napomene... / Add notes..."
                  rows={3}
                  className="text-base bg-muted/20 border-orange-500/10 focus:border-orange-500/30"
                />
              </div>

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 h-14 border-orange-500/20 hover:bg-orange-500/10"
                >
                  <Camera className="w-6 h-6 mr-2 text-orange-500" />
                  Foto
                </Button>

                <Button
                  onClick={() => handleStatusUpdate(nextStep.key)}
                  disabled={updateStatus.isPending || !currentLocation}
                  className="flex-3 h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg"
                >
                  {updateStatus.isPending ? (
                    "Ažuriranje..."
                  ) : (
                    <>
                      <nextStep.icon className="w-6 h-6 mr-2" />
                      {nextStep.label.split(" / ")[0]}
                    </>
                  )}
                </Button>
              </div>

              {!currentLocation && (
                <p className="text-xs text-yellow-500 text-center animate-pulse">
                  Čeka se GPS lokacija... / Waiting for GPS location...
                </p>
              )}
            </CardContent>
          </Card>
        )}

      {/* Delivery Photos */}
      {delivery.deliveryPhotos &&
        JSON.parse(delivery.deliveryPhotos).length > 0 && (
          <Card className="bg-card/90 backdrop-blur border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-lg">Fotografije / Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {JSON.parse(delivery.deliveryPhotos).map(
                  (photo: string, idx: number) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`Delivery photo ${idx + 1}`}
                      className="w-full h-24 object-cover rounded border border-border"
                    />
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
