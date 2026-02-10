import { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import useServiceWorkerStore from '../stores/useServiceWorkerStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const UpdateBanner = () => {
  const { isUpdateAvailable, activateUpdate, setUpdateAvailable } = useServiceWorkerStore();
  const [dismissed, setDismissed] = useState(false);

  const isVisible = isUpdateAvailable && !dismissed;

  const handleRefresh = () => activateUpdate();

  const handleDismiss = () => {
    setDismissed(true);
    setUpdateAvailable(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-lg animate-in slide-in-from-bottom duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="mx-auto max-w-2xl p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-start gap-3">
            <Badge variant="default" className="shrink-0">
              <RefreshCw className="mr-1 size-3" />
              Update
            </Badge>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold">🔄 New version available</p>
              <p className="text-xs text-muted-foreground">
                Click to refresh for latest updates
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleRefresh}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className="size-3" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDismiss}
              className="size-8 shrink-0"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdateBanner;
