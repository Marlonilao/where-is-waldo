import { render, screen } from "@testing-library/react";
import { test } from "vitest";
import App from "../src/App.jsx";

test("renders the app", () => {
  render(<App />);

  screen.getByRole("heading", { name: "Where's Waldo?" });
});
