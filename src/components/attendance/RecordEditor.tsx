import { useState } from "react";
import { Save, CalendarDays } from "lucide-react";
import type { AttendanceRecord } from "../../types";
import { useWorkspace } from "../../hooks/useWorkspace";
import { shifts, validateRecord } from "../../services/attendance-engine";
import { Modal, StatusBadge } from "../shared";
import { dateLabel, duration, workingMinutes } from "../../utils/date";
export function RecordEditor({
  record,
  onClose,
  readOnly = false,
  newRecord = false,
}: {
  record: AttendanceRecord;
  onClose: () => void;
  readOnly?: boolean;
  newRecord?: boolean;
}) {
  const { saveRecord, db } = useWorkspace();
  const [form, setForm] = useState({ ...record });
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  return (
    <Modal
      title={
        readOnly
          ? "Attendance detail"
          : newRecord
            ? "New attendance record"
            : "Edit attendance record"
      }
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError("");
          try {
            if (
              newRecord &&
              db?.records.some(
                (r) => r.attendance_date === form.attendance_date,
              )
            )
              throw new Error(
                "Tanggal ini sudah memiliki record. Edit record tersebut.",
              );
            await saveRecord(validateRecord(form));
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="record-person">
          <span className="avatar small">
            {form.employee_name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div>
            <strong>{form.employee_name}</strong>
            <span>{form.employee_id}</span>
          </div>
          <StatusBadge status={form.status} />
        </div>
        <div className="form-grid">
          <label className="full">
            Tanggal
            <input
              aria-label="Record date"
              type="date"
              required
              value={form.attendance_date}
              disabled={readOnly || !newRecord}
              onInput={(e) =>
                setForm({ ...form, attendance_date: e.currentTarget.value })
              }
            />
          </label>
          <label className="full">
            Shift
            <select
              value={form.shift}
              disabled={readOnly}
              onChange={(e) => setForm({ ...form, shift: e.target.value })}
            >
              {shifts.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Check in
            <input
              aria-label="Check in time"
              type="time"
              value={form.check_in || ""}
              disabled={readOnly}
              onInput={(e) =>
                setForm({ ...form, check_in: e.currentTarget.value || null })
              }
            />
          </label>
          <label>
            Check out
            <input
              aria-label="Check out time"
              type="time"
              value={form.check_out || ""}
              disabled={readOnly}
              onInput={(e) =>
                setForm({ ...form, check_out: e.currentTarget.value || null })
              }
            />
          </label>
          <label className="full">
            Keterangan
            <textarea
              value={form.notes}
              maxLength={500}
              disabled={readOnly}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Add an attendance note…"
            />
          </label>
        </div>
        {readOnly && (
          <p className="detail-summary">
            <CalendarDays size={15} />
            {dateLabel(form.attendance_date)} · {duration(workingMinutes(form))}{" "}
            worked · {duration(Math.max(0, workingMinutes(form) - 480))}{" "}
            overtime
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            {readOnly ? "Close" : "Cancel"}
          </button>
          {!readOnly && (
            <button className="primary" disabled={saving}>
              <Save size={14} />
              {saving ? "Saving…" : "Save record"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
