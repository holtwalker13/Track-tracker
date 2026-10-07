import Link from "next/link";
import { LoginThemePicker } from "@/components/auth/login-theme-picker";

/** Muted hints and demo passcode entry at the bottom of the login screen. */
export function LoginPageFooter({ next }: { next?: string }) {
  const demoQuery = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <footer className="shrink-0 border-t border-card-border/40 bg-background/30 px-4 py-5">
      <div className="mx-auto max-w-md space-y-2 text-center text-[11px] leading-relaxed text-muted/75">
        <p>
          New student or coach? Use the setup link or QR code from your school first, then sign in
          here with your email and password.
        </p>
      </div>
      <LoginThemePicker />
      <div className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-muted/55">
        <Link
          href={`/login/demo/admin${demoQuery}`}
          className="underline decoration-muted/30 underline-offset-2 transition-colors hover:text-muted/80"
        >
          Login as admin
        </Link>
        <span aria-hidden className="text-muted/35">
          ·
        </span>
        <Link
          href={`/login/demo/student${demoQuery}`}
          className="underline decoration-muted/30 underline-offset-2 transition-colors hover:text-muted/80"
        >
          Login as demo student
        </Link>
      </div>
    </footer>
  );
}
