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
    <div className="overflow-x-auto rounded-lg border border-[#2a332a]">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-[#2a332a] text-xs uppercase tracking-[0.14em] text-[#9aa392]">
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
              <td className="px-4 py-8 text-[#9aa392]" colSpan={6}>
                No candidates match this view.
              </td>
            </tr>
          ) : (
            candidates.map((candidate) => {
              const attempt = candidate.attempts[0];
              const decision = candidate.decisions[0];
              return (
                <tr key={candidate.id} className="border-b border-[#2a332a] last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      className="text-[#f3efe6] hover:underline"
                      href={`/console/candidates/${candidate.id}`}
                    >
                      {candidate.name}
                    </Link>
                    <p className="text-xs text-[#9aa392]">{candidate.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[#c8cdb8]">
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
                      className="text-[#d9784a] hover:underline"
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
