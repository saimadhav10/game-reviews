export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_WEB_API_KEY?: string;
  FIREBASE_AUTH_EMULATOR_HOST?: string;
  ADMIN_UIDS?: string;
  IGDB_CLIENT_ID?: string;
  IGDB_CLIENT_SECRET?: string;
}
export interface Account {
  uid: string;
  email: string;
  verified: boolean;
  admin: boolean;
}
export interface UserRow {
  id: string;
  public_id: string;
  display_name: string;
  anonymous: number;
  steam_id: string | null;
  created_at: number;
}
export type AppEnv = {
  Bindings: Env;
  Variables: { account: Account; user: UserRow };
};
