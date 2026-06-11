import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFact } from "@/hooks/useFact";
import { api } from "@/lib/api";

function fact(content: string, movie: string) {
  return { fact: content, movie, createdAt: new Date().toISOString() };
}

describe("useFact client cache", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches a fact on mount", async () => {
    const getFact = vi.spyOn(api, "getFact").mockResolvedValue(fact("F1", "Inception"));
    const { result } = renderHook(() => useFact("Inception"));
    await waitFor(() => expect(result.current.fact).toBe("F1"));
    expect(getFact).toHaveBeenCalledTimes(1);
  });

  it("reuses the cached fact for the same movie within the 30s window", async () => {
    const getFact = vi.spyOn(api, "getFact").mockResolvedValue(fact("F1", "Inception"));

    const first = renderHook(() => useFact("Inception"));
    await waitFor(() => expect(first.result.current.fact).toBe("F1"));
    first.unmount();

    // Remount for the same movie immediately → should be served from cache.
    const second = renderHook(() => useFact("Inception"));
    await waitFor(() => expect(second.result.current.fact).toBe("F1"));
    expect(getFact).toHaveBeenCalledTimes(1);
  });

  it("invalidates the cache when the movie changes", async () => {
    const getFact = vi
      .spyOn(api, "getFact")
      .mockResolvedValueOnce(fact("F-inception", "Inception"))
      .mockResolvedValueOnce(fact("F-heat", "Heat"));

    const { result, rerender } = renderHook(({ m }) => useFact(m), {
      initialProps: { m: "Inception" },
    });
    await waitFor(() => expect(result.current.fact).toBe("F-inception"));

    rerender({ m: "Heat" });
    await waitFor(() => expect(result.current.fact).toBe("F-heat"));
    expect(getFact).toHaveBeenCalledTimes(2);
  });

  it("forces a fresh fetch on refresh, bypassing the cache", async () => {
    const getFact = vi
      .spyOn(api, "getFact")
      .mockResolvedValueOnce(fact("F1", "Inception"))
      .mockResolvedValueOnce(fact("F2", "Inception"));

    const { result } = renderHook(() => useFact("Inception"));
    await waitFor(() => expect(result.current.fact).toBe("F1"));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.fact).toBe("F2");
    expect(getFact).toHaveBeenCalledTimes(2);
  });

  it("exposes a normalized error message when fetching fails", async () => {
    const { ApiError } = await import("@/lib/api");
    vi.spyOn(api, "getFact").mockRejectedValue(new ApiError(503, "OpenAI is down"));

    const { result } = renderHook(() => useFact("Inception"));
    await waitFor(() => expect(result.current.error).toBe("OpenAI is down"));
    expect(result.current.fact).toBeNull();
  });
});
