/** Detect transient PostgreSQL / pool errors (Neon idle disconnect, network blips). */
export function isTransientDbError(err: unknown): boolean {
  const candidates: unknown[] = [err];
  if (err && typeof err === "object" && "cause" in err) {
    candidates.push((err as { cause?: unknown }).cause);
  }

  for (const e of candidates) {
    if (!e || typeof e !== "object") continue;
    const code = (e as { code?: string }).code;
    const message = String((e as { message?: string }).message ?? "");
    if (
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "ECONNREFUSED" ||
      code === "57P01" ||
      /connection terminated unexpectedly/i.test(message) ||
      /Connection terminated/i.test(message)
    ) {
      return true;
    }
  }
  return false;
}

export async function withDbRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries && isTransientDbError(err)) {
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
