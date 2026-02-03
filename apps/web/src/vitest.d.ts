import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import type { Assertion } from "vitest";

declare module "vitest" {
  interface Assertion<T = any> extends TestingLibraryMatchers<T, ReturnType<typeof import("@testing-library/jest-dom/matchers").getMissingMatchers>> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers {}
}
