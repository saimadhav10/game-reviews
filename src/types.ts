export interface Game {
  id: string;
  title: string;
  description: string;
  platforms: string[];
  genres: string[];
  release_date: string;
  developer: string;
  publisher: string;
  cover_url: string;
  hero_url: string;
  rating: number | null;
  rating_count: number;
  review_count: number;
  created_at: number;
  steam_app_id?: number | null;
}
export interface Review {
  id: string;
  game_id: string;
  game_title: string;
  game_cover: string;
  title: string;
  body: string;
  platform: string;
  published_at: number;
  edited_at: number | null;
  author_id: string;
  author_name: string;
  author_anonymous: number;
  score: number | null;
  votes: number;
  reply_count: number;
  my_vote?: number;
  daily_votes?: number;
}
export interface Comment {
  id: string;
  review_id: string;
  parent_id: string | null;
  body: string;
  published_at: number;
  author_id: string;
  author_name: string;
  author_anonymous: number;
  votes: number;
  my_vote?: number;
  daily_votes?: number;
  game_title?: string;
  review_title?: string;
}
export interface Profile {
  id: string;
  public_id: string;
  display_name: string;
  anonymous: number;
  steam_id: string | null;
  created_at: number;
  admin: boolean;
  email: string;
  verified: boolean;
}
export interface OwnReview {
  id: string;
  title: string | null;
  body: string | null;
  platform: string | null;
  pending_title: string | null;
  pending_body: string | null;
  pending_platform: string | null;
  status: "pending" | "approved" | "rejected";
  reason: string;
  published_at: number | null;
  submitted_at: number;
}
export interface GameDetail {
  game: Game;
  reviews: Review[];
  page: number;
  distribution: { bucket: number; count: number }[];
  my_rating: number | null;
  my_review: OwnReview | null;
  rank: number | null;
}
export interface Catalog {
  games: Game[];
  total: number;
  page: number;
  pages: number;
  platforms: string[];
  genres: string[];
  years: string[];
}
export interface Highlights {
  reviews: Review[];
  comments: Comment[];
  window_hours: number;
}
export interface HomeData {
  ranked: Game[];
  minimum: number;
  highlights: Highlights;
  recent: Review[];
  added: Game[];
  stats: { games: number; reviews: number; ratings: number };
}
export interface Config {
  firebase: { apiKey: string; authDomain: string; projectId: string } | null;
  emulator: string | null;
  steam_enabled: boolean;
  catalog_import_enabled: boolean;
}
