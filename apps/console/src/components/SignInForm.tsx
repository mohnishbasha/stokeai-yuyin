import { t } from "../lib/messages";

// Plain server-rendered form so sign-in works without client JavaScript. A token in the link is
// carried in a hidden field and redeemed only when the user presses the button, so mail
// scanners that prefetch the link cannot burn the single-use token.
export function SignInForm({ token, failed }: { token: string | null; failed: boolean }) {
  return (
    <form method="post" action="/api/auth/sign-in" className="mt-5 flex max-w-prose flex-col gap-3">
      {failed ? (
        <p role="alert" className="rounded-control border border-err p-3 text-body text-err">
          {t("auth.signin.error")}
        </p>
      ) : null}
      {token === null ? (
        <label className="flex flex-col gap-2 text-small text-text-1">
          {t("auth.signin.tokenLabel")}
          <input
            name="token"
            type="password"
            autoComplete="one-time-code"
            required
            className="min-h-(--control-height) rounded-control border border-line-strong bg-bg-1 px-3 text-body text-text-0"
          />
        </label>
      ) : (
        <input type="hidden" name="token" value={token} />
      )}
      <button
        type="submit"
        className="inline-flex min-h-(--control-height) items-center justify-center rounded-control bg-accent px-4 text-body font-medium text-accent-ink"
      >
        {token === null ? t("auth.signin.submit") : t("auth.signin.continue")}
      </button>
    </form>
  );
}
