import { useEffect, useState } from "react";
import {
  Code2,
  Files,
  Settings2,
  ChevronRight,
  GitBranch,
  CheckCheck,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  CircleHelp,
  Database,
  TerminalSquare,
} from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import type { AttendanceRecord, Period } from "../types";
import { inPeriod, localDate } from "../utils/date";
import { Dashboard } from "../components/dashboard/Dashboard";
import { PeriodSelector } from "../components/attendance/PeriodSelector";
import { DeveloperConsole } from "../components/developer-console/DeveloperConsole";
import { RecordEditor } from "../components/attendance/RecordEditor";
import { IconButton } from "../components/shared";
import { AttendanceRecords } from "./AttendanceRecords";
import { Settings } from "./Settings";
export default function Workspace() {
  const { db, error, prefs, setPrefs, logs } = useWorkspace();
  const [today, setToday] = useState(localDate()),
    [page, setPage] = useState<"workspace" | "records" | "settings">(
      "workspace",
    ),
    [hidden, setHidden] = useState(false),
    [edit, setEdit] = useState<AttendanceRecord | null>(null),
    [requestedFile, setRequestedFile] = useState<{
      name: string;
      id: number;
    } | null>(null),
    [running, setRunning] = useState(false);
  const [requestedPane, setRequestedPane] = useState<{
    name: string;
    id: number;
  } | null>(null);
  const [period, setPeriod] = useState<Period>({
    mode: "month",
    month: today.slice(0, 7),
    start: `${today.slice(0, 7)}-01`,
    end: today,
  });
  useEffect(() => {
    const timer = setInterval(() => setToday(localDate()), 30000);
    return () => clearInterval(timer);
  }, []);
  const records = (db?.records || [])
    .filter((r) => inPeriod(r, period))
    .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
  if (error)
    return (
      <main className="startup-error">
        <Database size={32} />
        <h1>Workspace could not load</h1>
        <p>{error}</p>
        <button onClick={() => location.reload()}>Retry</button>
      </main>
    );
  if (!db)
    return (
      <div className="startup-loading">
        <span className="brand-mark">
          <i />
          <i />
          <i />
          <i />
        </span>
        <p>Opening attendance workspace…</p>
      </div>
    );
  return (
    <div
      className={`app theme-${prefs.theme} ${prefs.compact ? "compact" : ""}`}
    >
      <header className="app-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("workspace");
          }}
        >
          <span className="brand-mark">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            attendance<span className="brand-dot">.</span>
            <small>DEVELOPER WORKSPACE</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {[
            { id: "workspace", name: "Workspace", icon: Code2 },
            { id: "records", name: "Records", icon: Files },
            { id: "settings", name: "Settings", icon: Settings2 },
          ].map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => setPage(id as typeof page)}
            >
              <Icon size={15} />
              {name}
              {page === id && <span />}
            </button>
          ))}
        </nav>
        <div className="header-right">
          <select
            aria-label="Workspace theme"
            value={prefs.theme}
            onChange={(e) =>
              setPrefs({
                ...prefs,
                theme: e.target.value as typeof prefs.theme,
              })
            }
          >
            <option value="dark">VS Code Dark</option>
            <option value="monochrome">Monochrome</option>
            <option value="rainbow">Rainbow Code</option>
          </select>
          <span className="header-divider" />
          <span className="avatar tiny">
            {db.employee.name
              .split(" ")
              .filter(Boolean)
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
        </div>
      </header>
      <div className="context-bar">
        <div>
          <IconButton
            title={hidden ? "Show dashboard" : "Hide dashboard"}
            onClick={() => setHidden(!hidden)}
          >
            {hidden ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </IconButton>
          <span>Workspace</span>
          <ChevronRight size={12} />
          <strong>
            {page === "workspace"
              ? "Attendance console"
              : page === "records"
                ? "Attendance records"
                : "Settings"}
          </strong>
        </div>
        <span className="workspace-health">
          <i />
          Workspace ready
        </span>
      </div>
      <main className={`app-main ${hidden ? "dashboard-hidden" : ""}`}>
        <div className="dashboard-wrapper">
          <Dashboard
            today={today}
            onSettings={() => setPage("settings")}
            onEditScript={() => {
              setPage("workspace");
              setRequestedFile({
                name: "attendance-editor.js",
                id: Date.now(),
              });
            }}
          />
        </div>
        <div className="main-workspace">
          {page !== "settings" && (
            <PeriodSelector
              period={period}
              onChange={setPeriod}
              count={records.length}
            />
          )}
          <div
            className={
              page === "workspace"
                ? "console-container"
                : "console-container offscreen"
            }
          >
            <DeveloperConsole
              today={today}
              records={records}
              period={period}
              onEdit={setEdit}
              requestedFile={requestedFile}
              requestedPane={requestedPane}
              onRunning={setRunning}
            />
          </div>
          {page === "records" && (
            <AttendanceRecords records={records} onEdit={setEdit} />
          )}
          {page === "settings" && <Settings />}
        </div>
      </main>
      <footer className="app-status">
        <div>
          <span>
            <GitBranch size={12} />
            local-workspace
          </span>
          <span>
            <CheckCheck size={13} />
            {running ? "Executing" : "All changes saved"}
          </span>
        </div>
        <div>
          <span className="status-records">
            <Database size={12} />
            {db.records.length} records
          </span>
          <span>JavaScript</span>
          <span>UTF-8</span>
          <button
            title="Open terminal"
            onClick={() => {
              setPage("workspace");
              setRequestedPane({ name: "terminal", id: Date.now() });
            }}
            aria-label="Open terminal"
          >
            <TerminalSquare size={13} />
          </button>
          <button
            title={`${logs.filter((l) => l.level === "error").length} errors · open console`}
            onClick={() => {
              setPage("workspace");
              setRequestedPane({ name: "terminal", id: Date.now() });
            }}
            aria-label="View execution errors"
          >
            <Bell size={13} />
          </button>
        </div>
      </footer>
      {edit && <RecordEditor record={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
