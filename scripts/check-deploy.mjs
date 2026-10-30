import { readFile } from "node:fs/promises";
import { parse } from "jsonc-parser";
const config = parse(await readFile("wrangler.jsonc", "utf8"));
const failures = [];
if (
  !config.d1_databases?.[0]?.database_id ||
  /^0{8}-/.test(config.d1_databases[0].database_id)
)
  failures.push(
    "Create the Cloudflare D1 database and set its database_id in wrangler.jsonc.",
  );
const project = config.vars?.FIREBASE_PROJECT_ID;
if (
  !project ||
  project === "configure-before-deploy" ||
  project.startsWith("demo-")
)
  failures.push("Set your real Firebase project ID in wrangler.jsonc.");
if (config.vars?.FIREBASE_AUTH_EMULATOR_HOST)
  failures.push(
    "Remove the authentication emulator from production configuration.",
  );
if (failures.length) {
  console.error(failures.join("\n"));
  console.error("See docs/DEPLOYMENT.md. No deployment was attempted.");
  process.exitCode = 1;
} else
  console.log(
    "Production configuration checks passed. Firebase API key and admin IDs must also be set as Worker secrets.",
  );
