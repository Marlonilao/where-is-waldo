import request from "supertest";
import { expect, test } from "vitest";
import app from "../src/app.js";

test("the root path returns the client's index page", async () => {
  const res = await request(app).get("/").expect(200);

  expect(res.type).toBe("text/html");
  expect(res.text).toContain("Test client");
});

test("the client's built files are served", async () => {
  const res = await request(app).get("/assets/app.js").expect(200);

  expect(res.type).toBe("text/javascript");
  expect(res.text).toContain("test client");
});

test("an unknown non-API path returns the client's index page", async () => {
  const res = await request(app).get("/some/client/page").expect(200);

  expect(res.type).toBe("text/html");
  expect(res.text).toContain("Test client");
});
