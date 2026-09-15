import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home page", () => {
  it("renders the Pulse landing hero", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", {
        name: /Coordinate faster when production breaks/i,
        level: 1,
      }),
    ).toBeInTheDocument();
  });
});
