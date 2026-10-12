#!/usr/bin/env node
import { existsSync, mkdirSync, createWriteStream } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execSync } from "node:child_process";

const ROOT = join(process.cwd(), "public", "CharacterPack");
const ZIP_URL =
  "https://github.com/keganacummings-source/TURBZ2/raw/main/Female_Human_Main_Character.zip";

function hasBase() {
  return existsSync(join(ROOT, "01_Character_Base", "human_female.png"));
}

function buildCatalog() {
  execSync("python3 scripts/build-character-catalog.py", { stdio: "inherit" });
}

async function main() {
  mkdirSync(ROOT, { recursive: true });
  if (hasBase()) {
    console.log("[character-pack] already present");
    if (!existsSync(join(ROOT, "catalog.json"))) buildCatalog();
    return;
  }
  console.log("[character-pack] downloading…");
  const res = await fetch(ZIP_URL);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const zipPath = join(process.cwd(), ".character-pack.zip");
  await pipeline(Readable.fromWeb(res.body), createWriteStream(zipPath));
  const extractTo = join(process.cwd(), "public");
  execSync(`unzip -qo "${zipPath}" -d "${extractTo}"`, { stdio: "inherit" });
  const nested = join(extractTo, "Female_Human_Main_Character");
  if (existsSync(nested)) {
    execSync(`cp -a "${nested}/." "${ROOT}/" && rm -rf "${nested}"`, { stdio: "inherit" });
  }
  buildCatalog();
  console.log("[character-pack] ready");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
