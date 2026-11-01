import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Code2,
  Play,
  Square,
  Copy,
  RotateCcw,
  Search,
  ChevronDown,
  FileJson,
  FileCode2,
  Check,
  Columns2,
  BookOpen,
  MousePointer2,
  Trash2,
} from "lucide-react";
import type { AttendanceRecord, Period } from "../../types";
import { useWorkspace } from "../../hooks/useWorkspace";
import { templates } from "../../services/templates";
import {
  executeScript,
  ExecutionStopped,
} from "../../services/execution-engine";
import {
  makeReport,
  validateEmployee,
  validateRecord,
} from "../../services/attendance-engine";
import { inPeriod, workingMinutes } from "../../utils/date";
import { IconButton, copyText, Modal, Confirm } from "../shared";
import { DataInspector } from "../data-inspector/DataInspector";
import { Terminal } from "../terminal/Terminal";
import type { EditorAction } from "../code-editor/CodeEditor";
const CodeEditor = lazy(() => import("../code-editor/CodeEditor"));
export function DeveloperConsole({
  today,
  records,
  period,
  onEdit,
  requestedFile,
  requestedPane,
  onRunning,
}: {
  today: string;
  records: AttendanceRecord[];
  period: Period;
  onEdit: (r: AttendanceRecord) => void;
  requestedFile: { name: string; id: number } | null;
  requestedPane: { name: string; id: number } | null;
  onRunning: (value: boolean) => void;
}) {
  const workspace = useWorkspace(),
    { prefs, setPrefs, log, db } = workspace;
  const original = useRef(templates(today));
  const [files, setFiles] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("attendance-scripts") || "{}",
      );
      return {
        ...original.current,
        ...Object.fromEntries(
          Object.entries(saved).filter(
            ([k, v]) =>
              k in original.current &&
              typeof v === "string" &&
              (v as string).length < 200000,
          ),
        ),
      } as Record<string, string>;
    } catch {
      return original.current;
    }
  });
  const [active, setActive] = useState("attendance.js"),
    [running, setRunning] = useState(false),
    [paused, setPaused] = useState(false),
    [lastRun, setLastRun] = useState<string | null>(null),
    [copied, setCopied] = useState(false),
    [action, setAction] = useState<{ type: EditorAction; id: number } | null>(
      null,
    ),
    [help, setHelp] = useState(false),
    [reset, setReset] = useState(false),
    [mobilePane, setMobilePane] = useState("editor");
  const runControl = useRef<AbortController | null>(null),
    pausedRef = useRef(false),
    prefsRef = useRef(prefs),
    workspaceRef = useRef(workspace),
    periodRef = useRef(period);
  prefsRef.current = prefs;
  workspaceRef.current = workspace;
  periodRef.current = period;
  const runningRef = useRef(false);
  const [inspectorWidth, setInspectorWidth] = useState(33),
    [terminalHeight, setTerminalHeight] = useState(32);
  const consoleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    localStorage.setItem("attendance-scripts", JSON.stringify(files));
  }, [files]);
  useEffect(() => {
    if (requestedFile) {
      setActive(requestedFile.name);
      setMobilePane("editor");
    }
  }, [requestedFile]);
  useEffect(() => () => runControl.current?.abort(), []);
  useEffect(() => {
    if (requestedPane) setMobilePane(requestedPane.name);
  }, [requestedPane]);
  const resize = (event: React.PointerEvent, vertical: boolean) => {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    const bounds = consoleRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const move = (e: PointerEvent) => {
      if (vertical)
        setTerminalHeight(
          Math.min(
            65,
            Math.max(20, ((bounds.bottom - e.clientY) / bounds.height) * 100),
          ),
        );
      else
        setInspectorWidth(
          Math.min(
            52,
            Math.max(24, ((bounds.right - e.clientX) / bounds.width) * 100),
          ),
        );
    };
    const finish = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", finish);
      target.removeEventListener("pointercancel", finish);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", finish);
    target.addEventListener("pointercancel", finish);
  };
  const stringify = (v: unknown) =>
    typeof v === "string" ? v : (JSON.stringify(v, null, 2) ?? String(v));
  async function run() {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    onRunning(true);
    setPaused(false);
    pausedRef.current = false;
    const control = new AbortController();
    runControl.current = control;
    const started = performance.now();
    const current = workspaceRef.current;
    const selected = () =>
      current
        .getDatabase()
        .records.filter((r) => inPeriod(r, periodRef.current));
    const logApi =
      (level: Parameters<typeof log>[0]) =>
      (...args: unknown[]) =>
        current.log(level, args.map(stringify).join(" "));
    const api = {
      attendance: {
        load: async () => {
          const value = selected();
          current.log(
            "info",
            `Read ${value.length} records for selected period.`,
          );
          return value;
        },
        all: async () => {
          const value = current.getDatabase().records;
          current.log("debug", `Read all ${value.length} workspace records.`);
          return value;
        },
        get: async (date: string) =>
          current
            .getDatabase()
            .records.find((r) => r.attendance_date === date) || null,
        validate: async (records: AttendanceRecord[]) => {
          if (!Array.isArray(records))
            throw new Error("validate membutuhkan array record.");
          const errors: string[] = [];
          for (const record of records) {
            try {
              validateRecord(record);
            } catch (e) {
              errors.push(`${record.attendance_date}: ${(e as Error).message}`);
            }
          }
          current.log(
            errors.length ? "warning" : "success",
            `Validated ${records.length} records; ${errors.length} errors.`,
          );
          return { valid: errors.length === 0, errors };
        },
        calculate: async (record: AttendanceRecord) => {
          const valid = validateRecord(record),
            total = workingMinutes(valid);
          return {
            working_minutes: total,
            overtime_minutes: Math.max(0, total - 480),
          };
        },
        report: async () => {
          const result = makeReport(selected());
          current.log(
            "success",
            "Generated attendance report for selected period.",
          );
          return result;
        },
      },
      attendanceEditor: {
        update: async (patch: Parameters<typeof current.update>[0]) => {
          if (
            !patch ||
            typeof patch !== "object" ||
            typeof patch.date !== "string"
          )
            throw new Error(
              "update membutuhkan { date, checkIn?, checkOut?, shift?, notes? }.",
            );
          return current.update(patch);
        },
      },
      employeeService: {
        get: async () => current.getDatabase().employee,
        update: async (value: unknown) => {
          const employee = validateEmployee(value);
          await current.saveEmployee(employee);
          return employee;
        },
      },
      console: {
        log: logApi("info"),
        info: logApi("info"),
        success: logApi("success"),
        warn: logApi("warning"),
        error: logApi("error"),
        debug: logApi("debug"),
      },
    };
    log("info", `Executing ${active}…`);
    try {
      if (active.endsWith(".json")) {
        const data = JSON.parse(JSON.stringify(records));
        const result = await api.attendance.validate(data);
        if (!result.valid) throw new Error("JSON validation failed.");
        log(
          "success",
          `Inspected ${data.length} records. JSON view is synchronized and read-only.`,
        );
      } else
        await executeScript(files[active], api, {
          signal: control.signal,
          paused: () => pausedRef.current,
          speed: () => prefsRef.current.speed,
        });
      log(
        "success",
        `Operation completed in ${((performance.now() - started) / 1000).toFixed(2)}s.`,
      );
      setLastRun("Completed");
    } catch (e) {
      log(
        e instanceof ExecutionStopped ? "warning" : "error",
        (e as Error).message,
      );
      setLastRun(e instanceof ExecutionStopped ? "Stopped" : "Failed");
    } finally {
      runningRef.current = false;
      setRunning(false);
      onRunning(false);
      setPaused(false);
      pausedRef.current = false;
    }
  }
  const pause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    log(
      "debug",
      pausedRef.current ? "Execution paused." : "Execution resumed.",
    );
  };
  const value = active.endsWith(".json")
    ? JSON.stringify(records, null, 2)
    : files[active];
  return (
    <div
      className={`developer-console ${prefs.layout === "stacked" ? "stacked" : ""} mobile-${mobilePane}`}
      ref={consoleRef}
      style={
        {
          "--inspector-width": `${inspectorWidth}%`,
          "--terminal-height": `${terminalHeight}%`,
        } as React.CSSProperties
      }
    >
      <header className="workspace-toolbar">
        <div className="workspace-path">
          <Code2 size={16} />
          <strong>Developer console</strong>
          <span>/</span>
          <span>{active}</span>
        </div>
        <div className="run-tools">
          <span className={`execution-status ${running ? "executing" : ""}`}>
            <i />
            {running ? (paused ? "Paused" : "Running") : lastRun || "Ready"}
          </span>
          <IconButton title="API reference" onClick={() => setHelp(true)}>
            <BookOpen size={15} />
          </IconButton>
          <IconButton title="Clear console" onClick={workspace.clearLogs}>
            <Trash2 size={14} />
          </IconButton>
          <IconButton
            title="Toggle panel layout"
            onClick={() =>
              setPrefs({
                ...prefs,
                layout: prefs.layout === "split" ? "stacked" : "split",
              })
            }
          >
            <Columns2 size={15} />
          </IconButton>
          <button className="run-button" onClick={run} disabled={running}>
            <Play size={13} fill="currentColor" />
            Run script<kbd>⌃ ↵</kbd>
          </button>
          <IconButton
            title="Stop execution"
            onClick={() => runControl.current?.abort()}
            disabled={!running}
          >
            <Square size={13} fill="currentColor" />
          </IconButton>
        </div>
      </header>
      <div className="mobile-pane-tabs">
        {["editor", "inspector", "terminal"].map((p) => (
          <button
            key={p}
            className={p === mobilePane ? "active" : ""}
            onClick={() => setMobilePane(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="editor-inspector">
        <section className="editor-pane">
          <div
            className="file-tabs"
            role="tablist"
            aria-label="Workspace files"
          >
            {Object.keys(files).map((file) => (
              <button
                key={file}
                role="tab"
                aria-selected={file === active}
                className={file === active ? "active" : ""}
                onClick={() => setActive(file)}
              >
                {file.endsWith(".json") ? (
                  <FileJson size={13} />
                ) : (
                  <span className="js-icon">JS</span>
                )}
                {file}
                <span className="tab-dot" />
              </button>
            ))}
          </div>
          <div className="editor-breadcrumb">
            <span>
              <FileCode2 size={13} />
              workspace
              <ChevronDown size={11} className="breadcrumb-chevron" />
              {active}
            </span>
            <div>
              <IconButton
                title="Find and replace"
                onClick={() => setAction({ type: "search", id: Date.now() })}
              >
                <Search size={13} />
              </IconButton>
              <IconButton
                title="Select all code"
                onClick={() => setAction({ type: "selectAll", id: Date.now() })}
              >
                <MousePointer2 size={13} />
              </IconButton>
              <IconButton
                title="Copy code"
                onClick={async () => {
                  try {
                    await copyText(value);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch (e) {
                    log("error", (e as Error).message);
                  }
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </IconButton>
              <IconButton
                title="Reset active script"
                onClick={() => setReset(true)}
                disabled={active.endsWith(".json")}
              >
                <RotateCcw size={13} />
              </IconButton>
            </div>
          </div>
          <Suspense
            fallback={
              <div className="loading-editor">Loading code editor…</div>
            }
          >
            <CodeEditor
              value={value}
              filename={active}
              onChange={(v) => {
                if (!active.endsWith(".json"))
                  setFiles((prev) => ({ ...prev, [active]: v }));
              }}
              prefs={prefs}
              onRun={run}
              action={action}
              readOnly={active.endsWith(".json")}
            />
          </Suspense>
          <div className="editor-status">
            <span>
              {active.endsWith(".json")
                ? "Synchronized data · read-only"
                : "UTF-8 · LF"}
            </span>
            <span>
              {active.endsWith(".json") ? "JSON" : "JavaScript"}
              <span className="muted">{value.split("\n").length} lines</span>
            </span>
          </div>
        </section>
        <div
          className="splitter vertical"
          role="separator"
          aria-label="Resize data inspector"
          aria-orientation="vertical"
          tabIndex={0}
          onPointerDown={(e) => resize(e, false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft")
              setInspectorWidth((v) => Math.min(52, v + 2));
            if (e.key === "ArrowRight")
              setInspectorWidth((v) => Math.max(24, v - 2));
          }}
        />
        <DataInspector records={records} onEdit={onEdit} />
      </div>
      <div
        className="splitter horizontal"
        role="separator"
        aria-label="Resize terminal"
        aria-orientation="horizontal"
        tabIndex={0}
        onPointerDown={(e) => resize(e, true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp")
            setTerminalHeight((v) => Math.min(65, v + 3));
          if (e.key === "ArrowDown")
            setTerminalHeight((v) => Math.max(20, v - 3));
        }}
      />
      <Terminal
        running={running}
        paused={paused}
        onPause={pause}
        activeFile={active}
        onHelp={() => setHelp(true)}
      />
      {reset && (
        <Confirm
          title="Reset script?"
          message={`Replace ${active} with its original template?`}
          onClose={() => setReset(false)}
          onConfirm={async () =>
            setFiles((prev) => ({
              ...prev,
              [active]: original.current[active],
            }))
          }
        />
      )}
      {help && (
        <Modal title="Workspace API" onClose={() => setHelp(false)} wide>
          <div className="api-docs">
            <p>
              JavaScript lokal dengan <code>await</code>, variabel, objek,
              array, <code>if</code>, dan <code>for…of</code>. Gunakan API
              berikut untuk membaca dan menyimpan data.
            </p>
            {[
              [
                "await attendance.load()",
                "Record pada periode pilihan. attendance.all() membaca semua record.",
              ],
              [
                'await attendance.get("YYYY-MM-DD")',
                "Satu record berdasarkan tanggal, atau null.",
              ],
              [
                "await attendance.validate(records)",
                "Memeriksa tanggal, shift, identitas, dan jam. Menghasilkan { valid, errors }.",
              ],
              [
                "await attendance.calculate(record)",
                "Durasi kerja dan lembur (di atas 8 jam), dalam menit. Shift lintas hari belum didukung.",
              ],
              [
                "await attendance.report()",
                "Ringkasan kehadiran untuk periode pilihan.",
              ],
              [
                "await attendanceEditor.update({ date, checkIn, checkOut, shift, notes })",
                "Membuat atau memperbarui record. Jam menggunakan HH:MM atau null. Semua panel langsung sinkron.",
              ],
              [
                "await employeeService.get() / update(employee)",
                "Baca atau simpan identitas karyawan.",
              ],
              [
                "console.log / info / success / warn / error / debug(...)",
                "Output aktual pada terminal. JSON.stringify dan JSON.parse juga tersedia.",
              ],
            ].map(([code, description]) => (
              <div key={code}>
                <code>{code}</code>
                <p>{description}</p>
              </div>
            ))}
            <p className="muted">
              Interpreter tidak menyediakan browser globals, jaringan, function
              declaration, atau akses prototype. Stop menghentikan langkah
              berikutnya; perubahan yang sudah disimpan tetap tersimpan. Gunakan
              editor visual atau attendance-editor.js untuk mengedit data JSON.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
