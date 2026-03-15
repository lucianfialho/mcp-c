import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCacheDir(): string {
  const xdg = process.env["XDG_CACHE_HOME"];
  return join(xdg ?? join(homedir(), ".cache"), "spec2cli", "specs");
}

function getCachePath(url: string): string {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
  return join(getCacheDir(), `${hash}.spec`);
}

export async function getCachedSpec(url: string): Promise<string | null> {
  const path = getCachePath(url);
  try {
    const info = await stat(path);
    if (Date.now() - info.mtimeMs > CACHE_TTL) {
      return null; // expired
    }
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

export async function cacheSpec(url: string, content: string): Promise<void> {
  const dir = getCacheDir();
  await mkdir(dir, { recursive: true });
  await writeFile(getCachePath(url), content, "utf-8");
}
