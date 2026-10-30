PRAGMA foreign_keys = ON;
CREATE TABLE users (
  id TEXT PRIMARY KEY, public_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL, anonymous INTEGER NOT NULL DEFAULT 0 CHECK(anonymous IN(0,1)),
  steam_id TEXT UNIQUE, created_at INTEGER NOT NULL
);
CREATE TABLE games (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
  platforms TEXT NOT NULL DEFAULT '[]', genres TEXT NOT NULL DEFAULT '[]',
  release_date TEXT NOT NULL DEFAULT '', developer TEXT NOT NULL DEFAULT '', publisher TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '', hero_url TEXT NOT NULL DEFAULT '', steam_app_id INTEGER,
  igdb_id INTEGER UNIQUE, created_at INTEGER NOT NULL
);
CREATE TABLE ratings (
  user_id TEXT NOT NULL REFERENCES users(id), game_id TEXT NOT NULL REFERENCES games(id),
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100), updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id,game_id)
);
CREATE INDEX ratings_game ON ratings(game_id);
CREATE TABLE reviews (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), game_id TEXT NOT NULL REFERENCES games(id),
  title TEXT, body TEXT, platform TEXT, pending_title TEXT, pending_body TEXT, pending_platform TEXT,
  status TEXT NOT NULL CHECK(status IN('pending','approved','rejected')),
  reason TEXT NOT NULL DEFAULT '', submitted_at INTEGER NOT NULL, published_at INTEGER, edited_at INTEGER,
  UNIQUE(user_id,game_id)
);
CREATE INDEX reviews_game_public ON reviews(game_id,published_at);
CREATE INDEX reviews_queue ON reviews(status,submitted_at);
CREATE TABLE comments (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), review_id TEXT NOT NULL REFERENCES reviews(id),
  parent_id TEXT REFERENCES comments(id), body TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN('pending','approved','rejected')),
  reason TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, published_at INTEGER
);
CREATE INDEX comments_review ON comments(review_id,status,created_at);
CREATE INDEX comments_queue ON comments(status,created_at);
CREATE TABLE votes (
  user_id TEXT NOT NULL REFERENCES users(id), target_type TEXT NOT NULL CHECK(target_type IN('review','comment')),
  target_id TEXT NOT NULL, value INTEGER NOT NULL CHECK(value IN(-1,1)), updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id,target_type,target_id)
);
CREATE INDEX votes_target ON votes(target_type,target_id);
CREATE INDEX votes_recent ON votes(updated_at);
CREATE TABLE game_suggestions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, platforms TEXT NOT NULL,
  genres TEXT NOT NULL DEFAULT '[]', release_date TEXT NOT NULL DEFAULT '', developer TEXT NOT NULL DEFAULT '',
  publisher TEXT NOT NULL DEFAULT '', description TEXT NOT NULL, reference_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN('pending','approved','rejected')), reason TEXT NOT NULL DEFAULT '',
  game_id TEXT REFERENCES games(id), created_at INTEGER NOT NULL
);
CREATE INDEX suggestions_queue ON game_suggestions(status,created_at);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO settings VALUES ('minimum_ratings','1');
CREATE TABLE moderation_log (
  id TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES users(id), target_type TEXT NOT NULL,
  target_id TEXT NOT NULL, decision TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE TABLE steam_link_states (
  state TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), origin TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE provider_cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER NOT NULL);
