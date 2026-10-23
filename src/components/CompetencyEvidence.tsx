import { ResponseView } from "@/components/ResponseView";
import {
  competencyCodes,
  tasksForCompetency,
  type EvidenceKey,
} from "@/lib/competency-evidence";

type Task = {
  id: string;
  sequence: number;
  title: string;
  family: string;
  competencyName: string;
  key: { answerKey: string; rubric: string; evidence: string } | null;
};

type Response = { taskId: string; contentJson: string; resourceLogJson: string };

export function CompetencyEvidence({
  competencyName,
  evidenceKeys,
  tasks,
  responses,
}: {
  competencyName: string;
  evidenceKeys: EvidenceKey[];
  tasks: Task[];
  responses: Response[];
}) {
  const codes = competencyCodes(competencyName);
  const guides = evidenceKeys.filter((key) => codes.includes(key.code));
  const linked = tasksForCompetency(competencyName, tasks);
  if (guides.length === 0 && linked.length === 0) return null;

  return (
    <details className="mt-3 rounded-md border border-staff-line">
      <summary className="cursor-pointer px-3 py-2 text-sm text-staff-accent">
        Evidence to check · {linked.length} {linked.length === 1 ? "task" : "tasks"}
      </summary>
      <div className="space-y-3 border-t border-staff-line px-3 py-3 text-sm">
        {guides.map((guide) => (
          <div key={guide.code} className="text-staff-body">
            <p>
              <span className="text-staff-strong">Look for ({guide.name}):</span> {guide.positive}
            </p>
          </div>
        ))}
        {guides[0]?.negative ? (
          <p className="text-staff-body">
            <span className="text-staff-strong">Watch for:</span> {guides[0].negative}
          </p>
        ) : null}
        {linked.length === 0 ? (
          <p className="text-staff-muted">No task on this paper is tagged for this competency.</p>
        ) : (
          <ul className="space-y-3">
            {linked.map((task) => {
              const response = responses.find((item) => item.taskId === task.id);
              return (
                <li key={task.id} className="rounded-md border border-staff-line p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">
                    Task {task.sequence}
                  </p>
                  <p className="text-staff-strong">{task.title}</p>
                  {task.key?.answerKey ? (
                    <p className="mt-1 text-xs text-staff-accent">Key: {task.key.answerKey}</p>
                  ) : null}
                  <div className="mt-2">
                    {response ? (
                      <ResponseView
                        family={task.family}
                        contentJson={response.contentJson}
                        resourceLogJson={response.resourceLogJson}
                      />
                    ) : (
                      <p className="text-staff-muted">No response saved.</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}
