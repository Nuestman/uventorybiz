import { readFileSync } from "fs";
import path from "path";

let cachedVersion: string | null = null;

export function getAppVersion(): string {
  if (cachedVersion) return cachedVersion;
  const pkgPath = path.join(process.cwd(), "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
  cachedVersion = typeof pkg.version === "string" ? pkg.version : "0.0.0";
  return cachedVersion;
}
