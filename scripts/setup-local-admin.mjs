import { mkdir, readFile, writeFile } from "node:fs/promises";
const configuration = await readFile(".dev.vars", "utf8");
if (
  !/^FIREBASE_PROJECT_ID=demo-gamereviews\r?$/m.test(configuration) ||
  !/^FIREBASE_AUTH_EMULATOR_HOST=127\.0\.0\.1:9099\r?$/m.test(configuration)
)
  throw new Error(
    "This helper is restricted to the local demo-gamereviews emulator.",
  );
const base = "http://127.0.0.1:9099";
const credentialsPath = ".local/admin.env";
let credentials;
try {
  const existing = await readFile(credentialsPath, "utf8");
  credentials = Object.fromEntries(
    existing
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split("=")),
  );
} catch {
  credentials = {
    EMAIL: "admin@gamereviews.example.test",
    PASSWORD: `Local!${crypto.randomUUID()}`,
  };
}
async function operation(name, body) {
  const response = await fetch(
    `${base}/identitytoolkit.googleapis.com/v1/accounts:${name}?key=local-emulator-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const payload = await response.json();
  if (!response.ok)
    throw new Error(
      payload.error?.message ?? "Local account operation failed.",
    );
  return payload;
}
let account;
try {
  account = await operation("signInWithPassword", {
    email: credentials.EMAIL,
    password: credentials.PASSWORD,
    returnSecureToken: true,
  });
} catch {
  account = await operation("signUp", {
    email: credentials.EMAIL,
    password: credentials.PASSWORD,
    returnSecureToken: true,
  });
}
await operation("sendOobCode", {
  idToken: account.idToken,
  requestType: "VERIFY_EMAIL",
});
const codes = await (
  await fetch(`${base}/emulator/v1/projects/demo-gamereviews/oobCodes`)
).json();
const code = codes.oobCodes
  .filter((item) => item.email === credentials.EMAIL)
  .at(-1);
await operation("update", { oobCode: code.oobCode });
const previousIds = (configuration.match(/^ADMIN_UIDS=(.*)$/m)?.[1] ?? "")
  .trim()
  .split(",")
  .filter(Boolean)
  .filter((id) => id !== credentials.UID);
const ids = [...new Set([...previousIds, account.localId])].join(",");
await writeFile(
  ".dev.vars",
  configuration.replace(/^ADMIN_UIDS=.*$/m, `ADMIN_UIDS=${ids}`),
);
await mkdir(".local", { recursive: true });
await writeFile(
  credentialsPath,
  `EMAIL=${credentials.EMAIL}\nPASSWORD=${credentials.PASSWORD}\nUID=${account.localId}\n`,
);
console.log(
  "A verified local-only administrator is ready. Sign-in details are saved in .local/admin.env (Git-ignored). No production account was created.",
);
