"use client";

import Link from "next/link";
import { buildSpeechSnippets } from "../../lib/snippets";
import { t, type MessageKey } from "../../lib/messages";
import type { OnboardingProgress, ScreenResult } from "../../lib/data/types";
import { Badge } from "../ui/Badge";
import { CodeBlock } from "../ui/CodeBlock";
import { Result, ScreenPage } from "./common";

interface Step {
  readonly done: boolean;
  readonly title: MessageKey;
  readonly body: MessageKey;
  readonly href: string;
  readonly action: MessageKey;
  readonly code?: boolean;
}

/** C1. Three steps to a first audio file: create a key, send a request, hear it. */
export function OnboardingScreen({
  result,
}: {
  readonly result: ScreenResult<OnboardingProgress>;
}) {
  return (
    <ScreenPage title={t("screen.onboarding.title")} lead={t("screen.onboarding.lead")}>
      <Result result={result}>{(progress) => <Steps progress={progress} />}</Result>
    </ScreenPage>
  );
}

function Steps({ progress }: { readonly progress: OnboardingProgress }) {
  const steps: readonly Step[] = [
    {
      done: progress.keyCreated,
      title: "screen.onboarding.step1.title",
      body: "screen.onboarding.step1.body",
      href: "/dashboard/keys",
      action: "screen.onboarding.step1.action",
    },
    {
      done: progress.requestSent,
      title: "screen.onboarding.step2.title",
      body: "screen.onboarding.step2.body",
      href: "/dashboard/usage",
      action: "screen.onboarding.step2.action",
      code: true,
    },
    {
      done: progress.heard,
      title: "screen.onboarding.step3.title",
      body: "screen.onboarding.step3.body",
      href: "/dashboard/playground",
      action: "screen.onboarding.step3.action",
    },
  ];
  const current = steps.findIndex((step) => !step.done);

  return (
    <ol aria-label={t("screen.onboarding.steps")} className="flex flex-col gap-4">
      {steps.map((step, index) => (
        <li
          key={step.title}
          {...(index === current ? { "aria-current": "step" as const } : {})}
          className="flex flex-col gap-3 rounded-panel border border-line bg-bg-1 p-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-h3 font-medium text-text-0">{t(step.title)}</h2>
            {step.done ? <Badge status="ok">{t("screen.onboarding.done")}</Badge> : null}
          </div>
          <p className="max-w-prose text-body text-text-1">{t(step.body)}</p>
          {step.code === true ? <CodeBlock snippets={buildSpeechSnippets()} /> : null}
          <div>
            <Link
              href={step.href}
              className="inline-flex min-h-(--control-height) items-center rounded-control border border-line-strong px-3 text-body text-text-0"
            >
              {t(step.action)}
            </Link>
          </div>
        </li>
      ))}
    </ol>
  );
}
