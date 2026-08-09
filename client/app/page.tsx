import Link from "next/link";
import { GoogleIcon } from "./_components/GoogleIcon";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-base">
      <header className="border-b border-border bg-base">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="inline-flex items-center">
          <img
            src="/assets/images/logo.svg"
            alt="Consulo"
            className="h-6 w-auto"
          />
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/login"
            className="inline-flex items-center rounded-md border border-border-strong px-3 py-2 text-text-body hover:bg-bg-soft hover:text-text-primary"
          >
            <GoogleIcon className="mr-2" size={18} />
            Login
          </Link>
        </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-bg">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 text-center">
            <img
              src="/assets/images/logo.svg"
              alt="Consulo"
              className="mx-auto h-10 w-auto"
            />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Consultants and clients
            </p>
            <h1 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight text-text-primary">
              Hire consultants and book{" "}
              <span className="text-accent">consultations</span>.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-7 text-text-body">
              Consulo is a freelance marketplace where clients can hire consultants and
              book online or offline sessions.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-md border border-accent-soft bg-base px-5 text-sm font-semibold text-accent hover:bg-bg-soft"
              >
                <GoogleIcon className="mr-2" />
                Continue with Google
              </Link>
            </div>
          </div>
        </section>


      </main>

      <footer className="border-t border-border bg-base">
        <div className="mx-auto w-full max-w-5xl px-6 py-6 text-sm text-text-muted">
          © Consulo by Md. Raihan Hossen
        </div>
      </footer>
    </div>
  );
}
