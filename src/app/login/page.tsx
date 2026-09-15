import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between px-8 py-10 lg:px-14 lg:py-14">
          <p className="text-xs uppercase tracking-[0.22em] text-ink-soft">
            TRANSFORM
          </p>
          <div className="max-w-lg py-16">
            <p className="font-serif text-4xl leading-tight tracking-tight lg:text-5xl">
              See how someone works, not how they interview.
            </p>
            <p className="mt-6 max-w-md text-base leading-7 text-ink-soft">
              Candidates complete a realistic operations simulation. Hiring
              teams review evidence, score capability, and record a decision
              they can explain later.
            </p>
          </div>
          <p className="text-sm text-ink-soft">
            Work simulation · evidence capture · human decision
          </p>
        </section>
        <section className="flex items-center border-t border-line bg-paper-2 px-8 py-12 lg:border-l lg:border-t-0 lg:px-12">
          <div className="w-full max-w-sm">
            <h1 className="font-serif text-3xl">Staff sign in</h1>
            <p className="mt-2 mb-8 text-sm leading-6 text-ink-soft">
              Staff only. Candidates never register here — they receive an invite
              link. Demo password for all seeded accounts: transform123
            </p>
            <LoginForm />
            <ul className="mt-6 space-y-1 text-xs leading-5 text-ink-soft">
              <li>ivan.p@example.net — Admin console</li>
              <li>zara.a@example.net — Assessment designer</li>
              <li>ivan.p@example.net — Evaluator workspace</li>
              <li>maria.s@example.com — Interview / hiring manager</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
