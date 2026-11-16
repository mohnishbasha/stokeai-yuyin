import type { ComponentType } from "react";
import * as D from "./demos";

export interface PreviewEntry {
  readonly slug: string;
  readonly title: string;
  /** The file under `src/components/ui` (without extension). */
  readonly component: string;
  readonly Demo: ComponentType;
  readonly interactive: boolean;
}

/** Every design-system component with a preview at `/preview/components/<slug>` (S2-T02). */
export const PREVIEWS: readonly PreviewEntry[] = [
  { slug: "app-nav", title: "AppNav", component: "AppNav", Demo: D.AppNavDemo, interactive: true },
  { slug: "badge", title: "Badge", component: "Badge", Demo: D.BadgeDemo, interactive: false },
  {
    slug: "balance-meter",
    title: "BalanceMeter",
    component: "BalanceMeter",
    Demo: D.BalanceMeterDemo,
    interactive: true,
  },
  { slug: "banner", title: "Banner", component: "Banner", Demo: D.BannerDemo, interactive: true },
  { slug: "button", title: "Button", component: "Button", Demo: D.ButtonDemo, interactive: true },
  {
    slug: "code-block",
    title: "CodeBlock",
    component: "CodeBlock",
    Demo: D.CodeBlockDemo,
    interactive: true,
  },
  { slug: "dialog", title: "Dialog", component: "Dialog", Demo: D.DialogDemo, interactive: true },
  {
    slug: "empty-state",
    title: "EmptyState",
    component: "EmptyState",
    Demo: D.EmptyStateDemo,
    interactive: true,
  },
  {
    slug: "error-state",
    title: "ErrorState",
    component: "ErrorState",
    Demo: D.ErrorStateDemo,
    interactive: true,
  },
  { slug: "input", title: "Input", component: "Input", Demo: D.InputDemo, interactive: true },
  {
    slug: "key-reveal",
    title: "KeyReveal",
    component: "KeyReveal",
    Demo: D.KeyRevealDemo,
    interactive: true,
  },
  { slug: "select", title: "Select", component: "Select", Demo: D.SelectDemo, interactive: true },
  { slug: "table", title: "Table", component: "Table", Demo: D.TableDemo, interactive: true },
  { slug: "tabs", title: "Tabs", component: "Tabs", Demo: D.TabsDemo, interactive: true },
  {
    slug: "textarea",
    title: "Textarea",
    component: "Textarea",
    Demo: D.TextareaDemo,
    interactive: true,
  },
  { slug: "toast", title: "Toast", component: "Toast", Demo: D.ToastDemo, interactive: true },
  { slug: "toggle", title: "Toggle", component: "Toggle", Demo: D.ToggleDemo, interactive: true },
  {
    slug: "usage-chart",
    title: "UsageChart",
    component: "UsageChart",
    Demo: D.UsageChartDemo,
    interactive: true,
  },
  {
    slug: "voice-picker",
    title: "VoicePicker",
    component: "VoicePicker",
    Demo: D.VoicePickerDemo,
    interactive: true,
  },
];
