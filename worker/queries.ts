import type { Context } from "hono";
import type { AppEnv } from "./types";
import { authenticate } from "./auth";

export async function attachMyVotes(
  c: Context<AppEnv>,
  collections: {
    type: "review" | "comment";
    rows: Record<string, unknown>[];
  }[],
) {
  const account = await authenticate(c, true);
  const ids = collections.flatMap((collection) =>
    collection.rows.map((row) => String(row.id)),
  );
  if (!account || !ids.length) return;
  const votes = new Map<string, number>();
  // Stay below D1's bound-parameter limit for active public profiles.
  for (let offset = 0; offset < ids.length; offset += 80) {
    const chunk = ids.slice(offset, offset + 80);
    const result = await c.env.DB.prepare(
      `SELECT target_type,target_id,value FROM votes WHERE user_id=? AND target_id IN(${chunk.map(() => "?").join(",")})`,
    )
      .bind(account.uid, ...chunk)
      .all<{ target_type: string; target_id: string; value: number }>();
    for (const row of result.results)
      votes.set(`${row.target_type}:${row.target_id}`, row.value);
  }
  for (const collection of collections)
    for (const row of collection.rows)
      row.my_vote = votes.get(`${collection.type}:${row.id}`) ?? 0;
}

export const gameColumns = `g.*,
  (SELECT AVG(score)/10.0 FROM ratings WHERE game_id=g.id) AS rating,
  (SELECT COUNT(*) FROM ratings WHERE game_id=g.id) AS rating_count,
  (SELECT COUNT(*) FROM reviews WHERE game_id=g.id AND published_at IS NOT NULL) AS review_count`;

export const reviewColumns = `r.id,r.game_id,r.title,r.body,r.platform,r.published_at,r.edited_at,
  g.title AS game_title,g.cover_url AS game_cover,u.public_id AS author_id,
  CASE WHEN u.anonymous=1 THEN 'Anonymous Gamer' ELSE u.display_name END AS author_name,
  u.anonymous AS author_anonymous,
  (SELECT score/10.0 FROM ratings WHERE user_id=r.user_id AND game_id=r.game_id) AS score,
  COALESCE((SELECT SUM(value) FROM votes WHERE target_type='review' AND target_id=r.id),0) AS votes,
  (SELECT COUNT(*) FROM comments WHERE review_id=r.id AND status='approved') AS reply_count`;
export const reviewJoins =
  "FROM reviews r JOIN users u ON u.id=r.user_id JOIN games g ON g.id=r.game_id";

export const commentColumns = `c.id,c.review_id,c.parent_id,c.body,c.published_at,
  u.public_id AS author_id,CASE WHEN u.anonymous=1 THEN 'Anonymous Gamer' ELSE u.display_name END AS author_name,
  u.anonymous AS author_anonymous,
  COALESCE((SELECT SUM(value) FROM votes WHERE target_type='comment' AND target_id=c.id),0) AS votes`;

export function parseGame(row: Record<string, unknown>) {
  return {
    ...row,
    id: String(row.id),
    platforms: JSON.parse(String(row.platforms)),
    genres: JSON.parse(String(row.genres)),
  };
}
export async function minimumRatings(c: Context<AppEnv>): Promise<number> {
  const row = await c.env.DB.prepare(
    "SELECT value FROM settings WHERE key='minimum_ratings'",
  ).first<{ value: string }>();
  return Math.max(1, Number(row?.value) || 1);
}
export async function rankedGames(c: Context<AppEnv>, limit = 50) {
  const minimum = await minimumRatings(c);
  const result = await c.env.DB.prepare(
    `SELECT ${gameColumns} FROM games g
    WHERE (SELECT COUNT(*) FROM ratings WHERE game_id=g.id)>=?
    ORDER BY rating DESC,rating_count DESC,g.title COLLATE NOCASE ASC LIMIT ?`,
  )
    .bind(minimum, limit)
    .all();
  return { games: result.results.map(parseGame), minimum };
}
export async function highlights(c: Context<AppEnv>) {
  const cutoff = Date.now() - 86400000;
  const reviews = await c.env.DB.prepare(
    `SELECT ${reviewColumns},
    COALESCE((SELECT SUM(value) FROM votes WHERE target_type='review' AND target_id=r.id AND updated_at>=?),0) AS daily_votes
    ${reviewJoins} WHERE r.published_at>=? AND daily_votes>0
    ORDER BY daily_votes DESC,r.published_at DESC LIMIT 8`,
  )
    .bind(cutoff, cutoff)
    .all();
  const comments = await c.env.DB.prepare(
    `SELECT ${commentColumns},g.title AS game_title,r.game_id,r.title AS review_title,
    COALESCE((SELECT SUM(value) FROM votes WHERE target_type='comment' AND target_id=c.id AND updated_at>=?),0) AS daily_votes
    FROM comments c JOIN users u ON u.id=c.user_id JOIN reviews r ON r.id=c.review_id JOIN games g ON g.id=r.game_id
    WHERE c.status='approved' AND c.published_at>=? AND r.published_at IS NOT NULL AND daily_votes>0
    ORDER BY daily_votes DESC,c.published_at DESC LIMIT 8`,
  )
    .bind(cutoff, cutoff)
    .all();
  await attachMyVotes(c, [
    { type: "review", rows: reviews.results },
    { type: "comment", rows: comments.results },
  ]);
  return {
    reviews: reviews.results,
    comments: comments.results,
    window_hours: 24,
  };
}
