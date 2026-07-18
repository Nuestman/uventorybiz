import { describe, expect, it } from "vitest";
import { isMedicalVisitTransferDisposition, isReturnToWorkDisposition } from "./disposition-transfer";

describe("isMedicalVisitTransferDisposition", () => {
  it("returns true for canonical hospital transfers", () => {
    expect(isMedicalVisitTransferDisposition("transferred_to_hospital")).toBe(true);
    expect(isMedicalVisitTransferDisposition("transferred_to_hospital_other")).toBe(true);
  });

  it("returns true when substring contains transfer (legacy)", () => {
    expect(isMedicalVisitTransferDisposition("Transferred_to_facility")).toBe(true);
  });

  it("returns false for non-transfer", () => {
    expect(isMedicalVisitTransferDisposition("return_to_work")).toBe(false);
    expect(isMedicalVisitTransferDisposition(null)).toBe(false);
    expect(isMedicalVisitTransferDisposition("")).toBe(false);
  });
});

describe("isReturnToWorkDisposition", () => {
  it("returns true for canonical return to work", () => {
    expect(isReturnToWorkDisposition("return_to_work")).toBe(true);
    expect(isReturnToWorkDisposition(" Return_To_Work ")).toBe(true);
  });

  it("returns false for transfers and empty", () => {
    expect(isReturnToWorkDisposition("transferred_to_hospital")).toBe(false);
    expect(isReturnToWorkDisposition(null)).toBe(false);
  });
});
