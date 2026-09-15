import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home page", () => {
  it("renders the Pulse heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Pulse", level: 1 }),
    ).toBeInTheDocument();
  });
});
