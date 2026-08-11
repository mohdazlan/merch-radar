import { describe, expect, it } from "vitest";
import {
  computeChargeableWeightGrams,
  computeVolumetricWeightGrams,
  VOLUMETRIC_DIVISOR_EXPRESS,
  VOLUMETRIC_DIVISOR_STANDARD,
} from "@/lib/shipping/volumetric";

describe("computeVolumetricWeightGrams", () => {
  it("matches EasyParcel's own worked example: 30×30×40cm / 5000 = 7.2kg", () => {
    expect(computeVolumetricWeightGrams(30, 30, 40)).toBe(7200);
  });

  it("uses the standard 5000 divisor by default", () => {
    expect(computeVolumetricWeightGrams(20, 20, 20)).toBe(
      computeVolumetricWeightGrams(20, 20, 20, VOLUMETRIC_DIVISOR_STANDARD),
    );
  });

  it("produces a smaller volumetric weight under the express (6000) divisor", () => {
    const standard = computeVolumetricWeightGrams(30, 30, 40, VOLUMETRIC_DIVISOR_STANDARD);
    const express = computeVolumetricWeightGrams(30, 30, 40, VOLUMETRIC_DIVISOR_EXPRESS);
    expect(express).toBeLessThan(standard);
  });

  it("returns 0 for any non-positive dimension instead of a nonsense negative weight", () => {
    expect(computeVolumetricWeightGrams(0, 30, 40)).toBe(0);
    expect(computeVolumetricWeightGrams(30, -5, 40)).toBe(0);
    expect(computeVolumetricWeightGrams(30, 30, 0)).toBe(0);
  });

  it("returns 0 for an invalid divisor rather than dividing by zero", () => {
    expect(computeVolumetricWeightGrams(30, 30, 40, 0)).toBe(0);
    expect(computeVolumetricWeightGrams(30, 30, 40, -100)).toBe(0);
  });

  it("rounds to the nearest gram", () => {
    // 11 x 11 x 11 = 1331 cm³ / 5000 = 0.2662 kg = 266.2g -> 266g
    expect(computeVolumetricWeightGrams(11, 11, 11)).toBe(266);
  });
});

describe("computeChargeableWeightGrams — the number that surprises sellers", () => {
  it("picks volumetric weight when the parcel is light but bulky", () => {
    // the exact "oven glove" shape: 200g actual, but a bulky box
    const volumetric = computeVolumetricWeightGrams(35, 25, 15); // 2625g
    expect(computeChargeableWeightGrams(200, volumetric)).toBe(volumetric);
  });

  it("picks actual weight when the parcel is dense and compact", () => {
    const volumetric = computeVolumetricWeightGrams(10, 10, 10); // 200g
    expect(computeChargeableWeightGrams(1500, volumetric)).toBe(1500);
  });

  it("falls back to actual weight when no dimensions were given", () => {
    expect(computeChargeableWeightGrams(450, null)).toBe(450);
  });

  it("never returns a negative chargeable weight", () => {
    expect(computeChargeableWeightGrams(-50, null)).toBe(0);
  });

  it("is exactly the max of the two inputs — no fudge factor", () => {
    expect(computeChargeableWeightGrams(1000, 999)).toBe(1000);
    expect(computeChargeableWeightGrams(999, 1000)).toBe(1000);
  });
});
