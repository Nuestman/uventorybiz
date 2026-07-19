import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Building2, Ambulance, CheckCircle2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CareLocation {
  id: string;
  locationName: string;
  locationCode: string;
  isPrimary: boolean;
  locationKind?: string;
}

function LocationBadges({ location }: { location: CareLocation }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      <Badge variant="outline" className="text-xs">
        {location.locationCode}
      </Badge>
      {location.locationKind === "fleet" && (
        <Badge variant="secondary" className="text-xs">
          Ambulance
        </Badge>
      )}
      {location.isPrimary && (
        <Badge variant="secondary" className="text-xs">
          Primary
        </Badge>
      )}
    </div>
  );
}

function LocationIcon({
  location,
  className,
}: {
  location: CareLocation;
  className?: string;
}) {
  const Icon = location.locationKind === "fleet" ? Ambulance : Building2;
  return <Icon className={cn("h-5 w-5", className)} aria-hidden />;
}

function LocationCardContent({ location }: { location: CareLocation }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/80">
        <LocationIcon location={location} className="text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <CardTitle className="text-base font-semibold leading-tight">
          {location.locationName}
        </CardTitle>
        <LocationBadges location={location} />
      </div>
    </div>
  );
}

const locationCardBase =
  "cursor-pointer transition-all duration-200 hover:bg-uventorybiz-light hover:shadow-md active:scale-[0.99]";

export function LocationSelectionModal() {
  const { isMultiLocation, activeLocation, selectLocation, isSelecting } = useActiveLocation();
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [lastUsedLocationId, setLastUsedLocationId] = useState<string | null>(null);

  const { data: locations, isLoading } = useQuery<CareLocation[]>({
    queryKey: ["/api/care-locations"],
    enabled: isMultiLocation && !activeLocation,
  });

  useEffect(() => {
    const lastUsed = localStorage.getItem("lastWorkingLocation");
    if (lastUsed) {
      setLastUsedLocationId(lastUsed);
      setSelectedLocationId(lastUsed);
    }
  }, []);

  if (!isMultiLocation || activeLocation) {
    return null;
  }

  const handleConfirm = (locationId: string) => {
    if (!locationId) return;
    selectLocation(
      { locationId, reason: "Selecting working store" },
      {
        onSuccess: () => {
          localStorage.setItem("lastWorkingLocation", locationId);
        },
      },
    );
  };

  const lastUsedLocation = locations?.find((loc) => loc.id === lastUsedLocationId);
  const otherLocations = locations?.filter((loc) => loc.id !== lastUsedLocationId) ?? [];
  const showConfirm =
    !!selectedLocationId && selectedLocationId !== lastUsedLocationId;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md gap-4"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            Select your working location
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {lastUsedLocation && (
            <Card
              className={cn(
                locationCardBase,
                "border-primary/30 bg-primary/5 shadow-sm hover:bg-uventorybiz-light hover:shadow-lg",
              )}
              onClick={() => !isSelecting && handleConfirm(lastUsedLocationId!)}
            >
              <CardHeader className="p-3">
                <Badge variant="default" className="mb-2 w-fit text-xs">
                  Last used
                </Badge>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <LocationIcon location={lastUsedLocation} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {lastUsedLocation.locationName}
                    </CardTitle>
                    <LocationBadges location={lastUsedLocation} />
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {lastUsedLocation && otherLocations.length > 0 && (
            <p className="text-xs text-muted-foreground text-center uppercase tracking-wide">
              Or choose another location
            </p>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-[80vh] overflow-y-auto pr-1">
              {otherLocations.map((location) => {
                const selected = selectedLocationId === location.id;
                return (
                  <Card
                    key={location.id}
                    className={cn(
                      locationCardBase,
                      "bg-card shadow-sm",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md hover:bg-uventorybiz-light"
                        : "hover:border-muted-foreground/20",
                    )}
                    onClick={() => setSelectedLocationId(location.id)}
                  >
                    <CardHeader className="p-3">
                      <LocationCardContent location={location} />
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {showConfirm && (
          <DialogFooter className="sm:justify-stretch pt-0">
            <Button
              onClick={() => handleConfirm(selectedLocationId)}
              className="w-full"
              disabled={isSelecting}
            >
              {isSelecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting location…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirm location
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
