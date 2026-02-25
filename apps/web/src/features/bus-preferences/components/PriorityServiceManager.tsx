import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusPreferencesStore } from "@/features/bus-preferences";
import { cn } from "@/lib/utils";
import { Pin, Plus, X, Loader2 } from "lucide-react";
import { useState, useId, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

export const PriorityServiceManager = () => {
  const inputId = useId();
  const [newService, setNewService] = useState("");
  const {
    globalPriorities,
    loading,
    addPriorityService,
    removePriorityService,
    loadAllPreferences,
  } = useBusPreferencesStore(
    useShallow((state) => ({
      globalPriorities: state.globalPriorities,
      loading: state.loading,
      addPriorityService: state.addPriorityService,
      removePriorityService: state.removePriorityService,
      loadAllPreferences: state.loadAllPreferences,
    }))
  );

  useEffect(() => {
    loadAllPreferences();
  }, [loadAllPreferences]);

  const handleAddService = () => {
    const service = newService.trim().toUpperCase();
    if (service && !globalPriorities.prioritizedServices.includes(service)) {
      addPriorityService(service);
      setNewService("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddService();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Pin className="h-4 w-4" />
            Priority Services
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Pin className="h-4 w-4" />
          Priority Services
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Pin bus services to always appear at the top across all bus stops.
        </p>
        
        <div className="flex gap-2">
          <input
            id={inputId}
            type="text"
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter service number (e.g., 961)"
            className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleAddService}
            disabled={!newService.trim()}
            title="Add service"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {globalPriorities.prioritizedServices.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {globalPriorities.prioritizedServices.map((service) => (
              <Badge
                key={service}
                variant="secondary"
                className={cn(
                  "flex items-center gap-1.5 pl-3 pr-2 py-1.5",
                  "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                <Pin className="h-3 w-3" />
                <span className="font-semibold">{service}</span>
                <button
                  onClick={() => removePriorityService(service)}
                  className="ml-1 rounded-full hover:bg-primary/20 p-0.5"
                  aria-label={`Remove ${service} from priorities`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No priority services set. Pin services from any bus stop or add them above.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
