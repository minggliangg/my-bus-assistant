import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnalytics } from "./analytics";

const memoryStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
};

const setup = (overrides: Partial<Parameters<typeof createAnalytics>[0]> = {}) => {
  let now = 1_000_000;
  let idCounter = 0;
  const sent: unknown[] = [];
  const instance = createAnalytics({
    enabled: true,
    send: (body) => sent.push(JSON.parse(body)),
    now: () => now,
    local: memoryStorage(),
    session: memoryStorage(),
    isStandalone: () => false,
    randomId: () => `id-0000000${++idCounter}`,
    ...overrides,
  });
  return { instance, sent, advance: (ms: number) => (now += ms) };
};

describe("createAnalytics", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("batches events and starts a session on the first event", () => {
    const { instance, sent } = setup();
    instance.pageView("/");
    instance.stopViewed("01012", "search");
    expect(sent).toHaveLength(0);

    vi.advanceTimersByTime(5000);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      anonId: expect.any(String),
      sessionId: expect.any(String),
      standalone: false,
      events: [
        { name: "session_start" },
        { name: "page_view", path: "/" },
        { name: "stop_viewed", stopCode: "01012", source: "search" },
      ],
    });
  });

  it("starts a new session after 30 minutes idle but keeps the visitor ID", () => {
    const { instance, sent, advance } = setup();
    instance.pageView("/");
    instance.flush();
    advance(31 * 60 * 1000);
    instance.pageView("/settings");
    instance.flush();

    const [first, second] = sent as { anonId: string; sessionId: string; events: { name: string }[] }[];
    expect(second.anonId).toBe(first.anonId);
    expect(second.sessionId).not.toBe(first.sessionId);
    expect(second.events[0].name).toBe("session_start");
  });

  it("does nothing when disabled", () => {
    const send = vi.fn();
    const { instance } = setup({ enabled: false, send });
    instance.pageView("/");
    instance.flush();
    vi.runAllTimers();
    expect(send).not.toHaveBeenCalled();
  });

  it("survives storage that throws", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const { instance, sent } = setup({ local: throwing, session: throwing });
    instance.pageView("/");
    instance.flush();
    expect(sent).toHaveLength(1);
  });

  it("never throws when sending fails", () => {
    const { instance } = setup({
      send: () => {
        throw new Error("offline");
      },
    });
    instance.pageView("/");
    expect(() => instance.flush()).not.toThrow();
  });
});
