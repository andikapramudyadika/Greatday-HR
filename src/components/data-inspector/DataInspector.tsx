import { useMemo, useState } from "react";
import {
  Braces,
  Copy,
  RefreshCw,
  Search,
  ChevronsDownUp,
  ChevronsUpDown,
  AlignLeft,
  Check,
} from "lucide-react";
import type { AttendanceRecord } from "../../types";
import { IconButton, copyText } from "../shared";
function JsonTree({
  value,
  name,
  depth = 0,
  expanded,
  search,
}: {
  value: unknown;
  name?: string;
  depth?: number;
  expanded: boolean;
  search: string;
}) {
  const [open, setOpen] = useState(true);
  const isObject = value !== null && typeof value === "object";
  if (!isObject)
    return (
      <div className="json-line" style={{ paddingLeft: depth * 14 }}>
        {name !== undefined && (
          <>
            <span
              className={
                name.toLowerCase().includes(search.toLowerCase()) && search
                  ? "json-key match"
                  : "json-key"
              }
            >
              "{name}"
            </span>
            <span>: </span>
          </>
        )}
        <span
          className={
            typeof value === "string"
              ? "json-string"
              : value === null
                ? "json-null"
                : "json-value"
          }
        >
          {JSON.stringify(value)}
        </span>
      </div>
    );
  const entries = Object.entries(value as Record<string, unknown>),
    array = Array.isArray(value),
    visible = expanded && open;
  return (
    <div>
      <button
        className="json-fold"
        style={{ paddingLeft: depth * 14 }}
        onClick={() => setOpen(!open)}
        aria-expanded={visible}
      >
        <span className="fold-arrow">{visible ? "▾" : "▸"}</span>
        {name !== undefined && (
          <>
            <span className="json-key">
              {name.match(/^\d+$/) ? name : `"${name}"`}
            </span>
            :{" "}
          </>
        )}
        {array ? "[" : "{"}
        {!visible && (
          <span className="muted">
            {" "}
            {entries.length} {array ? "items" : "properties"}{" "}
            {array ? "]" : "}"}
          </span>
        )}
      </button>
      {visible && (
        <>
          {entries.map(([k, v]) => (
            <JsonTree
              key={k}
              name={k}
              value={v}
              depth={depth + 1}
              expanded={expanded}
              search={search}
            />
          ))}
          <div className="json-line" style={{ paddingLeft: depth * 14 + 13 }}>
            {array ? "]" : "}"}
          </div>
        </>
      )}
    </div>
  );
}
export function DataInspector({
  records,
  onEdit,
}: {
  records: AttendanceRecord[];
  onEdit: (r: AttendanceRecord) => void;
}) {
  const [search, setSearch] = useState(""),
    [compact, setCompact] = useState(false),
    [expanded, setExpanded] = useState(true),
    [version, setVersion] = useState(0),
    [copied, setCopied] = useState(false);
  const text = useMemo(
    () => JSON.stringify(records, null, compact ? 0 : 2),
    [records, compact],
  );
  const [error, setError] = useState("");
  return (
    <section className="inspector">
      <header className="pane-header">
        <span>
          <Braces size={14} />
          DATA INSPECTOR
        </span>
        <span className="language-pill">JSON</span>
      </header>
      <div className="inspector-toolbar">
        <span className="inspector-source">attendance.records</span>
        <IconButton
          title={compact ? "Pretty print JSON" : "Compact JSON"}
          onClick={() => setCompact(!compact)}
        >
          <AlignLeft size={14} />
        </IconButton>
        <IconButton
          title={expanded ? "Collapse all JSON" : "Expand all JSON"}
          onClick={() => {
            setExpanded(!expanded);
            setVersion((v) => v + 1);
          }}
        >
          {expanded ? (
            <ChevronsDownUp size={14} />
          ) : (
            <ChevronsUpDown size={14} />
          )}
        </IconButton>
        <IconButton
          title="Copy JSON"
          onClick={async () => {
            try {
              await copyText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </IconButton>
        <IconButton
          title="Refresh inspector"
          onClick={() => setVersion((v) => v + 1)}
        >
          <RefreshCw size={13} />
        </IconButton>
      </div>
      <label className="inspector-search">
        <Search size={13} />
        <input
          placeholder="Search property…"
          aria-label="Search JSON property"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setExpanded(true);
          }}
        />
        <kbd>⌕</kbd>
      </label>
      <div className="json-content">
        {compact ? (
          <pre>{text}</pre>
        ) : (
          <JsonTree
            key={version}
            value={records}
            expanded={expanded}
            search={search}
          />
        )}{" "}
        {error && <p className="form-error">{error}</p>}
      </div>
      <footer className="inspector-footer">
        <span>
          <i className="live-dot" />
          Synced with workspace
        </span>
        {records.length === 1 && (
          <IconButton
            title="Edit inspected record"
            onClick={() => onEdit(records[0])}
          >
            <Braces size={13} />
          </IconButton>
        )}
      </footer>
    </section>
  );
}
