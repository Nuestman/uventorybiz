import { describe, expect, it } from "vitest";
import { pivotTriageAcuityOverTime } from "./triage-acuity-pivot";

describe("pivotTriageAcuityOverTime", () => {
  it("accumulates counts per period and buckets unknown acuity as other", () => {
    const rows = [
      { period: "2026-02-01", acuity: "red", cnt: 2 },
      { period: "2026-02-01", acuity: "green", cnt: 1 },
      { period: "2026-02-01", acuity: "purple", cnt: 3 },
      { period: "2026-02-08", acuity: "yellow", cnt: 4 },
    ];
    const out = pivotTriageAcuityOverTime(rows);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      period: "2026-02-01",
      red: 2,
      green: 1,
      other: 3,
      orange: 0,
      yellow: 0,
    });
    expect(out[1]).toMatchObject({ period: "2026-02-08", yellow: 4 });
  });
});
