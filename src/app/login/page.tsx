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
              Staff sign in
            </p>
          </div>
          <p className="text-sm text-ink-soft">Transform Solution</p>
        </section>
        <section className="flex items-center border-t border-line bg-paper-2 px-8 py-12 lg:border-l lg:border-t-0 lg:px-12">
          <div className="w-full max-w-sm">
            <h1 className="font-serif text-3xl">Sign in</h1>
            <p className="mt-2 mb-8 text-sm leading-6 text-ink-soft">
              Enter your staff email and password.
            </p>
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
