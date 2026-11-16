import { t } from "../lib/messages";
import type { MessageKey } from "../lib/messages";
import type { ConsoleView } from "../lib/auth/view";

/**
 * Account bar for the console frame: organization switcher, role, user, sign out. Both forms post
 * to route handlers with the session's CSRF token. The server re-checks membership on every
 * switch, so the list here is a convenience, not authorisation.
 */
export function OrgSwitcher({ view }: { view: ConsoleView }) {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-line bg-bg-1 px-4 py-3">
      <form method="post" action="/api/org/switch" className="flex items-center gap-2">
        <input type="hidden" name="csrf" value={view.csrf} />
        <label htmlFor="org-switcher" className="text-small text-text-1">
          {t("org.switcher.label")}
        </label>
        <select
          id="org-switcher"
          name="tenant_id"
          defaultValue={view.org.id}
          className="min-h-(--control-height) rounded-control border border-line-strong bg-bg-2 px-2 text-body text-text-0"
        >
          {view.memberships.map((m) => (
            <option key={m.tenantId} value={m.tenantId}>
              {m.orgName}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-(--control-height) rounded-control border border-line-strong px-3 text-body text-text-0"
        >
          {t("org.switcher.submit")}
        </button>
      </form>
      <p className="text-small text-text-1">
        {t("org.role")}: <span>{t(`role.${view.role}` satisfies MessageKey)}</span>
      </p>
      <p className="ml-auto text-small text-text-1">
        {t("auth.user")} {view.user.email}
      </p>
      <form method="post" action="/api/auth/sign-out">
        <input type="hidden" name="csrf" value={view.csrf} />
        <button
          type="submit"
          className="min-h-(--control-height) rounded-control border border-line-strong px-3 text-body text-text-0"
        >
          {t("auth.signout")}
        </button>
      </form>
    </header>
  );
}
