import { useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Bus, Clock, MapPin, Users, Loader2 } from "lucide-react";
import useBusStore from "../stores/useBusStopStore";
import {
  formatArrivalTime,
  getBusLoadLabel,
  getArrivalInMinutes,
  type BusService,
} from "../models/bus-stop-models";

interface BusStopCardProps {
  busStopCode: string;
}

export function BusStopCard({ busStopCode }: BusStopCardProps) {
  const { busStop, loading, error, fetchBusArrivals } = useBusStore();

  useEffect(() => {
    fetchBusArrivals(busStopCode);
  }, [busStopCode, fetchBusArrivals]);

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md border-destructive">
        <CardContent className="py-6">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!busStop) return null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Bus Stop
              </p>
              <h3 className="text-xl font-bold tracking-tight">
                {busStop.busStopCode}
              </h3>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex h-8 items-center rounded-lg bg-muted px-3">
              <Bus className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-sm font-semibold">
                {busStop.services.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {busStop.services.length === 1 ? "service" : "services"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {busStop.services.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No services available
          </p>
        ) : (
          busStop.services.map((service) => (
            <BusServiceRow key={service.serviceNo} service={service} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

const BusServiceRow = ({ service }: { service: BusService }) => {
  const arrivals = [service.nextBus, service.nextBus2, service.nextBus3].filter(
    Boolean,
  );

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Service Number */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-bold">{service.serviceNo}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {service.operator}
          </div>
        </div>
      </div>

      {/* Arrivals */}
      {arrivals.length === 0 ? (
        <div className="text-sm text-muted-foreground">No arrivals</div>
      ) : (
        <div className="space-y-2">
          {arrivals.map((arrival, index) => {
            if (!arrival) return null;

            const minutes = getArrivalInMinutes(arrival);
            const isArriving = minutes <= 1;

            return (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span
                    className={
                      isArriving
                        ? "font-semibold text-primary"
                        : "text-foreground"
                    }
                  >
                    {formatArrivalTime(arrival)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {getLoadBadge(arrival.load)}
                  </span>
                  {arrival.type === "DD" && (
                    <Bus className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const getLoadBadge = (load: string): string => {
  const badges: Record<string, string> = {
    SEA: "Seats",
    SDA: "Standing",
    LSD: "Limited",
  };
  return badges[load] || load;
};
