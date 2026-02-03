import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders app title", () => {
    render(<App />);
    expect(screen.getByText("My Bus Assistant")).toBeInTheDocument();
  });

  it("renders app subtitle", () => {
    render(<App />);
    expect(
      screen.getByText("Real-time bus arrival information at your fingertips"),
    ).toBeInTheDocument();
  });
});
