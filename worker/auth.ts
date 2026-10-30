import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Account, AppEnv, UserRow } from "./types";

export const isLoopback = (hostname: string) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(hostname);

export async function authenticate(
  c: Context<AppEnv>,
  optional = false,
): Promise<Account | null> {
  const cached = c.get("account");
  if (cached) return cached;
  const authorization = c.req.header("Authorization");
  if (!authorization) {
    if (optional) return null;
    throw new HTTPException(401, { message: "Sign in to continue." });
  }
  if (!authorization.startsWith("Bearer ") || authorization.length > 8192)
    throw new HTTPException(401, { message: "Invalid sign-in session." });
  const {
    FIREBASE_PROJECT_ID: project,
    FIREBASE_WEB_API_KEY: key,
    FIREBASE_AUTH_EMULATOR_HOST: emulator,
  } = c.env;
  if (!project || !key || project === "configure-before-deploy")
    throw new HTTPException(503, {
      message: "Account services have not been configured yet.",
    });
  if (
    emulator &&
    (!isLoopback(new URL(c.req.url).hostname) ||
      !/^127\.0\.0\.1:\d+$/.test(emulator))
  ) {
    throw new HTTPException(503, {
      message: "Local authentication is disabled on public hosts.",
    });
  }
  if (!emulator && project.startsWith("demo-"))
    throw new HTTPException(503, {
      message: "Production authentication must use a real Firebase project.",
    });
  // Firebase validates the ID token, including signature/expiry. Never trust decoded JWT claims.
  const base = emulator
    ? `http://${emulator}/identitytoolkit.googleapis.com`
    : "https://identitytoolkit.googleapis.com";
  let response: Response;
  try {
    response = await fetch(
      `${base}/v1/accounts:lookup?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: authorization.slice(7) }),
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    throw new HTTPException(503, {
      message: "Sign-in service is temporarily unavailable. Please retry.",
    });
  }
  if (!response.ok)
    throw new HTTPException(401, {
      message: "Your session has expired. Please sign in again.",
    });
  const data = (await response.json()) as {
    users?: {
      localId: string;
      email?: string;
      emailVerified?: boolean;
      disabled?: boolean;
      validSince?: string;
    }[];
  };
  const identity = data.users?.[0];
  if (!identity?.localId || identity.disabled)
    throw new HTTPException(401, { message: "This account is unavailable." });
  // Only inspect claims after Firebase has validated the token. Bind the result
  // to this project, the returned account, and its current session-validity time.
  try {
    const encoded = authorization
      .slice(7)
      .split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const claims = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)),
      ),
    );
    if (
      claims.aud !== project ||
      claims.iss !== `https://securetoken.google.com/${project}` ||
      claims.sub !== identity.localId ||
      typeof claims.auth_time !== "number" ||
      claims.auth_time < Number(identity.validSince ?? 0)
    )
      throw new Error("Session mismatch");
  } catch {
    throw new HTTPException(401, {
      message: "This session is no longer valid. Please sign in again.",
    });
  }
  const account: Account = {
    uid: identity.localId,
    email: identity.email ?? "",
    verified: identity.emailVerified === true,
    admin: (c.env.ADMIN_UIDS ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .includes(identity.localId),
  };
  c.set("account", account);
  return account;
}

export async function user(
  c: Context<AppEnv>,
  verified = false,
): Promise<{ account: Account; profile: UserRow }> {
  const account = (await authenticate(c))!;
  if (verified && !account.verified)
    throw new HTTPException(403, {
      message: "Verify your email address before contributing.",
    });
  let profile = c.get("user");
  if (!profile) {
    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO users(id,public_id,display_name,created_at) VALUES(?,?,?,?)",
    )
      .bind(
        account.uid,
        crypto.randomUUID(),
        `Gamer ${crypto.randomUUID().slice(0, 6)}`,
        Date.now(),
      )
      .run();
    profile = (await c.env.DB.prepare("SELECT * FROM users WHERE id=?")
      .bind(account.uid)
      .first<UserRow>())!;
    c.set("user", profile);
  }
  return { account, profile };
}

export async function admin(c: Context<AppEnv>) {
  const identity = await user(c, true);
  if (!identity.account.admin)
    throw new HTTPException(403, {
      message: "Administrator access is required.",
    });
  return identity;
}

export async function throttle(c: Context<AppEnv>, uid: string, limit = 60) {
  const now = Date.now();
  const row = await c.env.DB.prepare(
    `INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END,
    expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count`,
  )
    .bind(uid, now + 60000, now, now)
    .first<{ count: number }>();
  if (row && row.count > limit)
    throw new HTTPException(429, {
      message: "You are submitting too quickly. Try again in a minute.",
    });
}
