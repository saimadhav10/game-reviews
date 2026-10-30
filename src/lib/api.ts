import type { Auth } from "firebase/auth";
export let firebaseAuth: Auth | null = null;
export function setFirebaseAuth(auth: Auth) {
  firebaseAuth = auth;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (firebaseAuth?.currentUser)
    headers.set(
      "Authorization",
      `Bearer ${await firebaseAuth.currentUser.getIdToken()}`,
    );
  const response = await fetch(`/api${path}`, { ...options, headers });
  const payload = (await response.json().catch(() => ({
    error: "The server returned an unexpected response.",
  }))) as { error?: string };
  if (!response.ok)
    throw new ApiError(payload.error ?? "Please try again.", response.status);
  return payload as T;
}
export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
