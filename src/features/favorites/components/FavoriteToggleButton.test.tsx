import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { FavoriteToggleButton } from "./FavoriteToggleButton";
import useFavoritesStore from "../stores/useFavoritesStore";
import * as favoritesDb from "@/lib/storage/favorites-db";

describe("FavoriteToggleButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useFavoritesStore.setState({
      favorites: [],
      loading: false,
      error: null,
    });
  });

  it("should render unfilled star when not favorited", () => {
    render(<FavoriteToggleButton busStopCode="01012" />);

    const button = screen.getByRole("button");
    const star = button.querySelector("svg");

    expect(star).toBeInTheDocument();
    expect(star).not.toHaveClass("fill-yellow-400");
    expect(star).not.toHaveClass("text-yellow-400");
  });

  it("should render filled star when favorited", () => {
    useFavoritesStore.setState({ favorites: ["01012"] });

    render(<FavoriteToggleButton busStopCode="01012" />);

    const button = screen.getByRole("button");
    const star = button.querySelector("svg");

    expect(star).toBeInTheDocument();
    expect(star).toHaveClass("fill-yellow-400");
    expect(star).toHaveClass("text-yellow-400");
  });

  it("should toggle favorite on click", async () => {
    const user = userEvent.setup();
    const mockAddFavorite = vi.spyOn(favoritesDb, "addFavorite").mockResolvedValue();
    vi.spyOn(favoritesDb, "getAllFavorites").mockResolvedValue(["01012"]);

    useFavoritesStore.setState({ favorites: [] });

    render(<FavoriteToggleButton busStopCode="01012" />);

    const button = screen.getByRole("button");

    await user.click(button);

    await waitFor(() => {
      const state = useFavoritesStore.getState();
      expect(state.favorites).toContain("01012");
    });

    expect(mockAddFavorite).toHaveBeenCalledWith("01012");
  });

  it("should have correct aria-label when not favorited", () => {
    useFavoritesStore.setState({ favorites: [] });

    render(<FavoriteToggleButton busStopCode="01012" />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Add to favorites");
  });

  it("should have correct aria-label when favorited", () => {
    useFavoritesStore.setState({ favorites: ["01012"] });

    render(<FavoriteToggleButton busStopCode="01012" />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Remove from favorites");
  });
});
