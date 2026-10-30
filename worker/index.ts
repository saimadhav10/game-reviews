import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { bodyLimit } from "hono/body-limit";
import {
  InputError,
  text,
  scoreToTenths,
  voteValue,
  slugify,
  safeUrl,
  assetUrl,
} from "../shared/validation";
import { admin, authenticate, isLoopback, throttle, user } from "./auth";
import {
  commentColumns,
  gameColumns,
  highlights,
  minimumRatings,
  parseGame,
  rankedGames,
  reviewColumns,
  reviewJoins,
  attachMyVotes,
} from "./queries";
import type { AppEnv } from "./types";
import { integrations } from "./integrations";

export const app = new Hono<AppEnv>();
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 32768,
    onError: (c) => c.json({ error: "Submission is too large." }, 413),
  }),
);
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  if (["POST", "PUT", "PATCH", "DELETE"].includes(c.req.method)) {
    const origin = c.req.header("Origin");
    if (
      origin &&
      origin !== new URL(c.req.url).origin &&
      !(
        isLoopback(new URL(c.req.url).hostname) &&
        /^http:\/\/(localhost|127\.0\.0\.1):5173$/.test(origin)
      )
    ) {
      throw new HTTPException(403, {
        message: "Cross-origin submissions are not allowed.",
      });
    }
  }
  await next();
});

app.onError((err, c) => {
  if (err instanceof HTTPException)
    return c.json({ error: err.message }, err.status);
  if (err instanceof InputError || err instanceof SyntaxError)
    return c.json({ error: err.message }, 400);
  if (err instanceof Error && /UNIQUE constraint/.test(err.message))
    return c.json(
      { error: "This entry already exists. Refresh and try again." },
      409,
    );
  console.error(
    "Request failed:",
    err instanceof Error ? err.name : "UnknownError",
  );
  return c.json({ error: "Something went wrong. Please try again." }, 500);
});

app.get("/api/config", (c) => {
  const local = isLoopback(new URL(c.req.url).hostname);
  const emulator =
    local && c.env.FIREBASE_AUTH_EMULATOR_HOST
      ? `http://${c.env.FIREBASE_AUTH_EMULATOR_HOST}`
      : null;
  const configured =
    !!c.env.FIREBASE_WEB_API_KEY &&
    !!c.env.FIREBASE_PROJECT_ID &&
    c.env.FIREBASE_PROJECT_ID !== "configure-before-deploy" &&
    (local || !c.env.FIREBASE_AUTH_EMULATOR_HOST) &&
    (local || !c.env.FIREBASE_PROJECT_ID.startsWith("demo-"));
  return c.json({
    firebase: configured
      ? {
          apiKey: c.env.FIREBASE_WEB_API_KEY,
          projectId: c.env.FIREBASE_PROJECT_ID,
          authDomain: `${c.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
        }
      : null,
    emulator,
    steam_enabled: true,
    catalog_import_enabled:
      !!c.env.IGDB_CLIENT_ID && !!c.env.IGDB_CLIENT_SECRET,
  });
});

app.get("/api/home", async (c) => {
  const [ranked, daily, recent, added, stats] = await Promise.all([
    rankedGames(c, 4),
    highlights(c),
    c.env.DB.prepare(
      `SELECT ${reviewColumns} ${reviewJoins} WHERE r.published_at IS NOT NULL ORDER BY r.published_at DESC LIMIT 3`,
    ).all(),
    c.env.DB.prepare(
      `SELECT ${gameColumns} FROM games g ORDER BY g.created_at DESC,g.title LIMIT 4`,
    ).all(),
    c.env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM games) AS games,(SELECT COUNT(*) FROM ratings) AS ratings,
      (SELECT COUNT(*) FROM reviews WHERE published_at IS NOT NULL) AS reviews`,
    ).first(),
  ]);
  await attachMyVotes(c, [{ type: "review", rows: recent.results }]);
  return c.json({
    ranked: ranked.games,
    minimum: ranked.minimum,
    highlights: daily,
    recent: recent.results,
    added: added.results.map(parseGame),
    stats,
  });
});

app.get("/api/games", async (c) => {
  const query = (c.req.query("q") ?? "").trim().slice(0, 100);
  const platform = (c.req.query("platform") ?? "").slice(0, 60);
  const genre = (c.req.query("genre") ?? "").slice(0, 60);
  const year = c.req.query("year") ?? "";
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(c.req.query("page") ?? "1") || 1),
  );
  const sorts: Record<string, string> = {
    title: "g.title COLLATE NOCASE",
    newest: "g.release_date DESC,g.title",
    rating: "rating IS NULL,rating DESC,rating_count DESC,g.title",
    popular: "rating_count DESC,rating DESC,g.title",
    added: "g.created_at DESC,g.title",
  };
  const sort = sorts[c.req.query("sort") ?? "title"] ?? sorts.title;
  const where = ["1=1"];
  const args: (string | number)[] = [];
  if (query) {
    where.push("g.title LIKE ? ESCAPE '\\'");
    args.push(`%${query.replace(/[\\%_]/g, "\\$&")}%`);
  }
  if (platform) {
    where.push("EXISTS(SELECT 1 FROM json_each(g.platforms) WHERE value=?)");
    args.push(platform);
  }
  if (genre) {
    where.push("EXISTS(SELECT 1 FROM json_each(g.genres) WHERE value=?)");
    args.push(genre);
  }
  if (/^\d{4}$/.test(year)) {
    where.push("g.release_date LIKE ?");
    args.push(`${year}%`);
  }
  const [rows, count, platforms, genres, years] = await Promise.all([
    c.env.DB.prepare(
      `SELECT ${gameColumns} FROM games g WHERE ${where.join(" AND ")} ORDER BY ${sort} LIMIT 12 OFFSET ?`,
    )
      .bind(...args, (page - 1) * 12)
      .all(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM games g WHERE ${where.join(" AND ")}`,
    )
      .bind(...args)
      .first<{ count: number }>(),
    c.env.DB.prepare(
      "SELECT DISTINCT value FROM games,json_each(games.platforms) ORDER BY value",
    ).all<{ value: string }>(),
    c.env.DB.prepare(
      "SELECT DISTINCT value FROM games,json_each(games.genres) ORDER BY value",
    ).all<{ value: string }>(),
    c.env.DB.prepare(
      "SELECT DISTINCT substr(release_date,1,4) AS year FROM games WHERE length(release_date)>=4 ORDER BY year DESC",
    ).all<{ year: string }>(),
  ]);
  return c.json({
    games: rows.results.map(parseGame),
    total: count?.count ?? 0,
    page,
    pages: Math.ceil((count?.count ?? 0) / 12),
    platforms: platforms.results.map((x) => x.value),
    genres: genres.results.map((x) => x.value),
    years: years.results.map((x) => x.year),
  });
});

app.get("/api/top-50", async (c) => c.json(await rankedGames(c)));
app.get("/api/highlights", async (c) => c.json(await highlights(c)));

app.get("/api/games/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(
    `SELECT ${gameColumns} FROM games g WHERE g.id=?`,
  )
    .bind(id)
    .first();
  if (!row)
    throw new HTTPException(404, { message: "This game could not be found." });
  const account = await authenticate(c, true);
  const order =
    c.req.query("sort") === "votes"
      ? "votes DESC,r.published_at DESC"
      : "r.published_at DESC";
  const page = Math.max(1, Number.parseInt(c.req.query("page") ?? "1") || 1);
  const reviews = await c.env.DB.prepare(
    `SELECT ${reviewColumns},
    COALESCE((SELECT value FROM votes WHERE user_id=? AND target_type='review' AND target_id=r.id),0) AS my_vote
    ${reviewJoins} WHERE r.game_id=? AND r.published_at IS NOT NULL ORDER BY ${order} LIMIT 12 OFFSET ?`,
  )
    .bind(account?.uid ?? "", id, (page - 1) * 12)
    .all();
  const distribution = await c.env.DB.prepare(
    "SELECT MIN(10,CAST(score/10 AS INTEGER)) AS bucket,COUNT(*) AS count FROM ratings WHERE game_id=? GROUP BY bucket",
  )
    .bind(id)
    .all();
  const own = account
    ? await c.env.DB.prepare(
        "SELECT score/10.0 AS score FROM ratings WHERE user_id=? AND game_id=?",
      )
        .bind(account.uid, id)
        .first()
    : null;
  const ownReview = account
    ? await c.env.DB.prepare(
        "SELECT id,title,body,platform,pending_title,pending_body,pending_platform,status,reason,submitted_at,published_at FROM reviews WHERE user_id=? AND game_id=?",
      )
        .bind(account.uid, id)
        .first()
    : null;
  const ranked = await rankedGames(c);
  return c.json({
    game: parseGame(row),
    reviews: reviews.results,
    page,
    distribution: distribution.results,
    my_rating: own?.score ?? null,
    my_review: ownReview,
    rank: ranked.games.findIndex((g) => g.id === id) + 1 || null,
  });
});

app.put("/api/games/:id/rating", async (c) => {
  const { account } = await user(c, true);
  await throttle(c, account.uid);
  const body = await c.req.json();
  const score = scoreToTenths(body.score);
  if (
    !(await c.env.DB.prepare("SELECT id FROM games WHERE id=?")
      .bind(c.req.param("id"))
      .first())
  )
    throw new HTTPException(404, { message: "Game not found." });
  await c.env.DB.prepare(
    "INSERT INTO ratings(user_id,game_id,score,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,game_id) DO UPDATE SET score=excluded.score,updated_at=excluded.updated_at",
  )
    .bind(account.uid, c.req.param("id"), score, Date.now())
    .run();
  return c.json({ score: score / 10 });
});

app.put("/api/games/:id/review", async (c) => {
  const { account } = await user(c, true);
  await throttle(c, account.uid);
  const body = await c.req.json();
  const title = text(body.title, "Review title", 3, 140);
  const content = text(body.body, "Review", 20, 10000);
  const platform = text(body.platform ?? "Other", "Platform", 1, 60);
  const game = await c.env.DB.prepare("SELECT id FROM games WHERE id=?")
    .bind(c.req.param("id"))
    .first();
  if (!game) throw new HTTPException(404, { message: "Game not found." });
  const id = crypto.randomUUID();
  const now = Date.now();
  const statements = [];
  if (body.score !== null && body.score !== undefined) {
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO ratings(user_id,game_id,score,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,game_id) DO UPDATE SET score=excluded.score,updated_at=excluded.updated_at",
      ).bind(account.uid, c.req.param("id"), scoreToTenths(body.score), now),
    );
  }
  statements.push(
    c.env.DB.prepare(
      `INSERT INTO reviews(id,user_id,game_id,pending_title,pending_body,pending_platform,status,submitted_at)
    VALUES(?,?,?,?,?,?,'pending',?) ON CONFLICT(user_id,game_id) DO UPDATE SET pending_title=excluded.pending_title,
    pending_body=excluded.pending_body,pending_platform=excluded.pending_platform,status='pending',reason='',submitted_at=MAX(excluded.submitted_at,reviews.submitted_at+1)`,
    ).bind(id, account.uid, c.req.param("id"), title, content, platform, now),
  );
  await c.env.DB.batch(statements);
  const review = await c.env.DB.prepare(
    "SELECT id FROM reviews WHERE user_id=? AND game_id=?",
  )
    .bind(account.uid, c.req.param("id"))
    .first();
  return c.json({ id: review?.id, status: "pending" });
});

app.get("/api/reviews/:id", async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT ${reviewColumns} ${reviewJoins} WHERE r.id=? AND r.published_at IS NOT NULL`,
  )
    .bind(c.req.param("id"))
    .first();
  if (!row)
    throw new HTTPException(404, {
      message: "This review is unavailable or awaiting approval.",
    });
  const account = await authenticate(c, true);
  const order =
    c.req.query("sort") === "votes"
      ? "votes DESC,c.published_at"
      : "c.published_at";
  const comments = await c.env.DB.prepare(
    `SELECT ${commentColumns},
    COALESCE((SELECT value FROM votes WHERE user_id=? AND target_type='comment' AND target_id=c.id),0) AS my_vote
    FROM comments c JOIN users u ON u.id=c.user_id WHERE c.review_id=? AND c.status='approved' ORDER BY ${order} LIMIT 200`,
  )
    .bind(account?.uid ?? "", c.req.param("id"))
    .all();
  const myVote = account
    ? await c.env.DB.prepare(
        "SELECT value FROM votes WHERE user_id=? AND target_type='review' AND target_id=?",
      )
        .bind(account.uid, c.req.param("id"))
        .first()
    : null;
  return c.json({
    review: { ...row, my_vote: myVote?.value ?? 0 },
    comments: comments.results,
  });
});

app.post("/api/reviews/:id/comments", async (c) => {
  const { account } = await user(c, true);
  await throttle(c, account.uid);
  const body = await c.req.json();
  const content = text(body.body, "Comment", 2, 3000);
  const review = await c.env.DB.prepare(
    "SELECT id FROM reviews WHERE id=? AND published_at IS NOT NULL",
  )
    .bind(c.req.param("id"))
    .first();
  if (!review) throw new HTTPException(404, { message: "Review not found." });
  const parent = body.parent_id
    ? text(body.parent_id, "Parent comment", 1, 100)
    : null;
  if (
    parent &&
    !(await c.env.DB.prepare(
      "SELECT id FROM comments WHERE id=? AND review_id=? AND status='approved'",
    )
      .bind(parent, c.req.param("id"))
      .first())
  )
    throw new InputError("The parent comment is unavailable.");
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO comments(id,user_id,review_id,parent_id,body,status,created_at) VALUES(?,?,?,?,?,'pending',?)",
  )
    .bind(id, account.uid, c.req.param("id"), parent, content, Date.now())
    .run();
  return c.json({ id, status: "pending" }, 201);
});

app.put("/api/votes", async (c) => {
  const { account } = await user(c, true);
  await throttle(c, account.uid, 100);
  const body = await c.req.json();
  const value = voteValue(body.value);
  if (body.type !== "review" && body.type !== "comment")
    throw new InputError("Invalid vote target.");
  const id = text(body.id, "Contribution", 1, 100);
  const target =
    body.type === "review"
      ? await c.env.DB.prepare(
          "SELECT id FROM reviews WHERE id=? AND published_at IS NOT NULL",
        )
          .bind(id)
          .first()
      : await c.env.DB.prepare(
          "SELECT c.id FROM comments c JOIN reviews r ON r.id=c.review_id WHERE c.id=? AND c.status='approved' AND r.published_at IS NOT NULL",
        )
          .bind(id)
          .first();
  if (!target)
    throw new HTTPException(404, {
      message: "This contribution is unavailable.",
    });
  if (value === 0)
    await c.env.DB.prepare(
      "DELETE FROM votes WHERE user_id=? AND target_type=? AND target_id=?",
    )
      .bind(account.uid, body.type, id)
      .run();
  else
    await c.env.DB.prepare(
      "INSERT INTO votes(user_id,target_type,target_id,value,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,target_type,target_id) DO UPDATE SET value=excluded.value,updated_at=CASE WHEN value!=excluded.value THEN excluded.updated_at ELSE updated_at END",
    )
      .bind(account.uid, body.type, id, value, Date.now())
      .run();
  const score = await c.env.DB.prepare(
    "SELECT COALESCE(SUM(value),0) AS votes FROM votes WHERE target_type=? AND target_id=?",
  )
    .bind(body.type, id)
    .first();
  return c.json({ votes: score?.votes ?? 0, my_vote: value });
});

app.get("/api/me", async (c) => {
  const { account, profile } = await user(c);
  return c.json({
    ...profile,
    admin: account.admin,
    email: account.email,
    verified: account.verified,
  });
});
app.patch("/api/me", async (c) => {
  const { account } = await user(c);
  await throttle(c, account.uid);
  const body = await c.req.json();
  const name = text(body.display_name, "Display name", 2, 40);
  if (typeof body.anonymous !== "boolean")
    throw new InputError("Choose an anonymity setting.");
  await c.env.DB.prepare(
    "UPDATE users SET display_name=?,anonymous=? WHERE id=?",
  )
    .bind(name, body.anonymous ? 1 : 0, account.uid)
    .run();
  return c.json({ ok: true });
});
app.get("/api/me/contributions", async (c) => {
  const { account } = await user(c);
  const [reviews, comments, ratings, suggestions] = await Promise.all([
    c.env.DB.prepare(
      "SELECT r.id,r.game_id,g.title AS game_title,r.title,r.body,r.platform,r.pending_title,r.pending_body,r.pending_platform,r.status,r.reason,r.submitted_at,r.published_at FROM reviews r JOIN games g ON g.id=r.game_id WHERE r.user_id=? ORDER BY r.submitted_at DESC LIMIT 200",
    )
      .bind(account.uid)
      .all(),
    c.env.DB.prepare(
      "SELECT c.id,c.review_id,c.body,c.status,c.reason,c.created_at,r.game_id,g.title AS game_title FROM comments c JOIN reviews r ON r.id=c.review_id JOIN games g ON g.id=r.game_id WHERE c.user_id=? ORDER BY c.created_at DESC LIMIT 200",
    )
      .bind(account.uid)
      .all(),
    c.env.DB.prepare(
      "SELECT r.game_id,r.score/10.0 AS score,r.updated_at,g.title,g.cover_url FROM ratings r JOIN games g ON g.id=r.game_id WHERE r.user_id=? ORDER BY r.updated_at DESC LIMIT 200",
    )
      .bind(account.uid)
      .all(),
    c.env.DB.prepare(
      "SELECT id,title,status,reason,game_id,created_at FROM game_suggestions WHERE user_id=? ORDER BY created_at DESC LIMIT 200",
    )
      .bind(account.uid)
      .all(),
  ]);
  return c.json({
    reviews: reviews.results,
    comments: comments.results,
    ratings: ratings.results,
    suggestions: suggestions.results,
  });
});

app.get("/api/profiles/:id", async (c) => {
  const profile = await c.env.DB.prepare(
    "SELECT public_id,display_name,anonymous,created_at FROM users WHERE public_id=?",
  )
    .bind(c.req.param("id"))
    .first<{
      public_id: string;
      display_name: string;
      anonymous: number;
      created_at: number;
    }>();
  if (!profile) throw new HTTPException(404, { message: "Profile not found." });
  const [reviews, ratings, comments] = await Promise.all([
    c.env.DB.prepare(
      `SELECT ${reviewColumns} ${reviewJoins} WHERE u.public_id=? AND r.published_at IS NOT NULL ORDER BY r.published_at DESC LIMIT 100`,
    )
      .bind(profile.public_id)
      .all(),
    c.env.DB.prepare(
      "SELECT g.id AS game_id,g.title,g.cover_url,r.score/10.0 AS score FROM ratings r JOIN games g ON g.id=r.game_id JOIN users u ON u.id=r.user_id WHERE u.public_id=? ORDER BY r.updated_at DESC LIMIT 100",
    )
      .bind(profile.public_id)
      .all(),
    c.env.DB.prepare(
      `SELECT ${commentColumns},g.title AS game_title FROM comments c JOIN users u ON u.id=c.user_id JOIN reviews r ON r.id=c.review_id JOIN games g ON g.id=r.game_id WHERE u.public_id=? AND c.status='approved' AND r.published_at IS NOT NULL ORDER BY c.published_at DESC LIMIT 100`,
    )
      .bind(profile.public_id)
      .all(),
  ]);
  await attachMyVotes(c, [
    { type: "review", rows: reviews.results },
    { type: "comment", rows: comments.results },
  ]);
  return c.json({
    profile: {
      public_id: profile.public_id,
      display_name: profile.anonymous
        ? "Anonymous Gamer"
        : profile.display_name,
      anonymous: !!profile.anonymous,
      created_at: profile.created_at,
    },
    reviews: reviews.results,
    ratings: ratings.results,
    comments: comments.results,
  });
});

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20)
    throw new InputError(`Choose at least one ${label}.`);
  return [...new Set(value.map((x) => text(x, label, 1, 60)))];
}
function dateField(value: unknown): string {
  if (!value) return "";
  const date = text(value, "Release date", 4, 10);
  if (
    !/^\d{4}(-\d{2}-\d{2})?$/.test(date) ||
    (date.length === 10 && !Number.isFinite(Date.parse(date)))
  )
    throw new InputError("Use a release year or YYYY-MM-DD date.");
  return date;
}
app.post("/api/suggestions", async (c) => {
  const { account } = await user(c, true);
  await throttle(c, account.uid, 20);
  const body = await c.req.json();
  const title = text(body.title, "Game title", 2, 140);
  if (
    await c.env.DB.prepare("SELECT id FROM games WHERE lower(title)=lower(?)")
      .bind(title)
      .first()
  )
    throw new InputError("This game is already in the catalog.");
  const platforms = stringArray(body.platforms, "platform");
  const description = text(body.description, "Description", 20, 3000);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO game_suggestions(id,user_id,title,platforms,genres,release_date,developer,publisher,description,reference_url,status,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,'pending',?)`,
  )
    .bind(
      id,
      account.uid,
      title,
      JSON.stringify(platforms),
      JSON.stringify(
        Array.isArray(body.genres) && body.genres.length
          ? stringArray(body.genres, "genre")
          : [],
      ),
      dateField(body.release_date),
      text(body.developer ?? "", "Developer", 0, 140),
      text(body.publisher ?? "", "Publisher", 0, 140),
      description,
      safeUrl(body.reference_url),
      Date.now(),
    )
    .run();
  return c.json({ id, status: "pending" }, 201);
});

app.get("/api/admin/overview", async (c) => {
  await admin(c);
  const [stats, log] = await Promise.all([
    c.env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM reviews WHERE status='pending') AS reviews,
      (SELECT COUNT(*) FROM comments WHERE status='pending') AS comments,
      (SELECT COUNT(*) FROM game_suggestions WHERE status='pending') AS suggestions,
      (SELECT COUNT(*) FROM users) AS users,(SELECT COUNT(*) FROM games) AS games`,
    ).first(),
    c.env.DB.prepare(
      "SELECT l.id,l.target_type,l.decision,l.reason,l.created_at,u.display_name AS admin_name FROM moderation_log l JOIN users u ON u.id=l.admin_id ORDER BY l.created_at DESC LIMIT 20",
    ).all(),
  ]);
  return c.json({
    stats,
    log: log.results,
    minimum_ratings: await minimumRatings(c),
  });
});
app.get("/api/admin/queue", async (c) => {
  await admin(c);
  const status = ["pending", "approved", "rejected"].includes(
    c.req.query("status") ?? "",
  )
    ? c.req.query("status")!
    : "pending";
  const [reviews, comments, suggestions] = await Promise.all([
    c.env.DB.prepare(
      `SELECT r.*,g.title AS game_title,u.display_name,u.anonymous,u.public_id FROM reviews r JOIN games g ON g.id=r.game_id JOIN users u ON u.id=r.user_id WHERE r.status=? ORDER BY r.submitted_at LIMIT 100`,
    )
      .bind(status)
      .all(),
    c.env.DB.prepare(
      "SELECT c.*,r.title AS review_title,r.body AS review_body,g.title AS game_title,u.display_name,u.anonymous,u.public_id,p.body AS parent_body FROM comments c JOIN reviews r ON r.id=c.review_id JOIN games g ON g.id=r.game_id JOIN users u ON u.id=c.user_id LEFT JOIN comments p ON p.id=c.parent_id WHERE c.status=? ORDER BY c.created_at LIMIT 100",
    )
      .bind(status)
      .all(),
    c.env.DB.prepare(
      "SELECT s.*,u.display_name,u.anonymous FROM game_suggestions s JOIN users u ON u.id=s.user_id WHERE s.status=? ORDER BY s.created_at LIMIT 100",
    )
      .bind(status)
      .all(),
  ]);
  return c.json({
    reviews: reviews.results,
    comments: comments.results,
    suggestions: suggestions.results,
  });
});

app.post("/api/admin/moderate", async (c) => {
  const { account } = await admin(c);
  await throttle(c, account.uid, 120);
  const body = await c.req.json();
  if (
    !["review", "comment", "suggestion"].includes(body.type) ||
    !["approved", "rejected"].includes(body.decision)
  )
    throw new InputError("Choose a valid moderation decision.");
  const id = text(body.id, "Submission", 1, 100);
  const reason = text(
    body.reason ?? "",
    "Feedback",
    body.decision === "rejected" ? 3 : 0,
    1000,
  );
  const now = Date.now();
  const log = () =>
    c.env.DB.prepare(
      "INSERT INTO moderation_log(id,admin_id,target_type,target_id,decision,reason,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()>0",
    ).bind(
      crypto.randomUUID(),
      account.uid,
      body.type,
      id,
      body.decision,
      reason,
      now,
    );
  if (body.type === "review") {
    if (!Number.isSafeInteger(body.version))
      throw new InputError("Refresh the queue before moderating this review.");
    const stmt =
      body.decision === "approved"
        ? c.env.DB.prepare(
            `UPDATE reviews SET title=pending_title,body=pending_body,platform=pending_platform,
        edited_at=CASE WHEN published_at IS NOT NULL THEN ? ELSE NULL END,published_at=COALESCE(published_at,?),
        pending_title=NULL,pending_body=NULL,pending_platform=NULL,status='approved',reason=''
        WHERE id=? AND status='pending' AND submitted_at=?`,
          ).bind(now, now, id, body.version)
        : c.env.DB.prepare(
            "UPDATE reviews SET status='rejected',reason=? WHERE id=? AND status='pending' AND submitted_at=?",
          ).bind(reason, id, body.version);
    const result = await c.env.DB.batch([stmt, log()]);
    if (!result[0].meta.changes)
      throw new HTTPException(409, {
        message: "This submission changed. Refresh the queue before deciding.",
      });
  } else if (body.type === "comment") {
    const result = await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE comments SET status=?,reason=?,published_at=CASE WHEN ?='approved' THEN ? ELSE NULL END WHERE id=? AND status='pending'",
      ).bind(body.decision, reason, body.decision, now, id),
      log(),
    ]);
    if (!result[0].meta.changes)
      throw new HTTPException(409, {
        message: "This comment has already been moderated.",
      });
  } else {
    const row = await c.env.DB.prepare(
      "SELECT * FROM game_suggestions WHERE id=? AND status='pending'",
    )
      .bind(id)
      .first<Record<string, string>>();
    if (!row)
      throw new HTTPException(409, {
        message: "This suggestion has already been moderated.",
      });
    if (body.decision === "approved") {
      const title = text(body.title ?? row.title, "Game title", 2, 140);
      if (
        await c.env.DB.prepare(
          "SELECT id FROM games WHERE lower(title)=lower(?)",
        )
          .bind(title)
          .first()
      )
        throw new InputError(
          "A game with this title already exists. Reject this duplicate suggestion.",
        );
      const gameId = `${slugify(title)}-${id.slice(0, 6)}`;
      const description = text(
        body.description ?? row.description,
        "Description",
        20,
        3000,
      );
      const platforms = body.platforms
        ? JSON.stringify(stringArray(body.platforms, "platform"))
        : row.platforms;
      const result = await c.env.DB.batch([
        c.env.DB.prepare(
          `INSERT INTO games(id,title,description,platforms,genres,release_date,developer,publisher,created_at)
          SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM game_suggestions WHERE id=? AND status='pending')`,
        ).bind(
          gameId,
          title,
          description,
          platforms,
          row.genres,
          row.release_date,
          row.developer,
          row.publisher,
          now,
          id,
        ),
        c.env.DB.prepare(
          "UPDATE game_suggestions SET status='approved',game_id=?,reason='' WHERE id=? AND status='pending'",
        ).bind(gameId, id),
        log(),
      ]);
      if (!result[1].meta.changes)
        throw new HTTPException(409, {
          message: "This suggestion changed. Refresh the queue.",
        });
    } else {
      await c.env.DB.batch([
        c.env.DB.prepare(
          "UPDATE game_suggestions SET status='rejected',reason=? WHERE id=? AND status='pending'",
        ).bind(reason, id),
        log(),
      ]);
    }
  }
  return c.json({ ok: true });
});

app.put("/api/admin/settings", async (c) => {
  const { account } = await admin(c);
  await throttle(c, account.uid);
  const { minimum_ratings: minimum } = await c.req.json();
  if (!Number.isSafeInteger(minimum) || minimum < 1 || minimum > 100000)
    throw new InputError(
      "Minimum ratings must be a whole number from 1 to 100,000.",
    );
  await c.env.DB.prepare(
    "UPDATE settings SET value=? WHERE key='minimum_ratings'",
  )
    .bind(String(minimum))
    .run();
  return c.json({ minimum_ratings: minimum });
});

app.put("/api/admin/games/:id", async (c) => {
  const { account } = await admin(c);
  await throttle(c, account.uid);
  const body = await c.req.json();
  const title = text(body.title, "Game title", 2, 140);
  const description = text(body.description, "Description", 20, 5000);
  const platforms = JSON.stringify(stringArray(body.platforms, "platform"));
  const genres = JSON.stringify(
    Array.isArray(body.genres) && body.genres.length
      ? stringArray(body.genres, "genre")
      : [],
  );
  const cover = assetUrl(body.cover_url);
  const hero = assetUrl(body.hero_url);
  const steamId = body.steam_app_id ? Number(body.steam_app_id) : null;
  if (steamId !== null && (!Number.isSafeInteger(steamId) || steamId < 1))
    throw new InputError("Invalid Steam app ID.");
  const result = await c.env.DB.prepare(
    "UPDATE games SET title=?,description=?,platforms=?,genres=?,release_date=?,developer=?,publisher=?,cover_url=?,hero_url=?,steam_app_id=? WHERE id=?",
  )
    .bind(
      title,
      description,
      platforms,
      genres,
      dateField(body.release_date),
      text(body.developer ?? "", "Developer", 0, 140),
      text(body.publisher ?? "", "Publisher", 0, 140),
      cover,
      hero,
      steamId,
      c.req.param("id"),
    )
    .run();
  if (!result.meta.changes)
    throw new HTTPException(404, { message: "Game not found." });
  return c.json({ ok: true });
});

app.post("/api/admin/games", async (c) => {
  const { account } = await admin(c);
  await throttle(c, account.uid);
  const body = await c.req.json();
  const title = text(body.title, "Game title", 2, 140);
  if (
    await c.env.DB.prepare("SELECT id FROM games WHERE lower(title)=lower(?)")
      .bind(title)
      .first()
  )
    throw new InputError("This game is already in the catalog.");
  const id = `${slugify(title)}-${crypto.randomUUID().slice(0, 6)}`;
  await c.env.DB.prepare(
    `INSERT INTO games(id,title,description,platforms,genres,release_date,developer,publisher,cover_url,hero_url,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      id,
      title,
      text(body.description, "Description", 20, 5000),
      JSON.stringify(stringArray(body.platforms, "platform")),
      JSON.stringify(
        Array.isArray(body.genres) && body.genres.length
          ? stringArray(body.genres, "genre")
          : [],
      ),
      dateField(body.release_date),
      text(body.developer ?? "", "Developer", 0, 140),
      text(body.publisher ?? "", "Publisher", 0, 140),
      assetUrl(body.cover_url),
      assetUrl(body.hero_url),
      Date.now(),
    )
    .run();
  return c.json({ id }, 201);
});

app.route("/api", integrations);
app.all("/api/*", (c) => c.json({ error: "Endpoint not found." }, 404));
app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));
export default app;
