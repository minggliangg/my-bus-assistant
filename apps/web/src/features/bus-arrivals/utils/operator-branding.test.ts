import { describe, expect, test } from "vitest";
import {
  OPERATOR_BRANDING,
  getOperatorBadgeColors,
  getOperatorBranding,
  getOperatorFullName,
} from "./operator-branding";

describe("Operator Branding", () => {
  describe("OPERATOR_BRANDING constant", () => {
    test("has correct branding for SBST", () => {
      expect(OPERATOR_BRANDING.SBST).toEqual({
        fullName: "SBS Transit",
        badgeColors: "bg-[#5e1e79] text-white",
        code: "SBST",
      });
    });

    test("has correct branding for SMRT", () => {
      expect(OPERATOR_BRANDING.SMRT).toEqual({
        fullName: "SMRT Corporation",
        badgeColors: "bg-[#ea0b2a] text-white",
        code: "SMRT",
      });
    });

    test("has correct branding for TTS", () => {
      expect(OPERATOR_BRANDING.TTS).toEqual({
        fullName: "Tower Transit Singapore",
        badgeColors: "bg-[#009548] text-white",
        code: "TTS",
      });
    });

    test("has correct branding for GAS", () => {
      expect(OPERATOR_BRANDING.GAS).toEqual({
        fullName: "Go-Ahead Singapore",
        badgeColors: "bg-[#fdc300] text-gray-900",
        code: "GAS",
      });
    });

    test("has all four operators", () => {
      const keys = Object.keys(OPERATOR_BRANDING);
      expect(keys).toEqual(["SBST", "SMRT", "TTS", "GAS"]);
    });
  });

  describe("getOperatorBranding", () => {
    test("returns correct branding for SBST", () => {
      const branding = getOperatorBranding("SBST");
      expect(branding).toEqual(OPERATOR_BRANDING.SBST);
    });

    test("returns correct branding for SMRT", () => {
      const branding = getOperatorBranding("SMRT");
      expect(branding).toEqual(OPERATOR_BRANDING.SMRT);
    });

    test("returns correct branding for TTS", () => {
      const branding = getOperatorBranding("TTS");
      expect(branding).toEqual(OPERATOR_BRANDING.TTS);
    });

    test("returns correct branding for GAS", () => {
      const branding = getOperatorBranding("GAS");
      expect(branding).toEqual(OPERATOR_BRANDING.GAS);
    });

    test("returns null for unknown operator", () => {
      const branding = getOperatorBranding("UNKNOWN");
      expect(branding).toBeNull();
    });

    test("returns null for empty string", () => {
      const branding = getOperatorBranding("");
      expect(branding).toBeNull();
    });
  });

  describe("getOperatorFullName", () => {
    test("expands SBST to full name", () => {
      expect(getOperatorFullName("SBST")).toBe("SBS Transit");
    });

    test("expands SMRT to full name", () => {
      expect(getOperatorFullName("SMRT")).toBe("SMRT Corporation");
    });

    test("expands TTS to full name", () => {
      expect(getOperatorFullName("TTS")).toBe("Tower Transit Singapore");
    });

    test("expands GAS to full name", () => {
      expect(getOperatorFullName("GAS")).toBe("Go-Ahead Singapore");
    });

    test("falls back to original code for unknown operator", () => {
      expect(getOperatorFullName("UNKNOWN")).toBe("UNKNOWN");
    });

    test("falls back to empty string for empty input", () => {
      expect(getOperatorFullName("")).toBe("");
    });
  });

  describe("getOperatorBadgeColors", () => {
    test("returns correct colors for SBST", () => {
      const colors = getOperatorBadgeColors("SBST");
      expect(colors).toBe("bg-[#5e1e79] text-white");
    });

    test("returns correct colors for SMRT", () => {
      const colors = getOperatorBadgeColors("SMRT");
      expect(colors).toBe("bg-[#ea0b2a] text-white");
    });

    test("returns correct colors for TTS", () => {
      const colors = getOperatorBadgeColors("TTS");
      expect(colors).toBe("bg-[#009548] text-white");
    });

    test("returns correct colors for GAS", () => {
      const colors = getOperatorBadgeColors("GAS");
      expect(colors).toBe("bg-[#fdc300] text-gray-900");
    });

    test("falls back to theme colors for unknown operator", () => {
      const colors = getOperatorBadgeColors("UNKNOWN");
      expect(colors).toBe("bg-primary text-primary-foreground");
    });

    test("falls back to theme colors for empty string", () => {
      const colors = getOperatorBadgeColors("");
      expect(colors).toBe("bg-primary text-primary-foreground");
    });
  });
});
