import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
} from "./dialog";

describe("Dialog", () => {
  it("renders dialog trigger", () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
      </Dialog>,
    );
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("renders dialog content with children", () => {
    render(
      <Dialog open>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
              <DialogDescription>Description</DialogDescription>
            </DialogHeader>
            <p>Content</p>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders dialog footer with close button", () => {
    render(
      <Dialog open>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
              <DialogDescription>Description</DialogDescription>
            </DialogHeader>
            <DialogFooter showCloseButton>
              <button>Custom Button</button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );
    expect(screen.getByText("Custom Button")).toBeInTheDocument();
  });
});
