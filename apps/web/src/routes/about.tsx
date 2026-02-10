import { lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const AboutComponent = lazy(() => import("./-about-component"));

export const Route = createFileRoute("/about")({
  component: AboutComponent,
});
