import { vi } from "vitest";

// Replaces fetch with canned replies keyed by URL, e.g.
// stubFetch({ "/games": { status: 201, body: { id: "abc" } } })
// Inspect what was sent with fetch.mock.calls.
export function stubFetch(replies) {
  const fetch = vi.fn(async (url) => {
    const reply = replies[url];
    if (!reply) throw new Error(`No stubbed reply for ${url}`);
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
