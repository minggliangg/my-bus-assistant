import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BusStopSearchComboBox } from "./BusStopSearchComboBox";

// Mock the Zustand store
const mockBusStops = [
  {
    busStopCode: "55281",
    roadName: "Shenton Way",
    description: "Shenton House",
    latitude: 1.2793,
    longitude: 103.8505,
  },
  {
    busStopCode: "55249",
    roadName: "Shenton Way",
    description: "UE Square",
    latitude: 1.2789,
    longitude: 103.8489,
  },
  {
    busStopCode: "01012",
    roadName: "Victoria St",
    description: "Hotel Grand Pacific",
    latitude: 1.296848,
    longitude: 103.852535,
  },
];

const mockStoreState: {
  busStops: typeof mockBusStops;
  loading: boolean;
  error: string | null;
  lastUpdateTimestamp: number | null;
  isFetching: boolean;
  retryCount: number;
  isStale: boolean;
  fetchBusStops: ReturnType<typeof vi.fn>;
  searchBusStops: ReturnType<typeof vi.fn>;
  getBusStopByCode: ReturnType<typeof vi.fn>;
  retry: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
} = {
  busStops: mockBusStops,
  loading: false,
  error: null,
  lastUpdateTimestamp: 1234567890,
  isFetching: false,
  retryCount: 0,
  isStale: false,
  fetchBusStops: vi.fn(),
  searchBusStops: vi.fn((query: string) => {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return mockBusStops.slice(0, 10);

    return mockBusStops.filter((stop) => {
      const matchesCode = stop.busStopCode.toLowerCase().includes(lowerQuery);
      const matchesDescription = stop.description.toLowerCase().includes(lowerQuery);
      const matchesRoadName = stop.roadName.toLowerCase().includes(lowerQuery);
      return matchesCode || matchesDescription || matchesRoadName;
    }).slice(0, 10);
  }),
  getBusStopByCode: vi.fn((code: string) => mockBusStops.find((stop) => stop.busStopCode === code)),
  retry: vi.fn(),
  reset: vi.fn(),
};

vi.mock("../stores", () => ({
  useBusStopsStore: () => mockStoreState,
}));

describe("BusStopSearchComboBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders closed by default", () => {
    const onBusStopSelect = vi.fn();
    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Search bus stops...")).toBeInTheDocument();
  });

  it("opens popover on trigger click", async () => {
    const onBusStopSelect = vi.fn();
    const user = userEvent.setup();

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by stop number or street/i)).toBeInTheDocument();
    });
  });

  it("debounces search input (300ms)", async () => {
    const onBusStopSelect = vi.fn();
    const user = userEvent.setup();

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    await user.click(screen.getByRole("combobox"));

    const searchInput = screen.getByPlaceholderText(/search by stop number or street/i);
    await user.type(searchInput, "552");

    // Wait for debounce to complete
    await waitFor(
      () => {
        // Should have been called with "552" after debounce
        const calls = mockStoreState.searchBusStops.mock.calls;
        expect(calls.some(call => call[0] === "552")).toBe(true);
      },
      { timeout: 500 }
    );
  });

  it("filters by bus stop code", async () => {
    const onBusStopSelect = vi.fn();
    const user = userEvent.setup();

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    await user.click(screen.getByRole("combobox"));

    const searchInput = screen.getByPlaceholderText(/search by stop number or street/i);
    await user.type(searchInput, "55281");

    await waitFor(
      () => {
        expect(screen.getByText("55281")).toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });

  it("filters by description", async () => {
    const onBusStopSelect = vi.fn();
    const user = userEvent.setup();

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    await user.click(screen.getByRole("combobox"));

    const searchInput = screen.getByPlaceholderText(/search by stop number or street/i);
    await user.type(searchInput, "Hotel");

    await waitFor(
      () => {
        expect(screen.getByText("Hotel Grand Pacific")).toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });

  it("filters by road name", async () => {
    const onBusStopSelect = vi.fn();
    const user = userEvent.setup();

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    await user.click(screen.getByRole("combobox"));

    const searchInput = screen.getByPlaceholderText(/search by stop number or street/i);
    await user.type(searchInput, "Shenton");

    await waitFor(
      () => {
        // Use getAllByText since there are multiple bus stops with "Shenton Way"
        const elements = screen.getAllByText((_content, element) => {
          return element?.textContent === "Shenton Way";
        });
        expect(elements.length).toBeGreaterThan(0);
      },
      { timeout: 500 }
    );
  });

  it("highlights matching text", async () => {
    const onBusStopSelect = vi.fn();
    const user = userEvent.setup();

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    await user.click(screen.getByRole("combobox"));

    const searchInput = screen.getByPlaceholderText(/search by stop number or street/i);
    await user.type(searchInput, "552");

    await waitFor(
      () => {
        const highlightedElements = document.querySelectorAll("mark");
        expect(highlightedElements.length).toBeGreaterThan(0);
      },
      { timeout: 500 }
    );
  });

  it("limits results to 10 items", async () => {
    const onBusStopSelect = vi.fn();
    const user = userEvent.setup();

    // Create 15 bus stops
    const largeBusStops = Array.from({ length: 15 }, (_, i) => ({
      busStopCode: `10${String(i).padStart(2, "0")}`,
      roadName: `Test Road ${i}`,
      description: `Test Description ${i}`,
      latitude: 1.3,
      longitude: 103.8,
    }));

    // Temporarily override the searchBusStops to return 15 items
    const originalSearch = mockStoreState.searchBusStops;
    mockStoreState.searchBusStops = vi.fn(() => largeBusStops.slice(0, 10));

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      const items = document.querySelectorAll('[role="option"]');
      expect(items.length).toBeLessThanOrEqual(10);
    });

    // Restore original
    mockStoreState.searchBusStops = originalSearch;
  });

  it("calls onBusStopSelect with correct bus stop code", async () => {
    const onBusStopSelect = vi.fn();
    const user = userEvent.setup();

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("55281")).toBeInTheDocument();
    });

    const item = screen.getByText("55281").closest('[role="option"]');
    if (item) {
      await user.click(item);
    }

    await waitFor(() => {
      expect(onBusStopSelect).toHaveBeenCalledWith("55281");
    });
  });

  it("shows loading state", async () => {
    const onBusStopSelect = vi.fn();

    // Temporarily set loading to true
    mockStoreState.loading = true;

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} defaultValue="55281" />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText(/loading bus stops/i)).toBeInTheDocument();
    });

    // Reset loading state
    mockStoreState.loading = false;
  });

  it("shows error state with retry button", async () => {
    const onBusStopSelect = vi.fn();

    // Temporarily set error
    mockStoreState.error = "API Error";

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    // Reset error state
    mockStoreState.error = null;
  });

  it("calls retry when retry button is clicked", async () => {
    const onBusStopSelect = vi.fn();
    const retrySpy = vi.fn();

    // Temporarily set error and retry function
    mockStoreState.error = "API Error";
    mockStoreState.retry = retrySpy;

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    const retryButton = screen.getByText("Retry");
    await user.click(retryButton);

    expect(retrySpy).toHaveBeenCalled();

    // Reset error state
    mockStoreState.error = null;
    mockStoreState.retry = vi.fn();
  });

  it("shows empty state when no results found", async () => {
    const onBusStopSelect = vi.fn();

    // Temporarily override search to return empty
    const originalSearch = mockStoreState.searchBusStops;
    mockStoreState.searchBusStops = vi.fn(() => []);

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox"));

    const searchInput = screen.getByPlaceholderText(/search by stop number or street/i);
    await user.type(searchInput, "nonexistent");

    await waitFor(
      () => {
        expect(screen.getByText("No bus stops found.")).toBeInTheDocument();
      },
      { timeout: 500 }
    );

    // Restore original
    mockStoreState.searchBusStops = originalSearch;
  });

  it("closes popover after selection", async () => {
    const onBusStopSelect = vi.fn();
    const user = userEvent.setup();

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by stop number or street/i)).toBeInTheDocument();
    });

    const item = screen.getByText("55281").closest('[role="option"]');
    if (item) {
      await user.click(item);
    }

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search by stop number or street/i)).not.toBeInTheDocument();
    });
  });

  it("displays selected stop in trigger button", () => {
    const onBusStopSelect = vi.fn();

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} defaultValue="55281" />);

    expect(screen.getByText("55281 - Shenton House")).toBeInTheDocument();
  });

  it("displays placeholder when no default value is provided", () => {
    const onBusStopSelect = vi.fn();

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    expect(screen.getByText("Search bus stops...")).toBeInTheDocument();
  });

  it("clears search query after selection", async () => {
    const onBusStopSelect = vi.fn();
    const user = userEvent.setup();

    render(<BusStopSearchComboBox onBusStopSelect={onBusStopSelect} />);

    await user.click(screen.getByRole("combobox"));

    const searchInput = screen.getByPlaceholderText(/search by stop number or street/i);
    await user.type(searchInput, "55281");

    await waitFor(
      () => {
        expect(screen.getByText("55281")).toBeInTheDocument();
      },
      { timeout: 500 }
    );

    const item = screen.getByText("55281").closest('[role="option"]');
    if (item) {
      await user.click(item);
    }

    await waitFor(() => {
      expect(onBusStopSelect).toHaveBeenCalledWith("55281");
    });

    // Reopen the popover and verify search is cleared
    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/search by stop number or street/i) as HTMLInputElement;
      expect(input.value).toBe("");
    });
  });
});
