import { useState, useEffect } from "react";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, ChevronDown, RefreshCw, Building2, AlertCircle, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface CareLocation {
  id: string;
  locationName: string;
  locationCode: string;
  status: string;
  isPrimary: boolean;
}

export function LocationBadge() {
  const { user } = useAuth();
  const { 
    activeLocation, 
    isMultiLocation, 
    switchLocation, 
    isSwitching,
    tenant 
  } = useActiveLocation();
  
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [selectedNewLocation, setSelectedNewLocation] = useState("");
  const [switchReason, setSwitchReason] = useState("");

  // Fetch all locations for switching
  const { data: locations } = useQuery<CareLocation[]>({
    queryKey: ["/api/care-locations"],
    enabled: isMultiLocation && switchDialogOpen,
  });

  // Debug logging
  useEffect(() => {
    console.log('LocationBadge - Debug:', {
      isMultiLocation,
      activeLocation,
      tenant,
      shouldShow: isMultiLocation || activeLocation
    });
  }, [isMultiLocation, activeLocation, tenant]);

  // Don't show badge if not multi-location tenant AND no active location
  // Show if multi-location tenant (even if no location selected - for debugging)
  // Or show if there is an active location
  if (!isMultiLocation && !activeLocation) {
    return null;
  }
  
  // If multi-location but no location selected yet, show a placeholder
  if (isMultiLocation && !activeLocation) {
    return (
      <Badge variant="outline" className="flex items-center gap-2 px-2 md:px-3 py-1">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="hidden md:inline text-xs text-muted-foreground">No Location Selected</span>
      </Badge>
    );
  }

  // At this point, activeLocation is guaranteed to exist (early returns handled null cases)
  if (!activeLocation) {
    return null;
  }

  const otherLocations = locations?.filter((loc) => 
    loc.id !== activeLocation!.id && loc.status === "active"
  ) || [];

  const handleQuickSwitch = (locationId: string, locationName: string) => {
    switchLocation({
      newLocationId: locationId,
      reason: `Quick switch to ${locationName}`,
    });
  };

  const handleSwitchConfirm = () => {
    if (selectedNewLocation) {
      switchLocation(
        {
          newLocationId: selectedNewLocation,
          reason: switchReason || "Location change",
        },
        {
          onSuccess: () => {
            setSwitchDialogOpen(false);
            setSelectedNewLocation("");
            setSwitchReason("");
          },
        }
      );
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2 px-2 md:px-3">
            <MapPin className="h-4 w-4" />
            {/* Hide text on mobile, show on md and up */}
            <div className="hidden md:flex flex-col items-start">
              <span className="text-xs font-medium">Location</span>
              <span className="font-semibold">{activeLocation?.code || 'N/A'}</span>
            </div>
            <ChevronDown className="hidden md:block h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Current Location</DropdownMenuLabel>
          <div className="px-2 py-2">
            <div className="flex items-start gap-2 p-2 bg-primary/10 rounded-md">
              <Building2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{activeLocation?.name || 'Unknown'}</p>
                <Badge variant="outline" className="mt-1">{activeLocation?.code || 'N/A'}</Badge>
              </div>
            </div>
          </div>

          {otherLocations.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Quick Switch</DropdownMenuLabel>
              {otherLocations.slice(0, 3).map((location) => (
                <DropdownMenuItem
                  key={location.id}
                  onClick={() => handleQuickSwitch(location.id, location.locationName)}
                  disabled={isSwitching}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{location.locationName}</span>
                    <span className="text-xs text-muted-foreground">{location.locationCode}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setSwitchDialogOpen(true)} disabled={isSwitching}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Change Location...
          </DropdownMenuItem>

          {isAdmin && (
            <DropdownMenuItem onClick={() => window.location.href = "/admin/locations"}>
              <Settings className="mr-2 h-4 w-4" />
              Manage Locations
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Location Switch Dialog */}
      <Dialog open={switchDialogOpen} onOpenChange={setSwitchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Switch Working Location?
            </DialogTitle>
            <DialogDescription>
              You are about to switch from <strong>{activeLocation?.name || 'current location'}</strong> to a different location. 
              All future activities will be associated with the new location.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-location">Select New Location</Label>
              <Select value={selectedNewLocation} onValueChange={setSelectedNewLocation}>
                <SelectTrigger id="new-location">
                  <SelectValue placeholder="Choose a location" />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    ?.filter((loc) => loc.id !== activeLocation?.id && loc.status === "active")
                    .map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        <div className="flex items-center gap-2">
                          <span>{location.locationName}</span>
                          <Badge variant="outline">{location.locationCode}</Badge>
                          {location.isPrimary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Emergency coverage needed, Temporary reassignment"
                value={switchReason}
                onChange={(e) => setSwitchReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This will be recorded in the audit log for accountability.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSwitchDialogOpen(false);
                setSelectedNewLocation("");
                setSwitchReason("");
              }}
              disabled={isSwitching}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSwitchConfirm}
              disabled={!selectedNewLocation || isSwitching}
            >
              {isSwitching ? "Switching..." : "Switch Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

