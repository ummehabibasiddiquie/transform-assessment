export type Recommendation = "STRONG_HIRE" | "HIRE" | "HOLD" | "NO_HIRE";

export function recommendationFromScore(score: number): Recommendation {
  if (score >= 85) return "STRONG_HIRE";
  if (score >= 72) return "HIRE";
  if (score >= 60) return "HOLD";
  return "NO_HIRE";
}

export function recommendationLabel(value: string) {
  switch (value) {
    case "STRONG_HIRE":
      return "Strong Hire";
    case "HIRE":
      return "Hire";
    case "HOLD":
      return "Hold / Further Check";
    case "NO_HIRE":
      return "No Hire";
    default:
      return value;
  }
}

export function weightedScore(
  ratings: { weight: number; score: number }[],
) {
  const overall = ratings.reduce(
    (sum, item) => sum + (item.score / 5) * item.weight,
    0,
  );
  return Math.round(overall * 10) / 10;
}

export function candidateStatusLabel(status: string) {
  switch (status) {
    case "INVITED":
      return "Invited";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Awaiting review";
    case "REVIEWED":
      return "Reviewed";
    case "DECIDED":
      return "Decision recorded";
    default:
      return status;
  }
}
