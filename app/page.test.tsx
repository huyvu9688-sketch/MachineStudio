// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

// Unit 0.3 toolchain deliverable: React Testing Library wired up and
// exercised on a real component. `Home` renders with no Clerk/router
// context, so it needs no provider wrapping.
describe("Home", () => {
  it("renders the app header and a status example for every check state", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /repository initialized/i }),
    ).toBeInTheDocument();

    for (const label of ["Pass", "Fail", "Stale", "Info", "Not configured"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
