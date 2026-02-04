import type { BusOperator } from "../models/bus-arrivals-model";

export interface OperatorBranding {
  fullName: string;
  badgeColors: string;
  code: BusOperator;
}

export const OPERATOR_BRANDING: Record<BusOperator, OperatorBranding> = {
  SBST: {
    fullName: "SBS Transit",
    badgeColors: "bg-[#5e1e79] text-white",
    code: "SBST",
  },
  SMRT: {
    fullName: "SMRT Corporation",
    badgeColors: "bg-[#ea0b2a] text-white",
    code: "SMRT",
  },
  TTS: {
    fullName: "Tower Transit Singapore",
    badgeColors: "bg-[#009548] text-white",
    code: "TTS",
  },
  GAS: {
    fullName: "Go-Ahead Singapore",
    badgeColors: "bg-[#fdc300] text-gray-900",
    code: "GAS",
  },
};

export const getOperatorBranding = (
  operator: string
): OperatorBranding | null => {
  return OPERATOR_BRANDING[operator as BusOperator] || null;
};

export const getOperatorFullName = (operator: string): string => {
  const branding = getOperatorBranding(operator);
  return branding?.fullName || operator;
};

export const getOperatorBadgeColors = (operator: string): string => {
  const branding = getOperatorBranding(operator);
  return branding?.badgeColors || "bg-primary text-primary-foreground";
};
