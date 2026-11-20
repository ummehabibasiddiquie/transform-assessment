import { LoginForm } from "@/components/LoginForm";
import { COMPANY_NAME } from "@/lib/invite-email";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-10 text-ink">
      <div className="w-full max-w-md">
        <section className="rounded-xl border border-line bg-paper-2 px-8 py-10 shadow-sm">
          <h1 className="text-center font-serif text-3xl tracking-tight">Sign in</h1>
          <p className="mt-2 mb-8 text-center text-sm leading-6 text-ink-soft">
            Enter your staff email and password.
          </p>
          <LoginForm />
        </section>
        <p className="mt-6 text-center text-sm text-ink-soft">{COMPANY_NAME}</p>
      </div>
    </main>
  );
}
