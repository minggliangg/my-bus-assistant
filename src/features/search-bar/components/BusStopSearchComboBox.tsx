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
import { X, Loader2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
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

const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;

  const parts = text.split(
    new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
  );
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-accent/50 text-accent-foreground">
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

export const BusStopSearchComboBox = ({
  onBusStopSelect,
  defaultValue,
  className,
}: BusStopSearchComboBoxProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { busStops, loading, error, searchBusStops, retry } =
    useBusStopsStore();

  const filteredStops = searchBusStops(debouncedQuery);

  const selectedStop = busStops.find(
    (stop) => stop.busStopCode === defaultValue,
  );

  const handleSelect = (busStopCode: string) => {
    onBusStopSelect(busStopCode);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${className ?? ""}`}
        >
          {selectedStop
            ? `${selectedStop.busStopCode} - ${selectedStop.description}`
            : "Search bus stops..."}
          {selectedStop && (
            <X
              className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onBusStopSelect(undefined);
                setSearchQuery("");
              }}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] sm:w-[350px] md:w-[400px] p-0"
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
                          {highlightMatch(stop.busStopCode, debouncedQuery)}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {highlightMatch(stop.description, debouncedQuery)}
                        </div>
                        <div className="text-xs text-muted-foreground/70 truncate">
                          {highlightMatch(stop.roadName, debouncedQuery)}
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
  );
};
