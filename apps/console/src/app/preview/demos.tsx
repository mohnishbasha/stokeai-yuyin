"use client";

import { useState, type ReactNode } from "react";
import { AppNav } from "../../components/ui/AppNav";
import { Badge } from "../../components/ui/Badge";
import { BalanceMeter } from "../../components/ui/BalanceMeter";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { Dialog } from "../../components/ui/Dialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { KeyReveal } from "../../components/ui/KeyReveal";
import { Select } from "../../components/ui/Select";
import { Table } from "../../components/ui/Table";
import { Tabs } from "../../components/ui/Tabs";
import { Textarea } from "../../components/ui/Textarea";
import { ToastProvider, useToast } from "../../components/ui/Toast";
import { Toggle } from "../../components/ui/Toggle";
import { UsageChart } from "../../components/ui/UsageChart";
import { VoicePicker, type VoiceOption } from "../../components/ui/VoicePicker";
import { buildSpeechSnippets } from "../../lib/snippets";
import { STATUSES } from "../../lib/status";

function Stack({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-col items-start gap-4">{children}</div>;
}

export function ButtonDemo() {
  return (
    <Stack>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button loading>Saving</Button>
        <Button disabled disabledReason="Needs the developer role">
          Disabled
        </Button>
      </div>
    </Stack>
  );
}

export function InputDemo() {
  const [value, setValue] = useState("");
  return (
    <Stack>
      <Input
        label="Key name"
        helper="Shown in the key list."
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onClear={() => {
          setValue("");
        }}
      />
      <Input label="Email" error="Enter a valid email address." defaultValue="not-an-email" />
      <Input label="Locked" disabled defaultValue="Read only" />
    </Stack>
  );
}

export function TextareaDemo() {
  const [over, setOver] = useState(false);
  return (
    <Stack>
      <Textarea
        label="Text"
        limit={30}
        defaultValue="आपकी EMI ₹12,450 है"
        estimate="About $0.00"
        onOverLimitChange={setOver}
      />
      <Button variant="primary" disabled={over} disabledReason="The text is over the limit">
        Synthesise
      </Button>
    </Stack>
  );
}

export function SelectDemo() {
  const [value, setValue] = useState("hi");
  return (
    <Stack>
      <Select
        label="Language"
        value={value}
        onChange={setValue}
        options={[
          { value: "hi", label: "हिन्दी", secondary: "Hindi" },
          { value: "en", label: "English" },
          { value: "hinglish", label: "Hinglish" },
        ]}
      />
      <Select label="Loading" loading options={[]} onChange={() => undefined} />
    </Stack>
  );
}

const VOICES: readonly VoiceOption[] = [
  {
    id: "asha",
    name: "Asha",
    languages: ["hi", "en", "hinglish"],
    description: "Warm, clear, steady pace.",
  },
  { id: "dev", name: "Dev", languages: ["hi", "en"], description: "Low, calm, formal." },
  {
    id: "meera",
    name: "Meera",
    languages: ["hi"],
    description: "Bright, conversational.",
    unavailableReason: "Available on the Scale plan",
  },
];

export function VoicePickerDemo() {
  const [selected, setSelected] = useState<string | undefined>("asha");
  const [playing, setPlaying] = useState<string | undefined>(undefined);
  return (
    <VoicePicker
      voices={VOICES}
      {...(selected !== undefined ? { selectedId: selected } : {})}
      onSelect={setSelected}
      {...(playing !== undefined ? { playingId: playing } : {})}
      onPlay={setPlaying}
      onStop={() => {
        setPlaying(undefined);
      }}
    />
  );
}

interface DemoRow {
  readonly name: string;
  readonly prefix: string;
  readonly chars: number;
}
const ROWS: readonly DemoRow[] = [
  { name: "Production", prefix: "yy_live_ab12", chars: 1_204_500 },
  { name: "Staging", prefix: "yy_test_c0ff", chars: 86_020 },
];

export function TableDemo() {
  return (
    <Table<DemoRow>
      caption="API keys"
      rows={ROWS}
      rowKey={(row) => row.prefix}
      columns={[
        { key: "name", header: "Name", sortable: true },
        { key: "prefix", header: "Prefix" },
        {
          key: "chars",
          header: "Characters",
          numeric: true,
          render: (row) => row.chars.toLocaleString("en-US"),
        },
      ]}
    />
  );
}

export function TabsDemo() {
  return (
    <Tabs
      label="Example"
      tabs={[
        { id: "one", label: "Overview", panel: <p className="p-3">Overview panel</p> },
        { id: "two", label: "Settings", panel: <p className="p-3">Settings panel</p> },
        { id: "three", label: "Disabled", panel: null, disabled: true },
      ]}
    />
  );
}

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Revoke key
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="Revoke key yy_live_...ab12?"
        description="Requests using this key fail at once."
        footer={
          <>
            <Button
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive">Revoke</Button>
          </>
        }
      >
        <p>This cannot be undone.</p>
      </Dialog>
    </>
  );
}

function ToastButtons() {
  const toast = useToast();
  return (
    <div className="flex gap-3">
      <Button
        onClick={() => {
          toast.push({ kind: "success", message: "Key created. It is in the key list." });
        }}
      >
        Success
      </Button>
      <Button
        onClick={() => {
          toast.push({ kind: "info", message: "Usage refreshes every minute." });
        }}
      >
        Info
      </Button>
      <Button
        onClick={() => {
          toast.push({ kind: "error", message: "Could not save. Try again." });
        }}
      >
        Error
      </Button>
    </div>
  );
}

export function ToastDemo() {
  return (
    <ToastProvider>
      <ToastButtons />
    </ToastProvider>
  );
}

export function ToggleDemo() {
  const [on, setOn] = useState(false);
  return <Toggle label="Show normalised text" checked={on} onChange={setOn} />;
}

export function BadgeDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      {STATUSES.map((status) => (
        <Badge key={status} status={status}>
          {status}
        </Badge>
      ))}
    </div>
  );
}

export function BannerDemo() {
  return (
    <Stack>
      <Banner status="warn" action={{ label: "Top up", href: "#" }}>
        Low balance
      </Banner>
      <Banner status="info" onDismiss={() => undefined}>
        Test mode is on.
      </Banner>
      <Banner status="err" role="alert" incident>
        Incident in progress.
      </Banner>
    </Stack>
  );
}

export function CodeBlockDemo() {
  return <CodeBlock snippets={buildSpeechSnippets()} />;
}

export function KeyRevealDemo() {
  // Built at runtime so no key-shaped literal is committed (gitleaks).
  const secret = ["yy", "test", "ab12", "c0ffee00deadbeef"].join("_");
  return <KeyReveal secret={secret} onDone={() => undefined} />;
}

export function BalanceMeterDemo() {
  return (
    <Stack>
      <BalanceMeter
        balanceMicroUsd={32_500_000}
        capacityMicroUsd={50_000_000}
        lowThresholdMicroUsd={5_000_000}
        topUpHref="#"
      />
      <BalanceMeter
        balanceMicroUsd={1_000_000}
        capacityMicroUsd={50_000_000}
        lowThresholdMicroUsd={5_000_000}
        topUpHref="#"
      />
      <BalanceMeter loading topUpHref="#" />
      <BalanceMeter error onRetry={() => undefined} topUpHref="#" />
    </Stack>
  );
}

const POINTS = [
  { label: "2026-11-01", value: 120_400 },
  { label: "2026-11-02", value: 340_000 },
  { label: "2026-11-03", value: 0 },
  { label: "2026-11-04", value: 220_950 },
];

export function UsageChartDemo() {
  const [range, setRange] = useState("7d");
  return (
    <UsageChart
      title="Characters per day"
      unit="characters"
      points={POINTS}
      ranges={[
        { id: "7d", label: "7 days" },
        { id: "30d", label: "30 days" },
      ]}
      range={range}
      onRangeChange={setRange}
    />
  );
}

export function EmptyStateDemo() {
  return (
    <EmptyState
      title="No API keys yet"
      body="Create one to send your first request."
      action={{ label: "Create API key", onClick: () => undefined }}
      docs={{ label: "Read the docs", href: "#" }}
    />
  );
}

export function ErrorStateDemo() {
  return (
    <ErrorState
      title="Could not load keys"
      cause="The service did not answer. Try again."
      code="engine_unavailable"
      traceId="req_01HXYZ"
      onRetry={() => undefined}
      help={{ label: "Status page", href: "#" }}
    />
  );
}

export function AppNavDemo() {
  return (
    <AppNav
      label="Console demo"
      currentHref="/dashboard"
      items={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/keys", label: "API keys" },
      ]}
    />
  );
}
