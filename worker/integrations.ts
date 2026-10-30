import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { admin, isLoopback, throttle, user } from "./auth";
import { InputError, slugify, text } from "../shared/validation";
import type { AppEnv, Env } from "./types";

export const integrations = new Hono<AppEnv>();
let twitchToken: { client: string; token: string; expires: number } | null =
  null;

async function igdb(env: Env, query: string): Promise<Record<string, any>[]> {
  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET)
    throw new HTTPException(503, {
      message:
        "IGDB catalog import needs your free Twitch application credentials.",
    });
  if (
    !twitchToken ||
    twitchToken.client !== env.IGDB_CLIENT_ID ||
    twitchToken.expires < Date.now()
  ) {
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: env.IGDB_CLIENT_ID,
        client_secret: env.IGDB_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new HTTPException(502, {
        message:
          "The game catalog provider could not authenticate. Check your IGDB configuration.",
      });
    const token = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    twitchToken = {
      client: env.IGDB_CLIENT_ID,
      token: token.access_token,
      expires: Date.now() + (token.expires_in - 60) * 1000,
    };
  }
  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": env.IGDB_CLIENT_ID,
      Authorization: `Bearer ${twitchToken.token}`,
    },
    body: query,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new HTTPException(502, {
      message: "The game catalog is unavailable. Please retry later.",
    });
  return response.json();
}
const fields =
  "fields id,name,summary,first_release_date,cover.image_id,artworks.image_id,genres.name,platforms.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,websites.url;";
function normalizePlatform(value: string) {
  const aliases: Record<string, string> = {
    "PC (Microsoft Windows)": "PC",
    "PlayStation 5": "PS5",
    "PlayStation 4": "PS4",
    "Xbox Series X|S": "Xbox Series",
    "Xbox One": "Xbox One",
    "Nintendo Switch": "Switch",
    "Nintendo Switch 2": "Switch 2",
    Mac: "Mac",
    Linux: "Linux",
    Android: "Android",
    iOS: "iOS",
  };
  return aliases[value] ?? value;
}
integrations.get("/admin/catalog/search", async (c) => {
  const { account } = await admin(c);
  await throttle(c, `catalog:${account.uid}`, 20);
  const query = text(c.req.query("q"), "Search", 2, 100).replace(
    /["\\;\r\n]/g,
    " ",
  );
  const rows = await igdb(c.env, `${fields} search "${query}"; limit 10;`);
  return c.json({
    games: rows.map((x) => ({
      id: x.id,
      title: x.name,
      cover_url: x.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${x.cover.image_id}.jpg`
        : "",
      platforms: (x.platforms ?? []).map((p: { name: string }) =>
        normalizePlatform(p.name),
      ),
      release_year: x.first_release_date
        ? new Date(x.first_release_date * 1000).getUTCFullYear()
        : null,
    })),
  });
});
integrations.post("/admin/catalog/import", async (c) => {
  const { account } = await admin(c);
  await throttle(c, `catalog:${account.uid}`, 20);
  const { igdb_id: id } = await c.req.json();
  if (!Number.isSafeInteger(id) || id < 1)
    throw new InputError("Choose a valid catalog entry.");
  const existing = await c.env.DB.prepare(
    "SELECT id FROM games WHERE igdb_id=?",
  )
    .bind(id)
    .first();
  if (existing) return c.json({ id: existing.id, existing: true });
  const [game] = await igdb(c.env, `${fields} where id=${id}; limit 1;`);
  if (!game)
    throw new HTTPException(404, {
      message: "The catalog entry no longer exists.",
    });
  const duplicate = await c.env.DB.prepare(
    "SELECT id FROM games WHERE lower(title)=lower(?)",
  )
    .bind(game.name)
    .first();
  if (duplicate) {
    await c.env.DB.prepare(
      "UPDATE games SET igdb_id=? WHERE id=? AND igdb_id IS NULL",
    )
      .bind(id, duplicate.id)
      .run();
    return c.json({ id: duplicate.id, existing: true });
  }
  const gameId = `${slugify(game.name)}-${id}`;
  const companies = game.involved_companies ?? [];
  const steamUrl = (game.websites ?? [])
    .map((w: { url: string }) => w.url)
    .find((url: string) =>
      /^https?:\/\/store\.steampowered\.com\/app\/\d+/.test(url),
    );
  const steamId = steamUrl ? Number(steamUrl.match(/\/app\/(\d+)/)[1]) : null;
  await c.env.DB.prepare(
    `INSERT INTO games(id,title,description,platforms,genres,release_date,developer,publisher,cover_url,hero_url,steam_app_id,igdb_id,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      gameId,
      game.name,
      game.summary ?? "More information will be added soon.",
      JSON.stringify(
        (game.platforms ?? []).map((p: { name: string }) =>
          normalizePlatform(p.name),
        ),
      ),
      JSON.stringify((game.genres ?? []).map((g: { name: string }) => g.name)),
      game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
        : "",
      companies
        .filter((v: any) => v.developer)
        .map((v: any) => v.company.name)
        .join(", "),
      companies
        .filter((v: any) => v.publisher)
        .map((v: any) => v.company.name)
        .join(", "),
      game.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
        : "",
      game.artworks?.[0]
        ? `https://images.igdb.com/igdb/image/upload/t_1080p/${game.artworks[0].image_id}.jpg`
        : "",
      steamId,
      id,
      Date.now(),
    )
    .run();
  return c.json({ id: gameId }, 201);
});

integrations.post("/integrations/steam/start", async (c) => {
  const { account } = await user(c, true);
  await throttle(c, account.uid);
  const requestOrigin = new URL(c.req.url).origin;
  const browserOrigin = c.req.header("Origin");
  const origin =
    browserOrigin &&
    isLoopback(new URL(requestOrigin).hostname) &&
    /^http:\/\/(127\.0\.0\.1|localhost):5173$/.test(browserOrigin)
      ? browserOrigin
      : requestOrigin;
  const state = crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "DELETE FROM steam_link_states WHERE expires_at<? OR user_id=?",
    ).bind(Date.now(), account.uid),
    c.env.DB.prepare(
      "INSERT INTO steam_link_states(state,user_id,origin,expires_at) VALUES(?,?,?,?)",
    ).bind(state, account.uid, origin, Date.now() + 300000),
  ]);
  setCookie(c, "gr_steam_state", state, {
    httpOnly: true,
    secure: origin.startsWith("https:"),
    sameSite: "Lax",
    path: "/api/integrations/steam",
    maxAge: 300,
  });
  const url = new URL("https://steamcommunity.com/openid/login");
  url.search = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": `${origin}/api/integrations/steam/callback?state=${state}`,
    "openid.realm": origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  }).toString();
  return c.json({ url: url.href });
});
integrations.get("/integrations/steam/callback", async (c) => {
  const query = new URL(c.req.url).searchParams;
  const state = query.get("state");
  if (!state || getCookie(c, "gr_steam_state") !== state)
    return c.redirect("/settings?steam=error");
  deleteCookie(c, "gr_steam_state", { path: "/api/integrations/steam" });
  const row = await c.env.DB.prepare(
    "DELETE FROM steam_link_states WHERE state=? RETURNING user_id,origin,expires_at",
  )
    .bind(state)
    .first<{ user_id: string; origin: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now())
    return c.redirect("/settings?steam=expired");
  const claimed = query.get("openid.claimed_id") ?? "";
  const match = claimed.match(
    /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/,
  );
  const signed = (query.get("openid.signed") ?? "").split(",");
  if (
    !match ||
    query.get("openid.mode") !== "id_res" ||
    query.get("openid.identity") !== claimed ||
    query.get("openid.op_endpoint") !==
      "https://steamcommunity.com/openid/login" ||
    query.get("openid.return_to") !==
      `${row.origin}/api/integrations/steam/callback?state=${state}` ||
    ![
      "claimed_id",
      "identity",
      "return_to",
      "op_endpoint",
      "response_nonce",
    ].every((field) => signed.includes(field))
  )
    return c.redirect("/settings?steam=error");
  const params = new URLSearchParams();
  for (const [key, value] of query)
    if (key.startsWith("openid.")) params.set(key, value);
  params.set("openid.mode", "check_authentication");
  try {
    const verification = await fetch(
      "https://steamcommunity.com/openid/login",
      { method: "POST", body: params, signal: AbortSignal.timeout(15000) },
    );
    if (
      !verification.ok ||
      !/^is_valid:true$/m.test((await verification.text()).replace(/\r/g, ""))
    )
      return c.redirect("/settings?steam=error");
    await c.env.DB.prepare("UPDATE users SET steam_id=? WHERE id=?")
      .bind(match[1], row.user_id)
      .run();
    return c.redirect("/settings?steam=linked");
  } catch {
    return c.redirect("/settings?steam=error");
  }
});
integrations.delete("/integrations/steam", async (c) => {
  const { account } = await user(c, true);
  await throttle(c, account.uid);
  await c.env.DB.prepare("UPDATE users SET steam_id=NULL WHERE id=?")
    .bind(account.uid)
    .run();
  return c.json({ ok: true });
});
