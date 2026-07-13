export interface ExplanationData {
  readonly summary: string;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly risks: readonly string[];
  readonly opportunities: readonly string[];
  readonly recommendation: string;
}
