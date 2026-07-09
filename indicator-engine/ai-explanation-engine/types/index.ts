export interface AnalysisExplanation {
  readonly executiveSummary: string;
  readonly whyBuy: readonly string[];
  readonly whySell: readonly string[];
  readonly marketSituation: string;
  readonly mainRisks: readonly string[];
  readonly opportunities: readonly string[];
  readonly shortConclusion: string;
  readonly disclaimer: string;
}
