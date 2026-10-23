import Link from "next/link";
import { candidateStatusLabel, recommendationLabel } from "@/lib/scoring";

export type CandidateRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: Date;
  attempts: { overallScore: number | null; recommendation: string | null }[];
  decisions: { outcome: string }[];
};

export function CandidateTable({ candidates }: { candidates: CandidateRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-staff-line">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-staff-line text-xs uppercase tracking-[0.14em] text-staff-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">System view</th>
            <th className="px-4 py-3 font-medium">Decision</th>
            <th className="px-4 py-3 font-medium">Opened</th>
          </tr>
        </thead>
        <tbody>
          {candidates.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-staff-muted" colSpan={6}>
                No candidates match this view.
              </td>
            </tr>
          ) : (
            candidates.map((candidate) => {
              const attempt = candidate.attempts[0];
              const decision = candidate.decisions[0];
              return (
                <tr key={candidate.id} className="border-b border-staff-line last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      className="text-staff-strong hover:underline"
                      href={`/console/candidates/${candidate.id}`}
                    >
                      {candidate.name}
                    </Link>
                    <p className="text-xs text-staff-muted">{candidate.email}</p>
                  </td>
                  <td className="px-4 py-3 text-staff-body">
                    {candidateStatusLabel(candidate.status)}
                  </td>
                  <td className="px-4 py-3">
                    {attempt?.overallScore == null ? "—" : `${attempt.overallScore}`}
                  </td>
                  <td className="px-4 py-3">
                    {attempt?.recommendation
                      ? recommendationLabel(attempt.recommendation)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {decision ? recommendationLabel(decision.outcome) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="text-staff-accent hover:underline"
                      href={`/console/candidates/${candidate.id}`}
                    >
                      Open record
                    </Link>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
