import { existsSync, writeFileSync, mkdirSync } from "node:fs";
mkdirSync(".local", { recursive: true });
if (!existsSync(".dev.vars"))
  writeFileSync(
    ".dev.vars",
    "FIREBASE_PROJECT_ID=demo-gamereviews\nFIREBASE_WEB_API_KEY=local-emulator-key\nFIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099\nADMIN_UIDS=\n",
  );
console.log(
  "Local emulator configuration is ready. Existing environment files were preserved.",
);
