import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

/* eslint-disable @typescript-eslint/no-empty-object-type */
declare module "vitest" {
  interface Assertion<T = unknown> extends TestingLibraryMatchers<T, void> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers {}
}
