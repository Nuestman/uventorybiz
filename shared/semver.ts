/** Compare semver strings (major.minor.patch). Pre-release segments ignored. */
export function compareSemver(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .split("-")[0]
      .split(".")
      .map((part) => Number.parseInt(part, 10))
      .map((n) => (Number.isFinite(n) ? n : 0));

  const av = parse(a);
  const bv = parse(b);
  const len = Math.max(av.length, bv.length, 3);

  for (let i = 0; i < len; i += 1) {
    const diff = (av[i] ?? 0) - (bv[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export function isSemverGreaterThan(a: string, b: string): boolean {
  return compareSemver(a, b) > 0;
}

export function isSemverLessOrEqual(a: string, b: string): boolean {
  return compareSemver(a, b) <= 0;
}
