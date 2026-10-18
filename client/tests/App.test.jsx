import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
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

async function startGame(replies = {}) {
  const fetch = stubFetch({ "/games": { status: 201, body: game }, ...replies });
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  const scene = await screen.findByRole("img", { name: "Scene" });
  return { scene, fetch };
}

test("clicking the Scene opens a Targeting box at the click with the Character menu", async () => {
  const { scene } = await startGame();

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
  const { scene } = await startGame();

  fireEvent.click(scene, { clientX: 120, clientY: 80 });
  fireEvent.click(scene, { clientX: 300, clientY: 200 });

  const box = screen.getByLabelText("Targeting box");
  expect(box.style.left).toBe("300px");
  expect(box.style.top).toBe("200px");
});

test("clicking outside the Targeting box and menu closes both", async () => {
  const { scene } = await startGame();
  fireEvent.click(scene, { clientX: 120, clientY: 80 });

  fireEvent.click(screen.getByRole("menu", { name: "Characters" }));
  expect(screen.queryByLabelText("Targeting box")).not.toBeNull();

  fireEvent.click(screen.getByRole("heading"));
  expect(screen.queryByLabelText("Targeting box")).toBeNull();
  expect(screen.queryByRole("menu")).toBeNull();
});

async function guess(reply, name) {
  const { scene, fetch } = await startGame({ "/games/abc/guesses": reply });
  vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
    left: 10,
    top: 20,
    width: 400,
    height: 200,
  });
  fireEvent.click(scene, { clientX: 110, clientY: 70 });
  fireEvent.click(screen.getByRole("menuitem", { name }));
  return fetch;
}

test("choosing a Character sends a Guess with the click as fractions of the image size", async () => {
  const fetch = await guess({ body: { correct: false } }, "Wenda");

  await screen.findByRole("status");
  const [url, options] = fetch.mock.calls[1];
  expect(url).toBe("/games/abc/guesses");
  expect(options.method).toBe("POST");
  expect(JSON.parse(options.body)).toEqual({ characterId: 2, x: 0.25, y: 0.25 });
});

test("a wrong Guess says try again and closes the Targeting box and menu", async () => {
  await guess({ body: { correct: false } }, "Wenda");

  expect((await screen.findByRole("status")).textContent).toBe(
    "Try again!"
  );
  expect(screen.queryByLabelText("Targeting box")).toBeNull();
  expect(screen.queryByRole("menu")).toBeNull();
});

test("a correct Guess confirms the find and closes the Targeting box and menu", async () => {
  await guess({ body: { correct: true } }, "Waldo");

  expect((await screen.findByRole("status")).textContent).toBe(
    "You found Waldo!"
  );
  expect(screen.queryByLabelText("Targeting box")).toBeNull();
  expect(screen.queryByRole("menu")).toBeNull();
});

test("a rejected Guess says something went wrong and closes the Targeting box and menu", async () => {
  await guess({ status: 404 }, "Waldo");

  expect((await screen.findByRole("status")).textContent).toBe(
    "Something went wrong. Please try again."
  );
  expect(screen.queryByLabelText("Targeting box")).toBeNull();
  expect(screen.queryByRole("menu")).toBeNull();
});

test("a failed request says something went wrong and closes the Targeting box and menu", async () => {
  await guess(undefined, "Waldo");

  expect((await screen.findByRole("status")).textContent).toBe(
    "Something went wrong. Please try again."
  );
  expect(screen.queryByLabelText("Targeting box")).toBeNull();
  expect(screen.queryByRole("menu")).toBeNull();
});
