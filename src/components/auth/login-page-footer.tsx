import { ADMIN_LOGIN } from "@/lib/tenants";

/** Muted hints at the bottom of the login screen — no one-click or embedded passwords. */
export function LoginPageFooter() {
  return (
    <footer className="shrink-0 border-t border-card-border/40 bg-background/30 px-4 py-5">
      <div className="mx-auto max-w-md space-y-2 text-center text-[11px] leading-relaxed text-muted/75">
        <p>
          New student or coach? Use the setup link or QR code from your school first, then sign in
          here with your email and password.
        </p>
        <p className="text-muted/60">
          App admin? Sign in with{" "}
          <span className="font-mono text-[10px] text-muted/80">{ADMIN_LOGIN.email}</span> above —
          credentials are not shared on this page.
        </p>
      </div>
    </footer>
  );
}
