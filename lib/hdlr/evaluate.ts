import type { ScoutResult } from "@/lib/scout/types";

export const HDLR_MIN_MONTHLY_SALES = 3;
export const HDLR_MAX_NEW_SELLER_FEEDBACK = 100;
export const HDLR_MIN_COMPETITORS = 3;
export const HDLR_MAX_COMPETITORS = 100;

export type HdlrInputs = {
  soldWindowDays: 30 | 60 | 90;
  veroReviewed: boolean;
  supplierName: string;
  supplierUnitCost: number | null;
};

export type HdlrGate = {
  id: "demand" | "new-seller" | "risk" | "competition" | "supplier";
  label: string;
  status: "PASS" | "FAIL" | "UNVERIFIED";
  evidence: string;
};

export type HdlrEvaluation = {
  verdict: "QUALIFIED" | "REJECT" | "NEEDS EVIDENCE";
  monthlySales: number | null;
  newSellerSales: number;
  competitorCount: number;
  gates: HdlrGate[];
};

/** Deterministic implementation of the academy's HDLR research gates. */
export function evaluateHdlr(
  result: ScoutResult,
  inputs: HdlrInputs,
): HdlrEvaluation {
  const hasSoldEvidence = result.mode === "SOLD" && result.soldDataAvailable;
  const monthlySales = hasSoldEvidence
    ? result.totalMatched / (inputs.soldWindowDays / 30)
    : null;
  const newSellerSales = result.items.filter(
    (item) =>
      item.seller.feedbackScore !== null &&
      item.seller.feedbackScore < HDLR_MAX_NEW_SELLER_FEEDBACK,
  ).length;
  const competitorCount = new Set(
    result.items.map((item) => item.seller.username),
  ).size;
  const flagged = result.items.filter((item) => item.riskFlags.length > 0).length;
  const supplierReady =
    inputs.supplierName.trim().length > 1 &&
    inputs.supplierUnitCost !== null &&
    inputs.supplierUnitCost > 0;

  const gates: HdlrGate[] = [
    {
      id: "demand",
      label: "Demand",
      status: !hasSoldEvidence
        ? "UNVERIFIED"
        : monthlySales !== null && monthlySales > HDLR_MIN_MONTHLY_SALES
          ? "PASS"
          : "FAIL",
      evidence: !hasSoldEvidence
        ? "Active listings are not proof of sales. Marketplace Insights sold data is required."
        : `${result.totalMatched} sold matches across ${inputs.soldWindowDays} days = ${monthlySales?.toFixed(1)} per 30 days; HDLR requires more than ${HDLR_MIN_MONTHLY_SALES}.`,
    },
    {
      id: "new-seller",
      label: "New-seller proof",
      status: !hasSoldEvidence
        ? "UNVERIFIED"
        : newSellerSales > 0
          ? "PASS"
          : "FAIL",
      evidence: !hasSoldEvidence
        ? "Seller feedback is visible, but an active listing does not prove that a new seller made a sale."
        : `${newSellerSales} sold result${newSellerSales === 1 ? "" : "s"} came from sellers below ${HDLR_MAX_NEW_SELLER_FEEDBACK} feedback.`,
    },
    {
      id: "risk",
      label: "Policy and product risk",
      status: flagged > 0 ? "FAIL" : inputs.veroReviewed ? "PASS" : "UNVERIFIED",
      evidence:
        flagged > 0
          ? `${flagged} result${flagged === 1 ? "" : "s"} triggered the disclosed price, seller, or title risk screen.`
          : inputs.veroReviewed
            ? "No automated risk flags; marketer recorded a manual VeRO/IP review. This is a screen, not legal clearance."
            : "No automated risk flags, but VeRO and intellectual-property status still need manual review.",
    },
    {
      id: "competition",
      label: "Competition",
      status:
        competitorCount >= HDLR_MIN_COMPETITORS &&
        competitorCount <= HDLR_MAX_COMPETITORS
          ? "PASS"
          : "FAIL",
      evidence: `${competitorCount} distinct sellers in the evidence set; the disclosed moderate band is ${HDLR_MIN_COMPETITORS}-${HDLR_MAX_COMPETITORS}.`,
    },
    {
      id: "supplier",
      label: "Supplier",
      status: supplierReady ? "PASS" : "UNVERIFIED",
      evidence: supplierReady
        ? `${inputs.supplierName.trim()} recorded at $${inputs.supplierUnitCost?.toFixed(2)} per unit. Margin must still be checked in Sourcing.`
        : "Record a supplier and positive unit cost before qualifying the product.",
    },
  ];

  const hasFailure = gates.some((gate) => gate.status === "FAIL");
  const hasUnknown = gates.some((gate) => gate.status === "UNVERIFIED");
  return {
    verdict: hasFailure ? "REJECT" : hasUnknown ? "NEEDS EVIDENCE" : "QUALIFIED",
    monthlySales,
    newSellerSales,
    competitorCount,
    gates,
  };
}
