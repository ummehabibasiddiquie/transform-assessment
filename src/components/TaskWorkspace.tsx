"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { parseJson } from "@/lib/json";
import { permissionText } from "@/lib/question-shape";
import type { PracticalTaskView } from "@/lib/practical-task";
import { ResourceFields, TaskForm, type ResourceLog } from "@/components/TaskForm";

type Task = {
  id: string;
  sequence: number;
  family: string;
  title: string;
  instructions: string;
  referenceMaterial: string;
  timeLimitMin: number | null;
  aiAllowed: boolean;
  searchAllowed?: boolean;
  responseType?: string;
  optionsJson?: string;
  module?: string;
};

export function TaskWorkspace({
  token,
  task,
  taskCount,
  initialContent,
  initialLog,
  previousLearnJson,
  practical,
}: {
  token: string;
  task: Task;
  taskCount: number;
  initialContent: string;
  initialLog: string;
  previousLearnJson?: string | null;
  practical?: PracticalTaskView | null;
}) {
  const [content, setContent] = useState<Record<string, unknown>>(
    parseJson(initialContent, {}),
  );
  const [log, setLog] = useState<ResourceLog>(
    parseJson(initialLog, { tools: "", verified: "" }),
  );
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState(
    initialContent !== "{}" ? "Saved" : "Answers save when you type.",
  );
  const previousLearn = useMemo(
    () => (previousLearnJson ? parseJson<Record<string, unknown>>(previousLearnJson, {}) : null),
    [previousLearnJson],
  );

  const updateContent: Dispatch<SetStateAction<Record<string, unknown>>> = (value) => {
    setDirty(true);
    setContent(value);
  };
  const updateLog: Dispatch<SetStateAction<ResourceLog>> = (value) => {
    setDirty(true);
    setLog(value);
  };

  useEffect(() => {
    if (!dirty) return;
    const handle = window.setTimeout(async () => {
      setStatus("Saving…");
      const response = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          sequence: task.sequence,
          content,
          resourceLog: log,
        }),
      });
      setStatus(response.ok ? "Saved" : "Could not save — check your connection and try again.");
    }, 800);
    return () => window.clearTimeout(handle);
  }, [content, dirty, log, task.id, task.sequence]);

  const next =
    task.sequence < taskCount
      ? `/a/${token}/t/${task.sequence + 1}`
      : `/a/${token}/review`;
  const previous = task.sequence > 1 ? `/a/${token}/t/${task.sequence - 1}` : `/a/${token}`;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:py-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
            {partLabel(task) ? `${partLabel(task)} · ` : ""}
            Task {task.sequence} of {taskCount}
            {task.timeLimitMin ? ` · about ${task.timeLimitMin} min` : ""}
          </p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight">{task.title}</h1>
        </div>
        <p className="text-xs text-ink-soft">{status}</p>
      </div>
      <p className="mt-4 rounded-md border border-line bg-paper-2 px-4 py-3 text-sm leading-6">
        {permissionText(task.aiAllowed, task.searchAllowed ?? task.aiAllowed)}
      </p>
      {practical ? null : (
        <p className="mt-6 whitespace-pre-wrap text-base leading-7">{task.instructions}</p>
      )}
      <div className="mt-8">
        <TaskForm
          task={task}
          content={content}
          setContent={updateContent}
          previousLearn={previousLearn}
          practical={practical}
        />
        {task.aiAllowed || task.searchAllowed ? (
          <ResourceFields log={log} setLog={updateLog} />
        ) : null}
      </div>
      <div className="mt-10 flex items-center justify-between gap-3">
        <Link href={previous} className="text-sm" style={{ color: "var(--ink-soft)" }}>
          Back
        </Link>
        <Link
          href={next}
          className="btn-primary rounded-md px-4 py-2.5 text-sm font-medium"
        >
          {task.sequence < taskCount ? "Continue" : "Review and submit"}
        </Link>
      </div>
    </div>
  );
}

function partLabel(task: { module?: string; family: string }) {
  if (task.module === "COMMON_APTITUDE") return "Part 1 · Aptitude";
  if (task.module === "COMMON_PROBLEM_SOLVING") return "Part 2 · Problem solving";
  if (task.module === "ROLE" && (task.family === "Q" || task.family === "CUSTOM")) {
    return "Part 3 · Role task";
  }
  return "";
}
