import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MovieEditor } from "@/app/dashboard/MovieEditor";
import { ApiError } from "@/lib/api";

async function openEditorAndType(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(screen.getByRole("button", { name: /edit/i }));
  const input = screen.getByLabelText(/favorite movie/i);
  await user.clear(input);
  await user.type(input, text);
  await user.click(screen.getByRole("button", { name: /save/i }));
  return input;
}

describe("MovieEditor edit flow", () => {
  it("optimistically shows the new title after a successful save", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<MovieEditor movie="Inception" onSave={onSave} />);
    await openEditorAndType(user, "Heat");

    expect(onSave).toHaveBeenCalledWith("Heat");
    // editor closes and the new title is shown
    expect(await screen.findByText("Heat")).toBeInTheDocument();
    expect(screen.queryByText("Inception")).not.toBeInTheDocument();
  });

  it("reverts and shows an error when the save fails", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new ApiError(500, "Server error"));

    render(<MovieEditor movie="Inception" onSave={onSave} />);
    const input = await openEditorAndType(user, "Heat");

    // error surfaced
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
    // editor reopened with the typed value kept for retry
    expect(input).toHaveValue("Heat");
  });

  it("rejects whitespace-only input without calling onSave", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<MovieEditor movie="Inception" onSave={onSave} />);
    await openEditorAndType(user, "   ");

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a movie title/i);
  });

  it("does nothing when canceled", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<MovieEditor movie="Inception" onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: /edit/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });
});
