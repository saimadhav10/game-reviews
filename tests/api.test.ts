import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readFile } from "node:fs/promises";
import { app } from "../worker/index";
import type { Env } from "../worker/types";

const project = "demo-gamereviews-tests";
const authBase = "http://127.0.0.1:9199";
interface Identity {
  uid: string;
  token: string;
  email: string;
  profile?: any;
}
let mf: Miniflare;
let env: Env;
let alice: Identity;
let bob: Identity;
let moderator: Identity;
let unverified: Identity;
async function authRequest(path: string, body: unknown) {
  const response = await fetch(
    `${authBase}/identitytoolkit.googleapis.com/v1/accounts:${path}?key=test-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const result = (await response.json()) as any;
  if (!response.ok)
    throw new Error(`Auth emulator operation failed: ${result.error?.message}`);
  return result;
}
async function register(label: string, verified = true): Promise<Identity> {
  const email = `${label}-${crypto.randomUUID()}@example.test`;
  const password = `Test!${crypto.randomUUID()}`;
  const account = await authRequest("signUp", {
    email,
    password,
    returnSecureToken: true,
  });
  if (verified) {
    await authRequest("sendOobCode", {
      idToken: account.idToken,
      requestType: "VERIFY_EMAIL",
    });
    const codes = (await (
      await fetch(`${authBase}/emulator/v1/projects/${project}/oobCodes`)
    ).json()) as any;
    const code = codes.oobCodes.find((item: any) => item.email === email);
    await authRequest("update", { oobCode: code.oobCode });
  }
  const session = await authRequest("signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  });
  return { uid: session.localId, token: session.idToken, email };
}
async function request(
  path: string,
  identity?: Identity,
  method = "GET",
  body?: unknown,
  extra?: { host?: string; origin?: string },
) {
  const headers: Record<string, string> = {};
  if (identity) headers.Authorization = `Bearer ${identity.token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (extra?.origin) headers.Origin = extra.origin;
  const response = await app.fetch(
    new Request(`${extra?.host ?? "http://127.0.0.1"}/api${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    env,
  );
  const payload = (await response.json()) as any;
  return { status: response.status, body: payload, headers: response.headers };
}
async function review(
  identity = alice,
  game = "alpha",
  title = "A thoughtful experience",
) {
  const result = await request(`/games/${game}/review`, identity, "PUT", {
    title,
    body: "Thoughtful mechanics with a memorable sense of discovery. >!The ending changes everything.!<",
    platform: "PC",
  });
  expect(result.status).toBe(200);
  return result.body.id as string;
}
async function approveReview(id: string) {
  const queue = await request("/admin/queue", moderator);
  const item = queue.body.reviews.find((r: any) => r.id === id);
  return request("/admin/moderate", moderator, "POST", {
    type: "review",
    id,
    version: item.submitted_at,
    decision: "approved",
  });
}
async function approveComment(id: string) {
  return request("/admin/moderate", moderator, "POST", {
    type: "comment",
    id,
    decision: "approved",
  });
}

beforeAll(async () => {
  [alice, bob, moderator, unverified] = await Promise.all([
    register("alice"),
    register("bob"),
    register("moderator"),
    register("unverified", false),
  ]);
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default { fetch() { return new Response("test"); } }',
      compatibilityDate: "2026-10-30",
      d1Databases: { DB: "gamereviews-isolated-test" },
    }),
  );
  const DB = await mf.getD1Database("DB");
  env = {
    DB: DB as unknown as D1Database,
    ASSETS: { fetch: async () => new Response("asset") } as unknown as Fetcher,
    FIREBASE_PROJECT_ID: project,
    FIREBASE_WEB_API_KEY: "test-key",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9199",
    ADMIN_UIDS: moderator.uid,
  };
  const schema = await readFile("db/migrations/0001_initial.sql", "utf8");
  for (const statement of schema
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean))
    await DB.prepare(statement).run();
});
beforeEach(async () => {
  for (const table of [
    "moderation_log",
    "votes",
    "comments",
    "reviews",
    "ratings",
    "game_suggestions",
    "steam_link_states",
    "users",
    "games",
    "rate_limits",
    "provider_cache",
  ])
    await env.DB.prepare(`DELETE FROM ${table}`).run();
  await env.DB.prepare(
    "UPDATE settings SET value='1' WHERE key='minimum_ratings'",
  ).run();
  for (const identity of [alice, bob, moderator, unverified])
    identity.profile = (await request("/me", identity)).body;
  for (const [id, title] of [
    ["alpha", "Alpha"],
    ["beta", "Beta"],
    ["gamma", "Gamma"],
  ])
    await env.DB.prepare(
      'INSERT INTO games(id,title,description,platforms,genres,created_at) VALUES(?,?,?,\'["PC","Android"]\',\'["RPG"]\',?)',
    )
      .bind(
        id,
        title,
        "An isolated test game with a detailed description.",
        Date.now(),
      )
      .run();
});
afterAll(async () => {
  await mf?.dispose();
});

describe("account boundaries and catalog", () => {
  it("rejects a valid identity token when the server is configured for a different project", async () => {
    const response = await app.fetch(
      new Request("http://127.0.0.1/api/me", {
        headers: { Authorization: `Bearer ${alice.token}` },
      }),
      { ...env, FIREBASE_PROJECT_ID: "demo-another-project" },
    );
    expect(response.status).toBe(401);
  });

  it("lets guests browse but rejects unsigned writes and normal-user admin access", async () => {
    expect((await request("/games")).body.total).toBe(3);
    expect(
      (await request("/games/alpha/rating", undefined, "PUT", { score: 9 }))
        .status,
    ).toBe(401);
    expect((await request("/admin/overview", alice)).status).toBe(403);
    expect(
      (await request("/admin/settings", alice, "PUT", { minimum_ratings: 9 }))
        .status,
    ).toBe(403);
  });
  it("does not trust fabricated tokens or enable emulator authentication on public hosts", async () => {
    expect(
      (await request("/me", { ...alice, token: "fabricated-token" })).status,
    ).toBe(401);
    expect(
      (
        await request("/me", alice, "GET", undefined, {
          host: "https://gamereviews.example",
        })
      ).status,
    ).toBe(503);
    expect(
      (
        await request("/config", undefined, "GET", undefined, {
          host: "https://gamereviews.example",
        })
      ).body.firebase,
    ).toBeNull();
  });
  it("requires email verification for contributions and prevents profile-based privilege escalation", async () => {
    expect(
      (await request("/games/alpha/rating", unverified, "PUT", { score: 9 }))
        .status,
    ).toBe(403);
    expect(
      (
        await request("/me", alice, "PATCH", {
          display_name: "New name",
          anonymous: true,
          admin: true,
          role: "admin",
        })
      ).status,
    ).toBe(200);
    expect((await request("/me", alice)).body.admin).toBe(false);
  });
  it("searches safely, filters mobile games, and handles missing entries", async () => {
    expect((await request("/games?q=%25")).body.total).toBe(0);
    expect(
      (await request("/games?q=alpha&platform=Android&genre=RPG")).body.total,
    ).toBe(1);
    expect((await request("/games/does-not-exist")).status).toBe(404);
    expect(
      (
        await request("/games/does-not-exist/rating", alice, "PUT", {
          score: 9,
        })
      ).status,
    ).toBe(404);
  });
  it("rejects cross-origin writes and excessive submission bodies", async () => {
    expect(
      (
        await request(
          "/games/alpha/rating",
          alice,
          "PUT",
          { score: 9 },
          { origin: "https://evil.example" },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request("/games/alpha/review", alice, "PUT", {
          title: "Large body",
          body: "x".repeat(40000),
          platform: "PC",
        })
      ).status,
    ).toBe(413);
  });
});

describe("ratings and community rankings", () => {
  it("publishes a decimal score immediately and edits the same rating without duplication", async () => {
    expect(
      (await request("/games/alpha/rating", alice, "PUT", { score: 8.5 }))
        .status,
    ).toBe(200);
    let game = (await request("/games/alpha")).body;
    expect(game.game.rating).toBe(8.5);
    expect(game.game.rating_count).toBe(1);
    expect(game.reviews).toHaveLength(0);
    await request("/games/alpha/rating", alice, "PUT", { score: 9.3 });
    game = (await request("/games/alpha", alice)).body;
    expect(game.game.rating).toBe(9.3);
    expect(game.game.rating_count).toBe(1);
    expect(game.my_rating).toBe(9.3);
  });
  it("rejects out-of-range scores, strings, null, and more than one decimal place", async () => {
    for (const score of [-0.1, 10.1, 8.55, "9.0", null])
      expect(
        (await request("/games/alpha/rating", alice, "PUT", { score })).status,
      ).toBe(400);
    expect(
      (await request("/games/alpha/rating", alice, "PUT", { score: 0 })).status,
    ).toBe(200);
    expect(
      (await request("/games/alpha/rating", alice, "PUT", { score: 10 }))
        .status,
    ).toBe(200);
  });
  it("uses averages, then rating count, then title, and respects the admin threshold", async () => {
    await request("/games/alpha/rating", alice, "PUT", { score: 8 });
    await request("/games/beta/rating", alice, "PUT", { score: 7 });
    await request("/games/beta/rating", bob, "PUT", { score: 9 });
    await request("/games/gamma/rating", alice, "PUT", { score: 8 });
    expect((await request("/top-50")).body.games.map((g: any) => g.id)).toEqual(
      ["beta", "alpha", "gamma"],
    );
    expect(
      (
        await request("/admin/settings", moderator, "PUT", {
          minimum_ratings: 2,
        })
      ).status,
    ).toBe(200);
    expect((await request("/top-50")).body.games.map((g: any) => g.id)).toEqual(
      ["beta"],
    );
    expect(
      (
        await request("/admin/settings", moderator, "PUT", {
          minimum_ratings: 0,
        })
      ).status,
    ).toBe(400);
  });
});

describe("review moderation and revision safety", () => {
  it("keeps pending reviews private to their author and admins", async () => {
    const id = await review();
    expect((await request(`/reviews/${id}`)).status).toBe(404);
    expect((await request("/games/alpha")).body.reviews).toHaveLength(0);
    expect((await request("/games/alpha", bob)).body.my_review).toBeNull();
    expect(
      (await request("/me/contributions", alice)).body.reviews[0].status,
    ).toBe("pending");
    expect((await request("/admin/queue", moderator)).body.reviews[0].id).toBe(
      id,
    );
    expect(
      (await request(`/profiles/${alice.profile.public_id}`)).body.reviews,
    ).toHaveLength(0);
    expect((await request("/home")).body.recent).toHaveLength(0);
  });
  it("publishes only approved content and keeps the approved version during pending and rejected edits", async () => {
    const id = await review();
    expect((await approveReview(id)).status).toBe(200);
    const original = (await request(`/reviews/${id}`)).body.review;
    await review(alice, "alpha", "A substantially different revision");
    expect((await request(`/reviews/${id}`)).body.review.title).toBe(
      original.title,
    );
    const queue = (await request("/admin/queue", moderator)).body.reviews[0];
    expect(
      (
        await request("/admin/moderate", moderator, "POST", {
          type: "review",
          id,
          version: queue.submitted_at,
          decision: "rejected",
          reason: "Please explain your point more clearly.",
        })
      ).status,
    ).toBe(200);
    expect((await request(`/reviews/${id}`)).body.review.title).toBe(
      original.title,
    );
    await review(alice, "alpha", "A clarified revised review");
    expect((await approveReview(id)).status).toBe(200);
    const updated = (await request(`/reviews/${id}`)).body.review;
    expect(updated.title).toBe("A clarified revised review");
    expect(updated.published_at).toBe(original.published_at);
    expect(updated.edited_at).toBeTruthy();
    expect((await request("/games/alpha")).body.game.review_count).toBe(1);
  });
  it("rejects stale admin decisions after an author changes the pending submission", async () => {
    const id = await review();
    const old = (await request("/admin/queue", moderator)).body.reviews[0];
    await review(alice, "alpha", "A newer pending title");
    expect(
      (
        await request("/admin/moderate", moderator, "POST", {
          type: "review",
          id,
          version: old.submitted_at,
          decision: "approved",
        })
      ).status,
    ).toBe(409);
    expect((await request(`/reviews/${id}`)).status).toBe(404);
    expect((await approveReview(id)).status).toBe(200);
  });
});

describe("discussion, voting, and daily highlights", () => {
  it("moderates replies and supports nested discussion without accepting a foreign parent", async () => {
    const id = await review();
    await approveReview(id);
    const comment = await request(`/reviews/${id}/comments`, bob, "POST", {
      body: "A useful perspective. >!Hidden detail.!<",
    });
    expect(comment.status).toBe(201);
    expect((await request(`/reviews/${id}`)).body.comments).toHaveLength(0);
    await approveComment(comment.body.id);
    expect((await request(`/reviews/${id}`)).body.comments).toHaveLength(1);
    const nested = await request(`/reviews/${id}/comments`, alice, "POST", {
      body: "Thanks for adding to the discussion.",
      parent_id: comment.body.id,
    });
    await approveComment(nested.body.id);
    expect((await request(`/reviews/${id}`)).body.comments[1].parent_id).toBe(
      comment.body.id,
    );
    const other = await review(bob, "beta");
    await approveReview(other);
    expect(
      (
        await request(`/reviews/${other}/comments`, bob, "POST", {
          body: "This should not attach.",
          parent_id: comment.body.id,
        })
      ).status,
    ).toBe(400);
  });
  it("stores one vote per user and allows switching direction and removing it", async () => {
    const id = await review();
    await approveReview(id);
    for (let index = 0; index < 2; index++)
      expect(
        (await request("/votes", bob, "PUT", { id, type: "review", value: 1 }))
          .body.votes,
      ).toBe(1);
    expect(
      (await request("/votes", bob, "PUT", { id, type: "review", value: -1 }))
        .body.votes,
    ).toBe(-1);
    expect(
      (await request("/votes", bob, "PUT", { id, type: "review", value: 0 }))
        .body.votes,
    ).toBe(0);
    const pending = await review(bob, "beta");
    expect(
      (
        await request("/votes", alice, "PUT", {
          id: pending,
          type: "review",
          value: 1,
        })
      ).status,
    ).toBe(404);
    expect(
      (await request("/votes", alice, "PUT", { id, type: "review", value: 10 }))
        .status,
    ).toBe(400);
  });
  it("restores the user's existing vote on home, highlight, and profile views", async () => {
    const id = await review();
    await approveReview(id);
    await request("/votes", bob, "PUT", { id, type: "review", value: 1 });
    expect((await request("/home", bob)).body.recent[0].my_vote).toBe(1);
    expect((await request("/highlights", bob)).body.reviews[0].my_vote).toBe(1);
    expect(
      (await request(`/profiles/${alice.profile.public_id}`, bob)).body
        .reviews[0].my_vote,
    ).toBe(1);
    expect(JSON.stringify((await request("/home")).body)).not.toContain(
      bob.uid,
    );
  });

  it("selects positive net votes in the rolling window and excludes old contributions and old votes", async () => {
    const id = await review();
    await approveReview(id);
    await request("/votes", bob, "PUT", { id, type: "review", value: 1 });
    expect((await request("/highlights")).body.reviews[0].id).toBe(id);
    await env.DB.prepare("UPDATE votes SET updated_at=?")
      .bind(Date.now() - 25 * 3600000)
      .run();
    expect((await request("/highlights")).body.reviews).toHaveLength(0);
    await env.DB.prepare("UPDATE votes SET updated_at=?")
      .bind(Date.now())
      .run();
    await env.DB.prepare("UPDATE reviews SET published_at=?")
      .bind(Date.now() - 25 * 3600000)
      .run();
    expect((await request("/highlights")).body.reviews).toHaveLength(0);
  });
  it("hides identity consistently across public profile, reviews, replies, home, and highlights", async () => {
    await request("/me", alice, "PATCH", {
      display_name: "Secret Real Name",
      anonymous: true,
    });
    const id = await review();
    await approveReview(id);
    const comment = await request(`/reviews/${id}/comments`, alice, "POST", {
      body: "A comment belonging to the same anonymous profile.",
    });
    await approveComment(comment.body.id);
    await request("/votes", bob, "PUT", { type: "review", id, value: 1 });
    await request("/votes", bob, "PUT", {
      type: "comment",
      id: comment.body.id,
      value: 1,
    });
    for (const path of [
      "/home",
      "/highlights",
      "/games/alpha",
      `/reviews/${id}`,
      `/profiles/${alice.profile.public_id}`,
    ]) {
      const result = await request(path);
      const serialized = JSON.stringify(result.body);
      expect(serialized).toContain("Anonymous Gamer");
      expect(serialized).not.toContain("Secret Real Name");
      expect(serialized).not.toContain(alice.email);
      expect(serialized).not.toContain(alice.uid);
    }
    expect(
      (await request("/admin/queue?status=approved", moderator)).body.reviews[0]
        .display_name,
    ).toBe("Secret Real Name");
  });
});

describe("catalog moderation and optional integrations", () => {
  const suggestion = {
    title: "A missing community game",
    description: "A full description for a game suggested by the community.",
    platforms: ["Android", "PC"],
    reference_url: "https://example.com/game",
  };
  it("publishes an approved game with no imported score and records one moderation decision", async () => {
    const created = await request("/suggestions", alice, "POST", suggestion);
    expect(created.status).toBe(201);
    expect((await request("/games?q=missing")).body.total).toBe(0);
    const result = await request("/admin/moderate", moderator, "POST", {
      type: "suggestion",
      id: created.body.id,
      decision: "approved",
    });
    expect(result.status).toBe(200);
    const game = (await request("/games?q=missing")).body.games[0];
    expect(game.rating).toBeNull();
    expect(game.rating_count).toBe(0);
    expect(
      (
        await request("/admin/moderate", moderator, "POST", {
          type: "suggestion",
          id: created.body.id,
          decision: "approved",
        })
      ).status,
    ).toBe(409);
    expect((await request("/admin/overview", moderator)).body.log).toHaveLength(
      1,
    );
  });
  it("requires rejection feedback and rejects unsafe reference URLs", async () => {
    expect(
      (
        await request("/suggestions", alice, "POST", {
          ...suggestion,
          reference_url: "javascript:alert(1)",
        })
      ).status,
    ).toBe(400);
    const created = await request("/suggestions", alice, "POST", suggestion);
    expect(
      (
        await request("/admin/moderate", moderator, "POST", {
          type: "suggestion",
          id: created.body.id,
          decision: "rejected",
          reason: "",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request("/admin/moderate", moderator, "POST", {
          type: "suggestion",
          id: created.body.id,
          decision: "rejected",
          reason: "Please include a correct game title.",
        })
      ).status,
    ).toBe(200);
    expect(
      (await request("/me/contributions", alice)).body.suggestions[0].reason,
    ).toContain("correct game title");
  });
  it("supports manual admin catalog creation and editing local artwork paths", async () => {
    const metadata = {
      title: "Admin game",
      description: "An administrator supplied description of this game.",
      platforms: ["iOS"],
      genres: ["Puzzle"],
      cover_url: "/images/balatro.jpg",
      hero_url: "",
      release_date: "2026",
    };
    const created = await request("/admin/games", moderator, "POST", metadata);
    expect(created.status).toBe(201);
    expect(
      (
        await request(`/admin/games/${created.body.id}`, moderator, "PUT", {
          ...metadata,
          title: "Updated title",
        })
      ).status,
    ).toBe(200);
    expect((await request(`/games/${created.body.id}`)).body.game.title).toBe(
      "Updated title",
    );
    expect(
      (await request("/admin/catalog/search?q=balatro", moderator)).status,
    ).toBe(503);
    expect(
      (await request("/admin/catalog/search?q=balatro", alice)).status,
    ).toBe(403);
  });
  it("starts optional Steam linking without a playtime requirement and rejects missing callback state", async () => {
    const started = await request("/integrations/steam/start", alice, "POST");
    expect(started.status).toBe(200);
    const url = new URL(started.body.url);
    expect(url.origin).toBe("https://steamcommunity.com");
    expect(url.searchParams.get("openid.return_to")).toContain(
      "/api/integrations/steam/callback?state=",
    );
    expect(started.headers.get("Set-Cookie")).toContain("HttpOnly");
    const callback = await app.fetch(
      new Request(
        "http://127.0.0.1/api/integrations/steam/callback?state=forged",
      ),
      env,
    );
    expect(callback.status).toBe(302);
    expect(callback.headers.get("Location")).toBe("/settings?steam=error");
    expect((await request("/me", alice)).body.steam_id).toBeNull();
  });
});
