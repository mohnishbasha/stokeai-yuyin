"use client";

import { useState } from "react";
import { t } from "../../lib/messages";
import type { OrgSettings, ScreenResult, VoiceRecord } from "../../lib/data/types";
import { clearThemeCookie, parseTheme, themeCookie } from "../../lib/theme";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Tabs } from "../ui/Tabs";
import { Toggle } from "../ui/Toggle";
import { Panel, Result, ScreenPage, useMockAction } from "./common";

export interface SettingsData {
  readonly settings: OrgSettings;
  readonly voices: readonly VoiceRecord[];
}

type ThemeChoice = OrgSettings["theme"];

/** Applies the theme now: the cookie is what the server reads, the attribute is what paints. */
function applyTheme(choice: ThemeChoice) {
  const theme = parseTheme(choice);
  if (theme === undefined) {
    document.cookie = clearThemeCookie();
    document.documentElement.removeAttribute("data-theme");
    return;
  }
  document.cookie = themeCookie(theme);
  document.documentElement.setAttribute("data-theme", theme);
}

/** C10. Organisation settings. Changes are kept in this page only until the backend exists. */
export function SettingsScreen({ result }: { readonly result: ScreenResult<SettingsData> }) {
  return (
    <ScreenPage title={t("screen.settings.title")} lead={t("screen.settings.lead")}>
      <Result result={result}>{(data) => <SettingsBody data={data} />}</Result>
    </ScreenPage>
  );
}

function SettingsBody({ data }: { readonly data: SettingsData }) {
  const notConnected = useMockAction();
  const [orgName, setOrgName] = useState(data.settings.orgName);
  const [voiceId, setVoiceId] = useState(data.settings.defaultVoiceId);
  const [language, setLanguage] = useState(data.settings.defaultLanguage);
  const [interfaceLanguage, setInterfaceLanguage] = useState(data.settings.interfaceLanguage);
  const [theme, setTheme] = useState<ThemeChoice>(data.settings.theme);
  const [lowBalance, setLowBalance] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState("");

  const languages = [
    { value: "auto", label: t("screen.settings.langAuto") },
    { value: "hi", label: t("lang.hi.native"), secondary: t("lang.hi") },
    { value: "en", label: t("lang.en.native"), secondary: t("lang.en") },
  ];

  const tabs = [
    {
      id: "general",
      label: t("screen.settings.tabGeneral"),
      panel: (
        <Panel>
          <Input
            label={t("screen.settings.orgName")}
            value={orgName}
            onChange={(event) => {
              setOrgName(event.target.value);
            }}
          />
          <div>
            <Button variant="primary" onClick={notConnected}>
              {t("screen.settings.save")}
            </Button>
          </div>
        </Panel>
      ),
    },
    {
      id: "voice",
      label: t("screen.settings.tabVoice"),
      panel: (
        <Panel>
          <Select
            label={t("screen.settings.defaultVoice")}
            value={voiceId}
            options={data.voices.map((voice) => ({ value: voice.id, label: voice.name }))}
            onChange={setVoiceId}
          />
          <Select
            label={t("screen.settings.defaultLanguage")}
            value={language}
            options={languages}
            onChange={setLanguage}
          />
          <div>
            <Button variant="primary" onClick={notConnected}>
              {t("screen.settings.save")}
            </Button>
          </div>
        </Panel>
      ),
    },
    {
      id: "appearance",
      label: t("screen.settings.tabAppearance"),
      panel: (
        <Panel>
          <Select
            label={t("screen.settings.theme")}
            value={theme}
            options={[
              { value: "dark", label: t("screen.settings.themeDark") },
              { value: "light", label: t("screen.settings.themeLight") },
              { value: "system", label: t("screen.settings.themeSystem") },
            ]}
            onChange={(value) => {
              const next: ThemeChoice = value === "light" || value === "system" ? value : "dark";
              setTheme(next);
              applyTheme(next);
            }}
          />
          <Select
            label={t("screen.settings.interfaceLanguage")}
            value={interfaceLanguage}
            helper={t("screen.settings.interfaceHelper")}
            options={languages.filter((option) => option.value !== "auto")}
            onChange={setInterfaceLanguage}
          />
        </Panel>
      ),
    },
    {
      id: "notifications",
      label: t("screen.settings.tabNotifications"),
      panel: (
        <Panel>
          <Toggle
            label={t("screen.settings.lowBalanceAlert")}
            checked={lowBalance}
            helper={t("screen.settings.lowBalanceHelper")}
            onChange={setLowBalance}
          />
        </Panel>
      ),
    },
  ];

  const matches = typed === data.settings.orgName;

  return (
    <>
      <Tabs label={t("screen.settings.tabs")} tabs={tabs} />
      <Panel title={t("screen.settings.dangerZone")}>
        <p className="text-body text-text-1">{t("screen.settings.deleteBody")}</p>
        <div>
          <Button
            variant="destructive"
            onClick={() => {
              setDeleting(true);
            }}
          >
            {t("screen.settings.delete")}
          </Button>
        </div>
      </Panel>
      <Dialog
        open={deleting}
        onClose={() => {
          setDeleting(false);
          setTyped("");
        }}
        title={t("screen.settings.deleteTitle")}
        description={t("screen.settings.deleteConsequence")}
        footer={
          <>
            <Button
              onClick={() => {
                setDeleting(false);
                setTyped("");
              }}
            >
              {t("common.close")}
            </Button>
            <Button
              variant="destructive"
              disabled={!matches}
              disabledReason={t("screen.settings.deleteReason")}
              onClick={notConnected}
            >
              {t("screen.settings.deleteConfirm")}
            </Button>
          </>
        }
      >
        <Input
          label={t("screen.settings.deleteTypeLabel")}
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
          }}
        />
      </Dialog>
    </>
  );
}
