/**
 * Pull V2 witch + armor 32px sheets from the V2 repo WIP.zip into public/V2Char/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ROOT = join(process.cwd(), "public", "V2Char");
const WITCH = join(ROOT, "witch_sm.png");
const ARMOR = join(ROOT, "armor_sm.png");

async function main() {
  mkdirSync(ROOT, { recursive: true });
  if (existsSync(WITCH) && existsSync(ARMOR)) {
    console.log("[v2-char] sheets present");
    return;
  }
  const url = "https://github.com/keganacummings-source/V2/raw/main/WIP.zip";
  console.log("[v2-char] downloading V2 WIP.zip…");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`V2 zip ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const zipPath = join(process.cwd(), ".cache-v2.zip");
  writeFileSync(zipPath, buf);
  const out = join(process.cwd(), ".cache-v2");
  mkdirSync(out, { recursive: true });
  try {
    execSync(`unzip -qo "${zipPath}" -d "${out}"`, { stdio: "inherit" });
  } catch {
    execSync(`python3 -c "import zipfile; zipfile.ZipFile('${zipPath}').extractall('${out}')"`);
  }
  const base = join(out, "turbz", "assets", "characters");
  const w = join(base, "character_spritesheet_v5b_witch_sm.png");
  const a = join(base, "armor_v2_spritesheet_sm.png");
  if (!existsSync(w) || !existsSync(a)) throw new Error("V2 sheets missing inside zip");
  writeFileSync(WITCH, readFileSync(w));
  writeFileSync(ARMOR, readFileSync(a));
  console.log("[v2-char] ready");
}

main().catch((e) => {
  console.error("[v2-char]", e);
  process.exit(1);
});
