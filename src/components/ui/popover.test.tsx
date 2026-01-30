import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverAnchor,
} from "./popover";

describe("Popover", () => {
  it("renders popover trigger", () => {
    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
      </Popover>,
    );
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("renders popover content with children", () => {
    render(
      <Popover open>
        <PopoverAnchor>
          <button>Trigger</button>
        </PopoverAnchor>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Title</PopoverTitle>
            <PopoverDescription>Description</PopoverDescription>
          </PopoverHeader>
          <p>Content</p>
        </PopoverContent>
      </Popover>,
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
