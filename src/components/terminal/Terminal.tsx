import { useEffect, useRef, useState } from "react";
import {
  TerminalSquare,
  Trash2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Bug,
  ArrowDownToLine,
} from "lucide-react";
import { useWorkspace } from "../../hooks/useWorkspace";
import { IconButton } from "../shared";
export function Terminal({
  running,
  paused,
  onPause,
  activeFile,
  onHelp,
}: {
  running: boolean;
  paused: boolean;
  onPause: () => void;
  activeFile: string;
  onHelp: () => void;
}) {
  const { logs, clearLogs, prefs, setPrefs } = useWorkspace();
  const end = useRef<HTMLDivElement>(null),
    [fullscreen, setFullscreen] = useState(false),
    [filter, setFilter] = useState("all");
  useEffect(() => {
    if (prefs.autoScroll && !paused)
      end.current?.scrollIntoView({ block: "nearest" });
  }, [logs, prefs.autoScroll, paused]);
  useEffect(() => {
    if (!fullscreen) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [fullscreen]);
  const visible = logs.filter((l) => filter === "all" || l.level === filter);
  const icons = {
    info: Info,
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    debug: Bug,
  };
  return (
    <section
      className={`terminal ${fullscreen ? "terminal-fullscreen" : ""}`}
      style={{ fontSize: prefs.terminalFontSize }}
    >
      <header className="terminal-header">
        <div className="terminal-tabs">
          <span className="active">
            <TerminalSquare size={14} />
            TERMINAL
          </span>
          <button className="terminal-docs" onClick={onHelp}>
            API REFERENCE
          </button>
          <span className="log-count">{logs.length}</span>
        </div>
        <div className="terminal-controls">
          <select
            aria-label="Filter terminal logs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All output</option>
            {["info", "success", "warning", "error", "debug"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <select
            aria-label="Execution speed"
            value={prefs.speed}
            onChange={(e) =>
              setPrefs({ ...prefs, speed: Number(e.target.value) })
            }
          >
            <option value={0}>Fast</option>
            <option value={80}>Normal</option>
            <option value={250}>Slow</option>
          </select>
          <IconButton
            title={
              prefs.autoScroll ? "Disable auto scroll" : "Enable auto scroll"
            }
            className={prefs.autoScroll ? "is-active" : ""}
            onClick={() =>
              setPrefs({ ...prefs, autoScroll: !prefs.autoScroll })
            }
          >
            <ArrowDownToLine size={14} />
          </IconButton>
          <IconButton
            title={paused ? "Resume execution" : "Pause execution"}
            onClick={onPause}
            disabled={!running}
          >
            {paused ? <Play size={13} /> : <Pause size={13} />}
          </IconButton>
          <IconButton title="Clear terminal" onClick={clearLogs}>
            <Trash2 size={14} />
          </IconButton>
          <IconButton
            title={
              fullscreen ? "Exit fullscreen terminal" : "Fullscreen terminal"
            }
            onClick={() => setFullscreen(!fullscreen)}
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </IconButton>
        </div>
      </header>
      {running && (
        <div className={`execution-progress ${paused ? "paused" : ""}`} />
      )}
      <div className="terminal-body" role="log" aria-label="Execution output">
        <div className="terminal-welcome">
          <span className="terminal-glyph">›_</span>
          <div>
            <strong>
              Attendance execution console <span>v1.0.0</span>
            </strong>
            <p>
              Ready when you are. Run a script with <kbd>Ctrl</kbd> +{" "}
              <kbd>Enter</kbd>
            </p>
          </div>
        </div>
        {visible.map((log) => {
          const Icon = icons[log.level];
          return (
            <div className={`log-row ${log.level}`} key={log.id}>
              <time>{log.time}</time>
              <Icon size={12} />
              <span className="log-level">
                {log.level === "success" ? "done" : log.level}
              </span>
              <pre>{log.message}</pre>
            </div>
          );
        })}
        <div className="terminal-prompt">
          <ChevronRight size={14} />
          <span>workspace</span>
          <span className="muted">/ {activeFile}</span>
          <span className={running && !paused ? "cursor pulse" : "cursor"} />
          {running && (
            <span className="muted">{paused ? "paused" : "running…"}</span>
          )}
        </div>
        <div ref={end} />
      </div>
    </section>
  );
}
