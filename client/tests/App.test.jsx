import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

async function guess(reply, name, replies = {}) {
  const { scene, fetch } = await startGame({
    "/games/abc/guesses": reply,
    ...replies,
  });
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

const hitBox = { x1: 0.25, y1: 0.25, x2: 0.5, y2: 0.75 };

test("a correct Guess outlines the Hit box scaled to the image's on-screen size", async () => {
  await guess({ body: { correct: true, hitBox } }, "Waldo");

  const outline = await screen.findByLabelText("Found Waldo");
  expect(outline.style.left).toBe("25%");
  expect(outline.style.top).toBe("25%");
  expect(outline.style.width).toBe("25%");
  expect(outline.style.height).toBe("50%");
});

test("a found Character stays in the menu greyed out with a ✓ and can't be chosen", async () => {
  const fetch = await guess({ body: { correct: true, hitBox } }, "Waldo");
  await screen.findByLabelText("Found Waldo");

  fireEvent.click(screen.getByRole("img", { name: "Scene" }), {
    clientX: 310,
    clientY: 170,
  });
  const found = screen.getByRole("menuitem", { name: "Waldo ✓" });
  expect(found.getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(found);

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(screen.queryByLabelText("Targeting box")).not.toBeNull();
});

test("a click inside a found outline opens no Targeting box", async () => {
  await guess({ body: { correct: true, hitBox } }, "Waldo");
  await screen.findByLabelText("Found Waldo");

  // 0.3, 0.5 of the 400x200 image at (10, 20) lies inside the Hit box
  fireEvent.click(screen.getByRole("img", { name: "Scene" }), {
    clientX: 130,
    clientY: 120,
  });

  expect(screen.queryByLabelText("Targeting box")).toBeNull();
});

test("a clock counts up from Start", async () => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
  await startGame();
  const clock = screen.getByRole("timer");
  expect(clock.textContent).toBe("0.0s");

  act(() => vi.advanceTimersByTime(12300));

  expect(clock.textContent).toBe("12.3s");
});

test("finishing stops the clock and shows the server's time", async () => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
  await guess(
    { body: { correct: true, hitBox, finished: true, timeMs: 61234 } },
    "Waldo"
  );

  expect((await screen.findByRole("status")).textContent).toBe(
    "You found everyone in 61.2s!"
  );
  const clock = screen.getByRole("timer");
  expect(clock.textContent).toBe("61.2s");
  act(() => vi.advanceTimersByTime(5000));
  expect(clock.textContent).toBe("61.2s");
});

test("the Scene can't be clicked once the Game is finished", async () => {
  await guess(
    { body: { correct: true, hitBox, finished: true, timeMs: 61234 } },
    "Waldo"
  );
  await screen.findByRole("status");

  fireEvent.click(screen.getByRole("img", { name: "Scene" }), {
    clientX: 310,
    clientY: 170,
  });

  expect(screen.queryByLabelText("Targeting box")).toBeNull();
});

async function finish(replies = {}) {
  const fetch = await guess(
    { body: { correct: true, hitBox, finished: true, timeMs: 61234 } },
    "Waldo",
    replies
  );
  await screen.findByRole("status");
  return fetch;
}

function saveName(name) {
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

const leaderboard = [
  { name: "Ada", timeMs: 45000 },
  { name: "Grace", timeMs: 61234 },
];

test("finishing shows a name form that saves the name for the Game", async () => {
  const fetch = await finish({
    "/games/abc/name": { status: 204 },
    "/scenes/1/leaderboard": { body: leaderboard },
  });

  saveName("Grace");

  await screen.findByRole("heading", { name: "Leaderboard" });
  const [url, options] = fetch.mock.calls[2];
  expect(url).toBe("/games/abc/name");
  expect(options.method).toBe("PUT");
  expect(JSON.parse(options.body)).toEqual({ name: "Grace" });
});

test("a name that's rejected as invalid shows a message about its length", async () => {
  await finish({ "/games/abc/name": { status: 400 } });

  saveName("");

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Your name must be 1–20 characters."
  );
  screen.getByRole("textbox", { name: "Name" });
  expect(screen.queryByRole("heading", { name: "Leaderboard" })).toBeNull();
});

test("after saving, the Scene's Leaderboard is shown in the server's order", async () => {
  const fetch = await finish({
    "/games/abc/name": { status: 204 },
    "/scenes/1/leaderboard": { body: leaderboard },
  });

  saveName("Grace");

  const heading = await screen.findByRole("heading", { name: "Leaderboard" });
  const list = heading.nextElementSibling;
  const entries = within(list)
    .getAllByRole("listitem")
    .map((li) => li.textContent);
  expect(entries).toEqual(["Ada 45.0s", "Grace 61.2s"]);
  expect(fetch.mock.calls[3][0]).toBe("/scenes/1/leaderboard");
  expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull();
});

test("Play again returns to the Start button with a fresh state", async () => {
  await finish({
    "/games/abc/name": { status: 204 },
    "/scenes/1/leaderboard": { body: leaderboard },
  });
  saveName("Grace");
  await screen.findByRole("heading", { name: "Leaderboard" });

  fireEvent.click(screen.getByRole("button", { name: "Play again" }));

  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  await screen.findByRole("img", { name: "Scene" });
  expect(screen.getByRole("timer").textContent).toBe("0.0s");
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByLabelText("Found Waldo")).toBeNull();
  expect(screen.queryByRole("heading", { name: "Leaderboard" })).toBeNull();
  expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull();
});

test("a name that was already saved still shows the Leaderboard", async () => {
  await finish({
    "/games/abc/name": { status: 409 },
    "/scenes/1/leaderboard": { body: leaderboard },
  });

  saveName("Grace");

  await screen.findByRole("heading", { name: "Leaderboard" });
  expect(screen.queryByRole("alert")).toBeNull();
});
