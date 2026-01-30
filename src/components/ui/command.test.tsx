import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "./command";

describe("Command", () => {
  it("renders command input", () => {
    render(
      <Command>
        <CommandInput placeholder="Search..." />
      </Command>,
    );
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("renders command list with items", () => {
    render(
      <Command>
        <CommandList>
          <CommandGroup heading="Items">
            <CommandItem>Item 1</CommandItem>
            <CommandItem>Item 2</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    expect(screen.getByText("Items")).toBeInTheDocument();
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });

  it("renders command empty state", () => {
    render(
      <Command>
        <CommandList>
          <CommandEmpty>No results found</CommandEmpty>
        </CommandList>
      </Command>,
    );
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });
});
