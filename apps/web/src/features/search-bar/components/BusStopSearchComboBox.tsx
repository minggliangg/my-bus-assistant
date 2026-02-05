import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, MapPin, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { useBusStopsStore } from "../stores";

interface BusStopSearchComboBoxProps {
  onBusStopSelect: (busStopCode: string | undefined) => void;
  defaultValue?: string;
  className?: string;
}

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

export const BusStopSearchComboBox = ({
  onBusStopSelect,
  defaultValue,
  className,
}: BusStopSearchComboBoxProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { busStops, loading, error, searchBusStops, retry } = useBusStopsStore(
    useShallow((state) => ({
      busStops: state.busStops,
      loading: state.loading,
      error: state.error,
      searchBusStops: state.searchBusStops,
      retry: state.retry,
    })),
  );

  const filteredStops = searchBusStops(debouncedQuery);

  const selectedStop = busStops.find(
    (stop) => stop.busStopCode === defaultValue,
  );

  const highlightRegex = useMemo(() => {
    const escapedQuery = debouncedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return debouncedQuery.trim() ? new RegExp(`(${escapedQuery})`, "gi") : null;
  }, [debouncedQuery]);

  const highlightMatch = (text: string): ReactNode => {
    if (!debouncedQuery.trim() || !highlightRegex) return text;

    const parts = text.split(highlightRegex);
    return parts.map((part, i) =>
      part.toLowerCase() === debouncedQuery.toLowerCase() ? (
        <mark key={i} className="bg-accent/50 text-accent-foreground">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  const handleSelect = (busStopCode: string) => {
    onBusStopSelect(busStopCode);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={`w-full justify-between ${className ?? ""} ${selectedStop ? "pr-10" : ""}`}
          >
            <span className="truncate">
              {selectedStop
                ? `${selectedStop.busStopCode} - ${selectedStop.description}`
                : "Search bus stops..."}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-(--radix-popover-trigger-width) sm:w-[350px] md:w-[400px] p-0"
          align="start"
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by stop number or street..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />

            <CommandList>
              {loading && (
                <CommandItem disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading bus stops...
                </CommandItem>
              )}

              {error && (
                <div className="py-6 px-4 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void retry()}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {!loading && !error && filteredStops.length === 0 && (
                <CommandEmpty>
                  <div className="py-6 text-center text-sm">
                    <p className="text-muted-foreground">No bus stops found.</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Try searching by bus stop code or street name
                    </p>
                  </div>
                </CommandEmpty>
              )}

              {!loading && !error && filteredStops.length > 0 && (
                <CommandGroup>
                  {filteredStops.map((stop) => (
                    <CommandItem
                      key={stop.busStopCode}
                      value={stop.busStopCode}
                      onSelect={() => handleSelect(stop.busStopCode)}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">
                            {highlightMatch(stop.busStopCode)}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {highlightMatch(stop.description)}
                          </div>
                          <div className="text-xs text-muted-foreground/70 truncate">
                            {highlightMatch(stop.roadName)}
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedStop && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-sm hover:bg-muted/50 transition-colors z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBusStopSelect(undefined);
            setSearchQuery("");
          }}
          aria-label="Clear selection"
        >
          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
      )}
    </div>
  );
};
