import { describe, expect, it } from "vitest";
import { classifyCompetitionPressure } from "@/lib/shared/competition";

describe("classifyCompetitionPressure", () => {
  it("classifies zero listings as NONE", () => {
    expect(classifyCompetitionPressure(0)).toBe("NONE");
  });

  it("classifies negative counts as NONE (defensive)", () => {
    expect(classifyCompetitionPressure(-1)).toBe("NONE");
  });

  it("classifies 1-4 listings as THIN", () => {
    expect(classifyCompetitionPressure(1)).toBe("THIN");
    expect(classifyCompetitionPressure(4)).toBe("THIN");
  });

  it("classifies 5-39 listings as HEALTHY", () => {
    expect(classifyCompetitionPressure(5)).toBe("HEALTHY");
    expect(classifyCompetitionPressure(39)).toBe("HEALTHY");
  });

  it("classifies 40+ listings as SATURATED", () => {
    expect(classifyCompetitionPressure(40)).toBe("SATURATED");
    expect(classifyCompetitionPressure(5000)).toBe("SATURATED");
  });
});
