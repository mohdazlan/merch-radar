import { z } from "zod";

/** §7 risk narrative — Claude explains; Claude does not score. */
export const RiskNarrativeSchema = z.object({
  why: z.string().min(1).max(1000),
  risks: z.array(z.string().min(1).max(400)).min(1).max(4),
  counterplay: z.string().min(1).max(600),
  watch: z.string().min(1).max(400),
});
export type RiskNarrative = z.infer<typeof RiskNarrativeSchema>;

/** §9 manifest triage — batch-level flags only, no numbers. */
export const ManifestTriageSchema = z.object({
  flags: z
    .array(
      z.object({
        item: z.string().min(1).max(200),
        flag: z.string().min(1).max(300),
        kind: z.enum(["counterfeit", "restricted", "seasonal", "gated", "other"]),
      }),
    )
    .max(25),
});
export type ManifestTriage = z.infer<typeof ManifestTriageSchema>;
