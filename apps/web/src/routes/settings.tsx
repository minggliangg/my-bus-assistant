import { lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const SettingsPage = lazy(() => import("./-settings-page").then((m) => ({ default: m.SettingsPage })));

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
