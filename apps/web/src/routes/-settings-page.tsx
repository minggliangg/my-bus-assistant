import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusStopsStore } from "@/features/search-bar/stores";
import { useTutorialStore } from "@/features/tutorial";
import {
  clearAllCaches,
  getBusRoutesCount,
  getBusStopsCount,
  getLastUpdate,
} from "@/lib/storage/bus-stops-db";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  CircleHelp,
  Database,
  Loader2,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface CacheInfo {
  lastUpdate: number | null;
  busStopsCount: number;
  busRoutesCount: number;
}

export const SettingsPage = () => {
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [clearing, setClearing] = useState(false);
  const navigate = useNavigate();
  const startTutorial = useTutorialStore((state) => state.startTutorial);

  const loadCacheInfo = useCallback(async () => {
    const [lastUpdate, busStopsCount, busRoutesCount] = await Promise.all([
      getLastUpdate(),
      getBusStopsCount(),
      getBusRoutesCount(),
    ]);
    setCacheInfo({ lastUpdate, busStopsCount, busRoutesCount });
  }, []);

  useEffect(() => {
    loadCacheInfo();
  }, [loadCacheInfo]);

  const handleClearCache = async () => {
    setClearing(true);
    try {
      await clearAllCaches();
      useBusStopsStore.getState().reset();
      await loadCacheInfo();
      useBusStopsStore.getState().fetchBusStops();
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleDateString("en-SG", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleReplayTutorial = async () => {
    await navigate({ to: "/", search: { busStop: undefined } });
    startTutorial({ force: true });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link to="/" search={{ busStop: undefined }}>
          <Button variant="ghost" size="icon" title="Back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-4 w-4" />
              Cache Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {cacheInfo ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Last bus stops update
                  </span>
                  <span className="font-medium">
                    {formatDate(cacheInfo.lastUpdate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Cached bus stops
                  </span>
                  <span className="font-medium">
                    {cacheInfo.busStopsCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Cached bus routes
                  </span>
                  <span className="font-medium">
                    {cacheInfo.busRoutesCount.toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tutorial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Replay the Home walkthrough anytime to revisit icon controls.
            </p>
            <Button
              variant="outline"
              onClick={() => void handleReplayTutorial()}
              className="w-full"
            >
              <CircleHelp className="h-4 w-4 mr-2" />
              Replay tutorial
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Clear Cached Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Clears cached bus stops and routes. Your favorites will be
              preserved. Fresh data will be fetched automatically.
            </p>
            <Button
              variant="destructive"
              onClick={handleClearCache}
              disabled={clearing}
              className="w-full"
            >
              {clearing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cached Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
