import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Fingerprint,
  Pencil,
  ArrowRight,
  Check,
  Settings2,
} from "lucide-react";
import { useWorkspace } from "../../hooks/useWorkspace";
import { emptyRecord } from "../../services/attendance-engine";
import {
  dateLabel,
  duration,
  localTime,
  workingMinutes,
} from "../../utils/date";
import { IconButton, Modal, StatusBadge } from "../shared";
import { RecordEditor } from "../attendance/RecordEditor";
export function Dashboard({
  today,
  onSettings,
  onEditScript,
}: {
  today: string;
  onSettings: () => void;
  onEditScript: () => void;
}) {
  const { db, update } = useWorkspace();
  const [recording, setRecording] = useState(false),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!db) return null;
  const r =
    db.records.find((r) => r.attendance_date === today) ||
    emptyRecord(db.employee, today);
  const initials = db.employee.name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  const capture = async (type: "checkIn" | "checkOut") => {
    setBusy(true);
    setError("");
    try {
      await update({ date: today, [type]: localTime() });
      setRecording(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <aside className="dashboard">
      <div className="panel-section-label">
        <span>EMPLOYEE OVERVIEW</span>
        <IconButton title="Employee settings" onClick={onSettings}>
          <Settings2 size={15} />
        </IconButton>
      </div>
      <section className="identity">
        <span className="avatar">{initials}</span>
        <div>
          <h2>{db.employee.name}</h2>
          <p>{db.employee.position}</p>
        </div>
      </section>
      <div className="dashboard-divider" />
      <section className="today-card">
        <div className="section-caption">
          <span className="eyebrow">TODAY’S ATTENDANCE</span>
          <span className="live-dot" />
        </div>
        <h3>{dateLabel(today, true)}</h3>
        <div className="shift-line">
          <CalendarDays size={14} />
          <span>{r.shift}</span>
        </div>
        <div className="time-grid">
          {(
            [
              { key: "check_in", label: "Check in", icon: ArrowDownLeft },
              { key: "check_out", label: "Check out", icon: ArrowUpRight },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <div className={`time-cell ${r[key] ? "available" : ""}`} key={key}>
              <span className="time-label">
                <Icon size={15} />
                {label}
              </span>
              <strong>{r[key] || "--:--"}</strong>
              <span className="time-hint">
                <i />
                {r[key] ? "Recorded" : "Not recorded"}
              </span>
            </div>
          ))}
        </div>
        <div className="attendance-state">
          <span>Attendance status</span>
          <StatusBadge status={r.status} />
        </div>
        <button
          className="record-button"
          onClick={() => {
            setError("");
            setRecording(true);
          }}
        >
          <Fingerprint size={19} />
          Rekam Waktu
          <ArrowRight size={16} />
        </button>
        <div className="record-note">
          <Clock3 size={12} />
          <span>
            Waktu perangkat · {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </span>
        </div>
      </section>
      <section className="today-detail">
        <div className="section-caption">
          <span className="eyebrow">TODAY’S RECORD</span>
          <IconButton
            title="Edit today's record"
            onClick={() => setEditing(true)}
          >
            <Pencil size={14} />
          </IconButton>
        </div>
        <div className="timeline">
          <div className={r.check_in ? "done" : ""}>
            <span className="timeline-dot">
              {r.check_in && <Check size={10} />}
            </span>
            <div>
              <strong>Check in</strong>
              <p>
                {r.check_in ? "Attendance recorded" : "Waiting for check in"}
              </p>
            </div>
            <time>{r.check_in || "--:--"}</time>
          </div>
          <div className={r.check_out ? "done" : ""}>
            <span className="timeline-dot">
              {r.check_out && <Check size={10} />}
            </span>
            <div>
              <strong>Check out</strong>
              <p>
                {r.check_out ? "Attendance recorded" : "Waiting for check out"}
              </p>
            </div>
            <time>{r.check_out || "--:--"}</time>
          </div>
        </div>
        <div className="duration-row">
          <span>Working duration</span>
          <strong>{duration(workingMinutes(r))}</strong>
        </div>
        {r.notes && <p className="attendance-notes">{r.notes}</p>}
      </section>
      <div className="console-shortcut">
        <span className="eyebrow">EDIT WITH CODE</span>
        <code>
          attendanceEditor.update({"{"}…{"}"})
        </code>
        <button onClick={onEditScript}>
          Open attendance-editor.js
          <ArrowUpRight size={14} />
        </button>
      </div>
      {editing && <RecordEditor record={r} onClose={() => setEditing(false)} />}
      {recording && (
        <Modal title="Rekam waktu" onClose={() => setRecording(false)}>
          <p className="muted">
            {dateLabel(today, true)} · {localTime()}
          </p>
          <div className="capture-options">
            <button
              disabled={busy || !!r.check_in}
              onClick={() => capture("checkIn")}
            >
              <ArrowDownLeft />
              <strong>Check in</strong>
              <span>{r.check_in || "Catat jam masuk sekarang"}</span>
            </button>
            <button
              disabled={busy || !r.check_in || !!r.check_out}
              onClick={() => capture("checkOut")}
            >
              <ArrowUpRight />
              <strong>Check out</strong>
              <span>{r.check_out || "Catat jam keluar sekarang"}</span>
            </button>
          </div>
          {r.check_in && r.check_out && (
            <p className="muted">
              Kedua waktu sudah tercatat. Gunakan editor untuk melakukan
              koreksi.
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
    </aside>
  );
}
