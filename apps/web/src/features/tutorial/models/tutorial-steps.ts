export type TutorialPlacement = "top" | "bottom" | "left" | "right" | "auto";

export interface TutorialStep {
  id: string;
  selector: string;
  title: string;
  description: string;
  placement: TutorialPlacement;
}

export const HOME_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "search-bus-stop",
    selector: '[data-tour-id="search-bus-stop"]',
    title: "Search for a bus stop",
    description: "Use this search control to pick a bus stop by code or road name.",
    placement: "bottom",
  },
  {
    id: "manual-refresh",
    selector: '[data-tour-id="manual-refresh"]',
    title: "Refresh manually",
    description: "Tap this icon to fetch the latest arrivals immediately.",
    placement: "bottom",
  },
  {
    id: "auto-refresh",
    selector: '[data-tour-id="auto-refresh"]',
    title: "Toggle auto refresh",
    description: "Turn auto-refresh on or off to keep arrivals updated automatically.",
    placement: "bottom",
  },
  {
    id: "nearby-stops",
    selector: '[data-tour-id="nearby-stops"]',
    title: "Find nearby stops",
    description: "This opens nearby bus stops based on your current location.",
    placement: "bottom",
  },
  {
    id: "theme-toggle",
    selector: '[data-tour-id="theme-toggle"]',
    title: "Switch theme",
    description: "Change between light, dark, or system theme here.",
    placement: "left",
  },
  {
    id: "settings-link",
    selector: '[data-tour-id="settings-link"]',
    title: "Open settings",
    description: "Go to Settings for cache controls and replaying this tutorial.",
    placement: "top",
  },
];
