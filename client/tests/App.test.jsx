import { fireEvent, render, screen, within } from "@testing-library/react";
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

async function startGame() {
  stubFetch({ "/games": { status: 201, body: game } });
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  return screen.findByRole("img", { name: "Scene" });
}

test("clicking the Scene opens a Targeting box at the click with the Character menu", async () => {
  const scene = await startGame();

  fireEvent.click(scene, { clientX: 120, clientY: 80 });

  const box = screen.getByLabelText("Targeting box");
  expect(box.style.left).toBe("120px");
  expect(box.style.top).toBe("80px");
  const menu = screen.getByRole("menu", { name: "Characters" });
  const names = within(menu)
    .getAllByRole("menuitem")
    .map((item) => item.textContent);
  expect(names).toEqual(["Waldo", "Wenda"]);
});

test("clicking another spot on the Scene moves the Targeting box", async () => {
  const scene = await startGame();

  fireEvent.click(scene, { clientX: 120, clientY: 80 });
  fireEvent.click(scene, { clientX: 300, clientY: 200 });

  const box = screen.getByLabelText("Targeting box");
  expect(box.style.left).toBe("300px");
  expect(box.style.top).toBe("200px");
});

test("clicking outside the Targeting box and menu closes both", async () => {
  const scene = await startGame();
  fireEvent.click(scene, { clientX: 120, clientY: 80 });

  fireEvent.click(screen.getByRole("menu", { name: "Characters" }));
  expect(screen.queryByLabelText("Targeting box")).not.toBeNull();

  fireEvent.click(screen.getByRole("heading"));
  expect(screen.queryByLabelText("Targeting box")).toBeNull();
  expect(screen.queryByRole("menu")).toBeNull();
});
