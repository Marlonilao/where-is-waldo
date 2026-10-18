import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "../src/App.jsx";
import { stubFetch } from "./fetchStub.js";

const game = {
  id: "abc",
  imageUrl: "https://example.com/scene.png",
  characters: [
    { id: 1, name: "Waldo" },
    { id: 2, name: "Wenda" },
  ],
};

test("before Start, only the Start button is shown", () => {
  render(<App />);

  screen.getByRole("button", { name: "Start" });
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.queryByRole("list")).toBeNull();
});

test("pressing Start starts a Game and reveals the Scene and Characters", async () => {
  const fetch = stubFetch({ "/games": { status: 201, body: game } });
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Start" }));

  const scene = await screen.findByRole("img", { name: "Scene" });
  expect(scene.getAttribute("src")).toBe(game.imageUrl);
  const names = screen.getAllByRole("listitem").map((li) => li.textContent);
  expect(names).toEqual(["Waldo", "Wenda"]);
  expect(screen.queryByRole("button", { name: "Start" })).toBeNull();

  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe("/games");
  expect(options.method).toBe("POST");
  expect(JSON.parse(options.body)).toEqual({ sceneId: 1 });
});
