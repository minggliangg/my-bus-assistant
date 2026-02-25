import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBusPreferencesStore } from "@/features/bus-preferences";
import { getOperatorBadgeColors } from "@/features/bus-arrivals/utils";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useState, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

interface BusServiceReorderListProps {
  busStopCode: string;
  services: { serviceNo: string; operator: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ServiceItem {
  serviceNo: string;
  operator: string;
  isHidden: boolean;
}

const ServiceReorderListInner = ({
  busStopCode,
  services,
  onClose,
}: {
  busStopCode: string;
  services: { serviceNo: string; operator: string }[];
  onClose: () => void;
}) => {
  const { stopPreferences, saveStopPreferences, resetServiceOrder } =
    useBusPreferencesStore(
      useShallow((state) => ({
        stopPreferences: state.stopPreferences,
        saveStopPreferences: state.saveStopPreferences,
        resetServiceOrder: state.resetServiceOrder,
      }))
    );

  const prefs = stopPreferences[busStopCode];

  const initialItems = useMemo(() => {
    const hiddenSet = new Set(prefs?.hiddenServices ?? []);
    const result: ServiceItem[] = [];

    if (prefs?.serviceOrder) {
      const orderSet = new Set(prefs.serviceOrder);
      for (const serviceNo of prefs.serviceOrder) {
        const svc = services.find((s) => s.serviceNo === serviceNo);
        if (svc) {
          result.push({
            serviceNo,
            operator: svc.operator,
            isHidden: hiddenSet.has(serviceNo),
          });
        }
      }
      for (const s of services) {
        if (!orderSet.has(s.serviceNo)) {
          result.push({
            serviceNo: s.serviceNo,
            operator: s.operator,
            isHidden: hiddenSet.has(s.serviceNo),
          });
        }
      }
    } else {
      for (const s of services) {
        result.push({
          serviceNo: s.serviceNo,
          operator: s.operator,
          isHidden: hiddenSet.has(s.serviceNo),
        });
      }
    }

    return result;
  }, [services, prefs]);

  const [items, setItems] = useState<ServiceItem[]>(initialItems);

  const moveItem = (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    setItems(newItems);
  };

  const toggleHidden = (serviceNo: string, currentlyHidden: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.serviceNo === serviceNo ? { ...item, isHidden: !currentlyHidden } : item
      )
    );
  };

  const handleSave = () => {
    const newOrder = items.map((i) => i.serviceNo);
    const newHidden = items.filter((i) => i.isHidden).map((i) => i.serviceNo);
    saveStopPreferences(busStopCode, newOrder, newHidden);
    onClose();
  };

  const handleReset = () => {
    resetServiceOrder(busStopCode);
    setItems(
      services.map((s) => ({ serviceNo: s.serviceNo, operator: s.operator, isHidden: false }))
    );
  };

  return (
    <>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto py-2">
        {items.map((item, index) => (
          <div
            key={item.serviceNo}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border transition-all",
              item.isHidden && "opacity-50 bg-muted"
            )}
          >
            <div className="flex flex-col shrink-0">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => moveItem(index, "up")}
                disabled={index === 0}
                title="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => moveItem(index, "down")}
                disabled={index === items.length - 1}
                title="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                getOperatorBadgeColors(item.operator)
              )}
            >
              {item.serviceNo}
            </span>
            <span className="flex-1 text-sm">
              {item.isHidden && (
                <span className="text-muted-foreground">(Hidden)</span>
              )}
            </span>
            <button
              onClick={() => toggleHidden(item.serviceNo, item.isHidden)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                item.isHidden
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-primary hover:bg-primary/10"
              )}
              title={item.isHidden ? "Show service" : "Hide service"}
            >
              {item.isHidden ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        ))}
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="w-full sm:w-auto"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Customisation
        </Button>
        <Button size="sm" onClick={handleSave} className="w-full sm:w-auto">
          Save Changes
        </Button>
      </DialogFooter>
    </>
  );
};

export const BusServiceReorderList = ({
  busStopCode,
  services,
  open,
  onOpenChange,
}: BusServiceReorderListProps) => {
  const [dialogKey, setDialogKey] = useState(0);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDialogKey((k) => k + 1);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Services</DialogTitle>
          <DialogDescription>
            Use the arrows to reorder, tap the eye icon to hide services at this stop.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <ServiceReorderListInner
            key={dialogKey}
            busStopCode={busStopCode}
            services={services}
            onClose={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
