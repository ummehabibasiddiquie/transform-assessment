import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LEARN_EXAMPLES = [
  { id: "s1", text: "Blue ceramic mug, 350ml, dishwasher safe.", label: "CLEAR" },
  { id: "s2", text: "A nice product for everyday use.", label: "UNCLEAR" },
  { id: "s3", text: "Cotton crew-neck T-shirt, size M, navy.", label: "CLEAR" },
  { id: "s4", text: "Item as discussed.", label: "UNCLEAR" },
  { id: "s5", text: "Wireless mouse, USB-C receiver, black.", label: "CLEAR" },
  { id: "s6", text: "Good quality and fast delivery.", label: "UNCLEAR" },
];

const LEARN_CLASSIFY = [
  { id: "c1", text: "Stainless steel water bottle, 750ml, leak-proof lid." },
  { id: "c2", text: "Useful thing for the office." },
  { id: "c3", text: "A4 lined notebook, 80 pages, recycled paper." },
  { id: "c4", text: "As per image." },
  { id: "c5", text: "Desk lamp, adjustable arm, warm-white LED." },
  { id: "c6", text: "Premium exclusive lifestyle essential." },
  { id: "c7", text: "HDMI cable, 2 metres, 4K rated." },
  { id: "c8", text: "The one we usually order." },
  { id: "c9", text: "Wool blend scarf, charcoal grey, 180cm." },
  { id: "c10", text: "New arrival. Limited stock." },
];

async function main() {
  if (process.env.SEED_RESET === "true") {
    await prisma.auditEvent.deleteMany();
    await prisma.decision.deleteMany();
    await prisma.interview.deleteMany();
    await prisma.humanEvaluation.deleteMany();
    await prisma.response.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.invite.deleteMany();
    await prisma.task.deleteMany();
    await prisma.assessmentVersion.deleteMany();
    await prisma.assessment.deleteMany();
    await prisma.competency.deleteMany();
    await prisma.roleVersion.deleteMany();
    await prisma.role.deleteMany();
    await prisma.candidate.deleteMany();
    await prisma.user.deleteMany();
  }

  const passwordHash = await bcrypt.hash("transform123", 10);
  const staff = [
    { name: "Aisha Rahman", email: "ivan.p@example.net", role: "ADMIN" },
    { name: "Neel Joshi", email: "zara.a@example.net", role: "DESIGNER" },
    { name: "Meera Kapoor", email: "ivan.p@example.net", role: "EVALUATOR" },
    { name: "Arjun Desai", email: "maria.s@example.com", role: "HIRING_MANAGER" },
  ];

  for (const person of staff) {
    await prisma.user.upsert({
      where: { email: person.email },
      update: { name: person.name, role: person.role, active: true },
      create: { ...person, passwordHash },
    });
  }

  if ((await prisma.assessment.count()) > 0) {
    console.log("Staff accounts ready. Assessment already exists; skipping content seed.");
    console.log("Password for new staff accounts: transform123");
    return;
  }

  const role = await prisma.role.create({
    data: {
      name: "Operations Executive",
      purpose:
        "A digitally fluent, highly adaptable execution generalist who can understand unfamiliar tasks, learn what is required, use AI and available tools intelligently, validate work, communicate internally and continuously improve the process.",
      status: "ACTIVE",
    },
  });

  const roleVersion = await prisma.roleVersion.create({
    data: {
      roleId: role.id,
      version: 1,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  await prisma.competency.createMany({
    data: [
      {
        roleVersionId: roleVersion.id,
        name: "Adaptability",
        definition:
          "Learns unfamiliar work and adjusts effectively when the task or requirement changes.",
        weight: 25,
        sortOrder: 1,
        exceptional:
          "Quickly understands unfamiliar task; revises approach confidently when requirements change; explains assumptions.",
        acceptable:
          "Learns task and adjusts when prompted; some gaps in re-evaluation.",
        poor: "Freezes, guesses or continues with obsolete approach.",
      },
      {
        roleVersionId: roleVersion.id,
        name: "Problem Solving",
        definition:
          "Breaks down problems, investigates causes, tries reasonable approaches and moves toward resolution.",
        weight: 25,
        sortOrder: 2,
        exceptional:
          "Breaks problem down, tests causes, prioritises checks and follows through.",
        acceptable:
          "Identifies reasonable causes and actions but misses depth or prioritisation.",
        poor: "Jumps to conclusions, waits for answer or gives up quickly.",
      },
      {
        roleVersionId: roleVersion.id,
        name: "Critical Thinking",
        definition:
          "Separates facts from assumptions, judges evidence, verifies information and identifies uncertainty.",
        weight: 20,
        sortOrder: 3,
        exceptional:
          "Separates facts/hypotheses, verifies evidence, recognises uncertainty and contradictions.",
        acceptable:
          "Generally distinguishes evidence from assumptions; some verification gaps.",
        poor: "Copies/guesses, treats claims as facts or ignores contradictions.",
      },
      {
        roleVersionId: roleVersion.id,
        name: "Communication",
        definition:
          "Communicates internally with useful status, issue, action and escalation context.",
        weight: 20,
        sortOrder: 4,
        exceptional:
          "Clear, concise internal status with issue, impact, action and escalation need.",
        acceptable:
          "Communicates understandable status but misses some useful context.",
        poor: "Vague, blame-oriented, silent when blocked or unclear.",
      },
      {
        roleVersionId: roleVersion.id,
        name: "Hunger / Drive",
        definition:
          "Shows persistence, ownership, initiative and willingness to improve rather than giving up or waiting.",
        weight: 10,
        sortOrder: 5,
        exceptional:
          "Persists through difficulty, tries sensible alternatives, verifies and improves process.",
        acceptable:
          "Completes task with reasonable effort; limited initiative.",
        poor: "Gives up quickly, repeatedly waits for instructions or submits unchecked work.",
      },
    ],
  });

  const assessment = await prisma.assessment.create({
    data: {
      roleVersionId: roleVersion.id,
      name: "Operations Executive — Work Simulation",
      durationMin: 90,
      status: "PUBLISHED",
    },
  });

  const assessmentVersion = await prisma.assessmentVersion.create({
    data: {
      assessmentId: assessment.id,
      version: 1,
      status: "PUBLISHED",
      publishedAt: new Date(),
      instructions:
        "This is a practical work simulation, not a traditional exam. Some tasks may be unfamiliar to you. That is intentional. You may use search, AI and other available resources unless a task says otherwise. We are interested in how you understand the problem, what you try, how you verify your work, how you respond when something changes, and how you communicate when you are stuck. You do not need to know everything before you start.",
      aiPolicy:
        "Search, AI and other tools are allowed. Treat them as working resources. You must still verify important claims. Record briefly how you used tools when asked.",
    },
  });

  await prisma.task.createMany({
    data: [
      {
        assessmentVersionId: assessmentVersion.id,
        sequence: 1,
        family: "A",
        title: "Learn a new classification task",
        timeLimitMin: 20,
        responseType: "STRUCTURED",
        aiAllowed: true,
        evidenceNotes:
          "Learning speed, assumption awareness, willingness to inspect examples, avoidance of blind guessing.",
        instructions:
          "You are given a new classification task. Some examples are labelled CLEAR and some are labelled UNCLEAR. Study the examples and infer the rule. Then classify the new examples. For each uncertain example, explain what makes it uncertain.",
        referenceMaterial: JSON.stringify({
          labelled: LEARN_EXAMPLES,
          classify: LEARN_CLASSIFY,
        }),
      },
      {
        assessmentVersionId: assessmentVersion.id,
        sequence: 2,
        family: "P",
        title: "Investigate a performance problem",
        timeLimitMin: 25,
        responseType: "STRUCTURED",
        aiAllowed: true,
        evidenceNotes:
          "Candidate must not automatically treat the slowest person as the root cause.",
        instructions:
          "A team is expected to complete 20 records per hour. Yesterday the reported rates were: Asha — 20/hour; Ravi — 15/hour; Neha — 21.67/hour; Vikram — 20/hour. You have been told that the team may have a productivity problem. What can you conclude from the information above? What can you not conclude? List possible causes and explain what you would check first.",
        referenceMaterial: JSON.stringify({
          targetPerHour: 20,
          people: [
            { name: "Asha", rate: 20 },
            { name: "Ravi", rate: 15 },
            { name: "Neha", rate: 21.67 },
            { name: "Vikram", rate: 20 },
          ],
        }),
      },
      {
        assessmentVersionId: assessmentVersion.id,
        sequence: 3,
        family: "R",
        title: "Research, judge and verify",
        timeLimitMin: 25,
        responseType: "STRUCTURED",
        aiAllowed: true,
        evidenceNotes:
          "Reward verification and honest uncertainty. Do not invent unverifiable details.",
        instructions:
          "Find three Indian companies that manufacture or are developing autonomous industrial robots. For each company provide: company name, official source, second source, why it qualifies, evidence of the relevant product/development, and any uncertainty. Also provide one result you rejected and explain why. Briefly record how you used search and/or AI.",
        referenceMaterial: "",
      },
      {
        assessmentVersionId: assessmentVersion.id,
        sequence: 4,
        family: "C",
        title: "Requirement change",
        timeLimitMin: 15,
        responseType: "STRUCTURED",
        aiAllowed: true,
        evidenceNotes: "Required behaviour: re-evaluation rather than defending the original answer.",
        instructions:
          "CLEAR now means the example contains both: (1) a specific product/object and (2) useful detail about it. If either is missing, it is UNCLEAR. Revisit your Task 1 answers. Explain which answers change and why.",
        referenceMaterial: "",
      },
      {
        assessmentVersionId: assessmentVersion.id,
        sequence: 5,
        family: "M",
        title: "Internal communication",
        timeLimitMin: 15,
        responseType: "STRUCTURED",
        aiAllowed: true,
        evidenceNotes:
          "Look for status, specific issue, what was tried, impact, next action, useful escalation without panic or blame. Score usefulness, not grammar.",
        instructions:
          "You have completed 72 out of 100 records. The remaining records contain an error. You have already tried two fixes, but the problem remains. You have 25 minutes left and your lead has not yet asked for an update. Write the message you would send internally. Then state what you would do next and what information you would collect before escalating further.",
        referenceMaterial: "",
      },
      {
        assessmentVersionId: assessmentVersion.id,
        sequence: 6,
        family: "I",
        title: "Improve the work",
        timeLimitMin: 20,
        responseType: "STRUCTURED",
        aiAllowed: true,
        evidenceNotes:
          "Score process decomposition, standardisation, appropriate AI/automation, manual verification, quality controls, metrics, and speed-versus-accuracy trade-off.",
        instructions:
          "You currently research around 100 companies per week. Your goal is to reduce time and errors without sacrificing reliability. Design a better process. You may use AI and automation. Explain what you would standardise, what you would automate, what must still be manually verified, what quality controls you would use and which metrics you would track.",
        referenceMaterial: "",
      },
    ],
  });

  console.log("Seed complete. Password for all staff: transform123");
  console.log("Admin:           ivan.p@example.net");
  console.log("Designer:        zara.a@example.net");
  console.log("Evaluator:       ivan.p@example.net");
  console.log("Hiring manager:  maria.s@example.com");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
