"use client";

import { useState } from "react";
import { ResponseView } from "@/components/ResponseView";
import { CollapsibleSection } from "@/components/CollapsibleList";

type TaskItem = {
  id: string;
  sequence: number;
  module: string;
  family: string;
  title: string;
  instructions: string;
  answerKey: string;
  contentJson: string | null;
  resourceLogJson: string | null;
};

const SECTIONS = [
  { module: "COMMON_APTITUDE", label: "Aptitude and reasoning" },
  { module: "COMMON_PROBLEM_SOLVING", label: "Problem solving" },
  { module: "ROLE", label: "Role tasks" },
];

export function SubmittedWorkPanel({ tasks }: { tasks: TaskItem[] }) {
  const sections = [
    ...SECTIONS.map((section) => ({
      ...section,
      tasks: tasks.filter((task) => task.module === section.module),
    })),
    {
      module: "OTHER",
      label: "Other tasks",
      tasks: tasks.filter((task) => !SECTIONS.some((section) => section.module === task.module)),
    },
  ].filter((section) => section.tasks.length > 0);

  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [openTasks, setOpenTasks] = useState<Set<string>>(new Set());

  function toggleSection(module: string) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  function toggleTask(id: string) {
    setOpenTasks((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAll() {
    setOpenSections(new Set(sections.map((section) => section.module)));
  }

  function closeAll() {
    setOpenSections(new Set());
    setOpenTasks(new Set());
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-staff-strong">Submitted work</h2>
          <p className="mt-2 text-sm text-staff-muted">
            Closed by default. Open a section, then open a task when you need the detail.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <button type="button" className="text-staff-accent" onClick={openAll}>
            Open sections
          </button>
          <button type="button" className="text-staff-muted" onClick={closeAll}>
            Close all
          </button>
        </div>
      </div>

      {sections.map((section) => {
        const open = openSections.has(section.module);
        return (
          <CollapsibleSection
            key={section.module}
            title={section.label}
            countLabel={`${section.tasks.length} tasks`}
            open={open}
            onToggle={() => toggleSection(section.module)}
          >
            <div className="space-y-3">
              {section.tasks.map((task) => {
                const taskOpen = openTasks.has(task.id);
                return (
                  <article key={task.id} className="rounded-md border border-staff-line">
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                      aria-expanded={taskOpen}
                    >
                      <span>
                        <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
                          Task {task.sequence}
                        </span>
                        <span className="mt-1 block text-staff-strong">{task.title}</span>
                      </span>
                      <span className="shrink-0 text-xs uppercase tracking-[0.14em] text-staff-accent">
                        {taskOpen ? "Close ▴" : "Open ▾"}
                      </span>
                    </button>
                    {taskOpen ? (
                      <div className="space-y-3 border-t border-staff-line px-4 py-4">
                        {task.instructions ? (
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-staff-muted font-medium">
                              Question
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-staff-body">
                              {task.instructions}
                            </p>
                          </div>
                        ) : null}
                        {task.answerKey ? (
                          <div className="rounded border border-staff-accent/30 bg-staff-accent/5 p-2.5">
                            <p className="text-xs uppercase tracking-[0.14em] text-staff-accent font-medium">
                              Evaluator Key (Answer Key)
                            </p>
                            <p className="mt-1 text-sm text-staff-accent">{task.answerKey}</p>
                          </div>
                        ) : null}
                        <div className="border-t border-staff-line pt-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-staff-muted font-medium mb-2">
                            Candidate Answer
                          </p>
                          {task.contentJson ? (
                            <ResponseView
                              family={task.family}
                              contentJson={task.contentJson}
                              resourceLogJson={task.resourceLogJson ?? "{}"}
                            />
                          ) : (
                            <p className="text-sm text-staff-muted">No response saved.</p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </CollapsibleSection>
        );
      })}
    </section>
  );
}
