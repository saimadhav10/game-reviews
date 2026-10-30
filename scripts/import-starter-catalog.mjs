import { mkdir, readFile, writeFile } from "node:fs/promises";

// Public Steam Store metadata only. Community ratings/reviews are never imported.
const titles = [
  [
    "elden-ring",
    1245620,
    ["PC", "PS5", "PS4", "Xbox Series", "Xbox One"],
    ["Action RPG"],
  ],
  [
    "metaphor-refantazio",
    2679460,
    ["PC", "PS5", "PS4", "Xbox Series"],
    ["RPG"],
  ],
  [
    "balatro",
    2379780,
    ["PC", "PS5", "PS4", "Xbox Series", "Xbox One", "Switch", "Android", "iOS"],
    ["Roguelike", "Strategy"],
  ],
  [
    "cyberpunk-2077",
    1091500,
    ["PC", "PS5", "PS4", "Xbox Series", "Xbox One"],
    ["Action RPG"],
  ],
  [
    "hades",
    1145360,
    ["PC", "Mac", "PS5", "PS4", "Xbox Series", "Xbox One", "Switch"],
    ["Roguelike", "Action"],
  ],
  [
    "stardew-valley",
    413150,
    ["PC", "Mac", "Linux", "PS4", "Xbox One", "Switch", "Android", "iOS"],
    ["Simulation", "RPG"],
  ],
  [
    "hollow-knight",
    367520,
    ["PC", "Mac", "Linux", "PS4", "Xbox One", "Switch"],
    ["Metroidvania", "Platformer"],
  ],
  [
    "celeste",
    504230,
    ["PC", "Mac", "Linux", "PS4", "Xbox One", "Switch"],
    ["Platformer"],
  ],
  [
    "dead-cells",
    588650,
    ["PC", "Mac", "Linux", "PS4", "Xbox One", "Switch", "Android", "iOS"],
    ["Roguelike", "Action"],
  ],
  [
    "terraria",
    105600,
    ["PC", "Mac", "Linux", "PS4", "Xbox One", "Switch", "Android", "iOS"],
    ["Sandbox", "Adventure"],
  ],
  [
    "portal-2",
    620,
    ["PC", "Mac", "Linux", "PS3", "Xbox 360", "Switch"],
    ["Puzzle"],
  ],
  [
    "baldurs-gate-3",
    1086940,
    ["PC", "Mac", "PS5", "Xbox Series"],
    ["RPG", "Strategy"],
  ],
  [
    "vampire-survivors",
    1794680,
    [
      "PC",
      "Mac",
      "PS5",
      "PS4",
      "Xbox Series",
      "Xbox One",
      "Switch",
      "Android",
      "iOS",
    ],
    ["Roguelike", "Action"],
  ],
  [
    "slay-the-spire",
    646570,
    ["PC", "Mac", "Linux", "PS4", "Xbox One", "Switch", "Android", "iOS"],
    ["Roguelike", "Strategy"],
  ],
];
await mkdir("public/images", { recursive: true });
await mkdir(".local", { recursive: true });
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const inserts = [
  "-- Starter catalog from public Steam Store metadata. No ratings, users, reviews, or votes.",
];
for (const [index, [slug, appid, platforms, genres]] of titles.entries()) {
  const cacheFile = `.local/steam-${appid}.json`;
  let payload;
  try {
    payload = JSON.parse(await readFile(cacheFile, "utf8"));
  } catch {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`,
      { signal: AbortSignal.timeout(30000) },
    );
    if (!response.ok)
      throw new Error(
        `Steam metadata request failed for ${appid}: ${response.status}`,
      );
    payload = await response.json();
    await writeFile(cacheFile, JSON.stringify(payload));
  }
  const game = payload[appid]?.data;
  if (!game) throw new Error(`Missing Steam metadata for ${appid}`);
  // Import game artwork, never screenshots of the reference website UI.
  const asset = await fetch(game.header_image, {
    signal: AbortSignal.timeout(30000),
  });
  if (!asset.ok) throw new Error(`Image request failed for ${slug}`);
  const artwork = Buffer.from(await asset.arrayBuffer());
  await writeFile(`public/images/${slug}.jpg`, artwork);
  await writeFile(`public/images/${slug}-hero.jpg`, artwork);
  const rawDate = Date.parse(`${game.release_date?.date ?? ""} UTC`);
  const release = Number.isFinite(rawDate)
    ? new Date(rawDate).toISOString().slice(0, 10)
    : "";
  const description = game.short_description
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
  const values = [
    slug,
    game.name.replace(/[™®]/g, ""),
    description,
    JSON.stringify(platforms),
    JSON.stringify(genres),
    release,
    game.developers?.join(", ") ?? "",
    game.publishers?.join(", ") ?? "",
    `/images/${slug}-hero.jpg`,
    `/images/${slug}-hero.jpg`,
  ].map(q);
  inserts.push(
    `INSERT OR IGNORE INTO games(id,title,description,platforms,genres,release_date,developer,publisher,cover_url,hero_url,steam_app_id,created_at) VALUES(${values.join(",")},${appid},${Date.now() - index * 1000});`,
  );
  console.log(`Prepared ${game.name}`);
}
await writeFile("db/seed.sql", `${inserts.join("\n")}\n`);
console.log("Catalog and local images prepared. Apply with npm run db:seed.");
