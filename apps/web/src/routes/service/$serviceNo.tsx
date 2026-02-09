import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const ServiceRoutePageComponent = lazy(
  () =>
    import("../-service-route-page").then((m) => ({
      default: m.ServiceRoutePage,
    })),
);

export const Route = createFileRoute("/service/$serviceNo")({
  component: ServiceRoutePageComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    fromStop: (search.fromStop as string) || undefined,
  }),
});
