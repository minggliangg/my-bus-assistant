import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import type { NearbyBusStop } from "@/features/nearby-stops/models/nearby-stops-model";

interface MapProps {
  className?: string;
  userLocation: { latitude: number; longitude: number } | null;
  busStops: NearbyBusStop[];
  onBusStopClick?: (code: string) => void;
  selectedStopCode?: string;
}

// CartoDB basemap style configuration with theme support
const createMapStyle = (isDark: boolean) => ({
  version: 8 as const,
  sources: {
    "carto-tiles": {
      type: "raster" as const,
      tiles: [
        isDark
          ? "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-tiles",
      type: "raster" as const,
      source: "carto-tiles",
      minzoom: 0,
      maxzoom: 24,
    },
  ],
});

export const Map = ({
  className,
  userLocation,
  busStops,
  onBusStopClick,
  selectedStopCode,
}: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userLocationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const isDark = document.documentElement.classList.contains("dark");

    const initialState = userLocation
      ? {
          center: [userLocation.longitude, userLocation.latitude] as [number, number],
          zoom: 15,
        }
      : {
          center: [103.8198, 1.3521] as [number, number], // Singapore
          zoom: 11,
        };

    if (!mapContainer.current) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: createMapStyle(isDark),
      ...initialState,
      attributionControl: false,
      // Disable all map interactions to prevent excess tile API calls
      boxZoom: false,
      doubleClickZoom: false,
      dragPan: false,
      dragRotate: false,
      keyboard: false,
      pitchWithRotate: false,
      scrollZoom: false,
      touchZoomRotate: false,
      touchPitch: false,
    });

    map.current = mapInstance;

    map.current.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      "bottom-right",
    );

    // NavigationControl removed to prevent user zoom/pan interactions
    // map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    // Listen for theme changes and update map style
    const observer = new MutationObserver(() => {
      const isDarkMode = document.documentElement.classList.contains("dark");
      if (map.current) {
        map.current.setStyle(createMapStyle(isDarkMode));
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map should only initialize once; location changes handled by separate effect
  }, []);

  // Update map center when user location changes
  useEffect(() => {
    if (!map.current || !userLocation || !mapLoaded) return;

    map.current.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 15,
      essential: true,
    });
  }, [userLocation, mapLoaded]);

  // Fit bounds to show all stops
  useEffect(() => {
    if (!map.current || !mapLoaded || busStops.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();

    if (userLocation) {
      bounds.extend([userLocation.longitude, userLocation.latitude]);
    }

    busStops.forEach((stop) => {
      bounds.extend([stop.longitude, stop.latitude]);
    });

    map.current.fitBounds(bounds, {
      padding: 60,
      maxZoom: 16,
    });
  }, [busStops, userLocation, mapLoaded]);

  // Clear existing markers
  const clearMarkers = () => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  };

  // Add user location marker
  useEffect(() => {
    if (!map.current || !userLocation || !mapLoaded) return;

    const mapInstance = map.current;

    // Remove existing user location marker
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
    }

    // Create pulsing user location marker
    const el = document.createElement("div");
    el.className = "user-location-marker";

    const innerEl = document.createElement("div");
    innerEl.className =
      "relative flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg";

    const pulseEl = document.createElement("div");
    pulseEl.className =
      "absolute inset-0 bg-blue-500/30 rounded-full animate-ping";

    el.appendChild(pulseEl);
    el.appendChild(innerEl);

    userLocationMarkerRef.current = new maplibregl.Marker({
      element: el,
      anchor: "center",
    })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(mapInstance);

    return () => {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
    };
  }, [userLocation, mapLoaded]);

  // Update bus stop markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;
    clearMarkers();

    // Sort so selected marker is rendered last (on top)
    const sortedStops = [...busStops].sort((a, b) =>
      a.busStopCode === selectedStopCode ? 1 : b.busStopCode === selectedStopCode ? -1 : 0
    );

    sortedStops.forEach((stop) => {
      const isSelected = stop.busStopCode === selectedStopCode;

      const el = document.createElement("button");
      el.type = "button";
      el.className = cn(
        "bus-stop-marker flex items-end justify-center transition-transform hover:scale-110 origin-bottom focus:outline-none",
      );

      const pinEl = document.createElement("div");
      pinEl.className = "relative flex flex-col items-center";

      // Pin SVG
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("width", "32");
      svg.setAttribute("height", "32");
      svg.setAttribute("class", cn(
        "drop-shadow-md",
        isSelected ? "text-primary" : "text-foreground"
      ));

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute(
        "d",
        "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
      );
      path.setAttribute("fill", "currentColor");

      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      circle.setAttribute("cx", "12");
      circle.setAttribute("cy", "9");
      circle.setAttribute("r", "2.5");
      circle.setAttribute("fill", "white");

      svg.appendChild(path);
      svg.appendChild(circle);

      // Label with bus stop code
      const labelEl = document.createElement("div");
      labelEl.className = cn(
        "-mt-1 mb-1 px-1.5 py-0.5 rounded text-xs font-bold font-mono whitespace-nowrap",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "bg-background text-foreground border border-border",
      );
      labelEl.textContent = stop.busStopCode;

      pinEl.appendChild(labelEl);
      pinEl.appendChild(svg);
      el.appendChild(pinEl);

      const marker = new maplibregl.Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([stop.longitude, stop.latitude])
        .addTo(mapInstance);

      // Add click handler
      el.addEventListener("click", () => {
        onBusStopClick?.(stop.busStopCode);
      });

      markersRef.current.push(marker);
    });

    return () => {
      clearMarkers();
    };
  }, [busStops, mapLoaded, onBusStopClick, selectedStopCode]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className={cn("w-full h-full", className)} />
    </div>
  );
};
