const { spawnSync } = require("node:child_process");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getProjectDefaultAccount } = require("firebase-tools/lib/auth");
const { Client } = require("firebase-tools/lib/apiv2");
const path = require("node:path");

function wrangler(args, input) {
  const result = spawnSync(
    process.execPath,
    [path.resolve("node_modules/wrangler/bin/wrangler.js"), ...args],
    { input, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
  if (result.status !== 0)
    throw new Error(
      "Cloudflare administrator configuration failed. Existing administrator settings were not intentionally replaced.",
    );
  return result.stdout;
}
(async () => {
  const project = "gamereviews-saimadhav10";
  const owner = getProjectDefaultAccount(process.cwd());
  if (!owner?.user?.email) throw new Error("Run npx firebase login first.");
  await requireAuth({ project, nonInteractive: true, ...owner });
  const identity = new Client({
    urlPrefix: "https://identitytoolkit.googleapis.com",
    apiVersion: "v1",
  });
  const result = await identity.post(`/projects/${project}/accounts:lookup`, {
    email: [owner.user.email],
  });
  const account = result.body.users?.find(
    (user) =>
      user.email?.toLowerCase() === owner.user.email.toLowerCase() &&
      user.emailVerified === true,
  );
  if (!account?.localId)
    throw new Error(
      "Sign in to GameReviews with the Firebase owner Google account first, then run this helper again.",
    );
  const output = wrangler(["secret", "list"]);
  const at = output.indexOf("[");
  const existing = at >= 0 ? JSON.parse(output.slice(at)) : [];
  if (existing.some((secret) => secret.name === "ADMIN_UIDS"))
    throw new Error(
      "ADMIN_UIDS is already configured. This initial-setup helper will not replace existing administrators.",
    );
  if (!/^[^,\r\n]{1,128}$/.test(account.localId))
    throw new Error("The account UID was not valid.");
  wrangler(["secret", "put", "ADMIN_UIDS"], account.localId + "\n");
  console.log(
    "The verified Firebase owner account is now the GameReviews administrator. Refresh the website to load its admin menu.",
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
