/* Uses the repository's pinned Firebase CLI libraries and its signed-in owner.
 * Never prints credentials, accepts terms, or enables a paid plan. */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { parse } = require("jsonc-parser");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getProjectDefaultAccount } = require("firebase-tools/lib/auth");
const { Client } = require("firebase-tools/lib/apiv2");
const apps = require("firebase-tools/lib/management/apps");
const {
  getDefaultHostingSite,
  errNoDefaultSite,
} = require("firebase-tools/lib/getDefaultHostingSite");
const hosting = require("firebase-tools/lib/hosting/api");

const project = "gamereviews-saimadhav10";
const site = "https://gamereviews.saimadhav.workers.dev";
function cli(name, args, input) {
  const binary =
    name === "firebase"
      ? "node_modules/firebase-tools/lib/bin/firebase.js"
      : "node_modules/wrangler/bin/wrangler.js";
  const result = spawnSync(process.execPath, [path.resolve(binary), ...args], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    input,
  });
  if (result.status !== 0) {
    const output = (
      result.stderr ||
      result.stdout ||
      "No additional error details."
    )
      .replace(/AIza[A-Za-z0-9_-]+/g, "[API KEY REDACTED]")
      .replace(/Bearer\s+\S+/g, "Bearer [REDACTED]");
    throw new Error(`${name} operation failed: ${output.slice(-2500)}`);
  }
}

(async () => {
  const owner = getProjectDefaultAccount(process.cwd());
  if (!owner?.user?.email) throw new Error("Run npx firebase login first.");
  await requireAuth({ project, nonInteractive: true, ...owner });
  const firebase = new Client({
    urlPrefix: "https://firebase.googleapis.com",
    apiVersion: "v1beta1",
  });
  // Do not attempt to bypass initial owner onboarding or invent a second project.
  await firebase.get(`/projects/${project}`);
  const existing = await apps.listFirebaseApps(project, apps.AppPlatform.WEB);
  const app =
    existing.find((app) => app.displayName === "GameReviews") ||
    existing[0] ||
    (await apps.createWebApp(project, { displayName: "GameReviews" }));
  try {
    await getDefaultHostingSite({ projectId: project });
  } catch (error) {
    if (error !== errNoDefaultSite) throw error;
    await hosting.createSite(project, project);
  }
  fs.mkdirSync(".local", { recursive: true });
  // The owner explicitly selected the Firebase account email as Google support email.
  const production = {
    auth: {
      providers: {
        emailPassword: true,
        googleSignIn: {
          oAuthBrandDisplayName: "GameReviews",
          supportEmail: owner.user.email,
        },
      },
    },
  };
  fs.writeFileSync(
    ".local/firebase-production.json",
    JSON.stringify(production, null, 2),
  );
  cli("firebase", [
    "deploy",
    "--only",
    "auth",
    "--config",
    ".local/firebase-production.json",
    "--project",
    project,
    "--non-interactive",
  ]);
  console.log("Email/password and Google sign-in providers configured.");
  const identity = new Client({
    urlPrefix: "https://identitytoolkit.googleapis.com",
    apiVersion: "admin/v2",
  });
  const current = (await identity.get(`/projects/${project}/config`)).body;
  const domains = [
    ...new Set([...(current.authorizedDomains || []), new URL(site).hostname]),
  ];
  await identity.patch(
    `/projects/${project}/config`,
    {
      name: `projects/${project}/config`,
      authorizedDomains: domains,
    },
    {
      queryParams: {
        updateMask: "authorizedDomains",
      },
    },
  );
  try {
    await identity.patch(
      `/projects/${project}/config`,
      {
        name: `projects/${project}/config`,
        notification: { sendEmail: { callbackUri: `${site}/auth/action` } },
      },
      { queryParams: { updateMask: "notification.sendEmail.callbackUri" } },
    );
  } catch (error) {
    if (!error.message.includes("EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED"))
      throw error;
    console.log(
      "Using Firebase's built-in email action pages; continue links return users to GameReviews.",
    );
  }
  const sdk = await apps.getAppConfig(app.appId, apps.AppPlatform.WEB);
  if (!sdk.apiKey || sdk.projectId !== project)
    throw new Error(
      "The returned Firebase web configuration did not match this project.",
    );
  fs.writeFileSync(
    ".local/firebase.env",
    `FIREBASE_PROJECT_ID=${project}\nFIREBASE_WEB_API_KEY=${sdk.apiKey}\n`,
  );
  const worker = parse(fs.readFileSync("wrangler.jsonc", "utf8"));
  worker.vars.FIREBASE_PROJECT_ID = project;
  fs.writeFileSync("wrangler.jsonc", JSON.stringify(worker, null, 2) + "\n");
  cli("wrangler", ["secret", "put", "FIREBASE_WEB_API_KEY"], sdk.apiKey + "\n");
  console.log(
    "Firebase configuration saved privately and connected to the Worker. Run npm run deploy to activate the project ID.",
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
