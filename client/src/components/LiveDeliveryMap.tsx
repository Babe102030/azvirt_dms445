import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { MapPin, Truck, Clock, Navigation, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function LiveDeliveryMap() {
  const { data: activeDeliveries, refetch } = trpc.deliveries.getActiveDeliveries.useQuery();
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const sendNotification = trpc.deliveries.sendCustomerNotification.useMutation({
    onSuccess: () => {
      toast.success('SMS notification sent to customer');
      refetch();
    },
    onError: () => {
      toast.error('Failed to send SMS notification');
    },
  });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      loaded: 'bg-blue-500',
      en_route: 'bg-yellow-500',
      arrived: 'bg-purple-500',
      delivered: 'bg-green-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      loaded: 'Natovareno / Loaded',
      en_route: 'Na putu / En Route',
      arrived: 'Stigao / Arrived',
      delivered: 'Isporučeno / Delivered',
    };
    return labels[status] || status;
  };

  const calculateETA = (delivery: any) => {
    if (!delivery.estimatedArrival) return 'N/A';
    
    const eta = new Date(delivery.estimatedArrival * 1000);
    const now = new Date();
    const diffMinutes = Math.floor((eta.getTime() - now.getTime()) / 60000);
    
    if (diffMinutes < 0) return 'Arrived';
    if (diffMinutes < 60) return `${diffMinutes} min`;
    return `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`;
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/90 backdrop-blur border-orange-500/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-orange-500" />
              Live Delivery Tracking / Praćenje isporuka uživo
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {activeDeliveries?.length || 0} aktivnih / active
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activeDeliveries || activeDeliveries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nema aktivnih isporuka / No active deliveries</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-white">
                          Isporuka #{delivery.id} - {delivery.projectName}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {delivery.concreteType} • {delivery.volume} m³
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-medium text-white ${getStatusColor(delivery.status)}`}>
                      {getStatusLabel(delivery.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Vozač / Driver</p>
                      <p className="text-white">{delivery.driverName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Vozilo / Vehicle</p>
                      <p className="text-white">{delivery.vehicleNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        ETA
                      </p>
                      <p className="text-white">{calculateETA(delivery)}</p>
                    </div>
                    {delivery.gpsLocation && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          GPS
                        </p>
                        <a
                          href={`https://www.google.com/maps?q=${delivery.gpsLocation}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 text-xs underline"
                        >
                          Vidi na mapi / View on map
                        </a>
                      </div>
                    )}
                  </div>

                  {delivery.driverNotes && (
                    <div className="mt-3 p-2 bg-card/50 rounded border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Napomene vozača / Driver Notes</p>
                      <p className="text-sm text-white">{delivery.driverNotes}</p>
                    </div>
                  )}

                  {/* Delivery Photos */}
                  {delivery.deliveryPhotos && JSON.parse(delivery.deliveryPhotos).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">Fotografije / Photos</p>
                      <div className="flex gap-2 overflow-x-auto">
                        {JSON.parse(delivery.deliveryPhotos).map((photo: string, idx: number) => (
                          <a
                            key={idx}
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={photo}
                              alt={`Delivery photo ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded border border-border hover:opacity-80 transition-opacity"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Zakazano / Scheduled: {new Date(delivery.scheduledTime).toLocaleTimeString()}</span>
                        {delivery.actualArrivalTime && (
                          <span>Stigao / Arrived: {new Date(delivery.actualArrivalTime * 1000).toLocaleTimeString()}</span>
                        )}
                        {delivery.actualDeliveryTime && (
                          <span>Isporučeno / Delivered: {new Date(delivery.actualDeliveryTime * 1000).toLocaleTimeString()}</span>
                        )}
                      </div>
                      {delivery.customerPhone && delivery.status === 'en_route' && !delivery.smsNotificationSent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendNotification.mutate({
                            deliveryId: delivery.id,
                            message: `Your concrete delivery is on the way! ETA: ${calculateETA(delivery)}. Project: ${delivery.projectName}`
                          })}
                          disabled={sendNotification.isPending}
                          className="bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/50"
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Notify Customer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
        <span>Auto-refresh: {autoRefresh ? 'ON' : 'OFF'} (every 30s)</span>
      </div>
    </div>
  );
}
