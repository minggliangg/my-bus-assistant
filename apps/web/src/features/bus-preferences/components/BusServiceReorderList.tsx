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
import { Eye, EyeOff, GripVertical, RotateCcw } from "lucide-react";
import { useState, useRef, useMemo, useEffect } from "react";
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
  const { stopPreferences, reorderServices, hideService, unhideService, resetServiceOrder } =
    useBusPreferencesStore(
      useShallow((state) => ({
        stopPreferences: state.stopPreferences,
        reorderServices: state.reorderServices,
        hideService: state.hideService,
        unhideService: state.unhideService,
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Sync items when initialItems changes (e.g., after reset)
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.target as HTMLDivElement;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    setItems(newItems);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch event handlers for mobile drag support
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    setTouchDragIndex(index);
    dragNodeRef.current = e.currentTarget as HTMLDivElement;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchDragIndex === null || !listRef.current) return;

    const touch = e.touches[0];

    // Calculate which item we're hovering over
    const listRect = listRef.current.getBoundingClientRect();
    const relativeY = touch.clientY - listRect.top;

    let newHoverIndex = 0;
    let accumulatedHeight = 0;

    for (let i = 0; i < items.length; i++) {
      const itemEl = itemRefs.current.get(items[i].serviceNo);
      if (itemEl) {
        const itemHeight = itemEl.offsetHeight;
        accumulatedHeight += itemHeight;
        if (relativeY < accumulatedHeight) {
          newHoverIndex = i;
          break;
        }
        newHoverIndex = i;
      }
    }

    if (newHoverIndex !== dragOverIndex && newHoverIndex !== touchDragIndex) {
      setDragOverIndex(newHoverIndex);
    }
  };

  const handleTouchEnd = () => {
    if (touchDragIndex !== null && dragOverIndex !== null && touchDragIndex !== dragOverIndex) {
      const newItems = [...items];
      const [draggedItem] = newItems.splice(touchDragIndex, 1);
      newItems.splice(dragOverIndex, 0, draggedItem);
      setItems(newItems);
    }

    setTouchDragIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  };

  const toggleHidden = (serviceNo: string, currentlyHidden: boolean) => {
    if (currentlyHidden) {
      unhideService(busStopCode, serviceNo);
    } else {
      hideService(busStopCode, serviceNo);
    }
    setItems((prev) =>
      prev.map((item) =>
        item.serviceNo === serviceNo
          ? { ...item, isHidden: !currentlyHidden }
          : item
      )
    );
  };

  const handleSave = () => {
    const newOrder = items.map((i) => i.serviceNo);
    reorderServices(busStopCode, newOrder);
    onClose();
  };

  const handleReset = () => {
    resetServiceOrder(busStopCode);
  };

  return (
    <>
      <div ref={listRef} className="space-y-2 max-h-[60vh] overflow-y-auto py-2">
        {items.map((item, index) => (
          <div
            key={item.serviceNo}
            ref={(el) => {
              if (el) itemRefs.current.set(item.serviceNo, el);
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, index)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing select-none",
              item.isHidden && "opacity-50 bg-muted",
              (draggedIndex === index || touchDragIndex === index) && "opacity-50 scale-95",
              dragOverIndex === index && "border-primary border-2"
            )}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
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
            Drag to reorder, tap the eye icon to hide services at this stop.
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
