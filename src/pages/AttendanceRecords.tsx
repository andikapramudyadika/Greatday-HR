import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Pencil,
  Copy,
  Trash2,
  Eye,
  Clock3,
  CalendarDays,
  Download,
  FileBarChart2,
  ArrowDownUp,
} from "lucide-react";
import type { AttendanceRecord } from "../types";
import { useWorkspace } from "../hooks/useWorkspace";
import { emptyRecord, makeReport } from "../services/attendance-engine";
import { dateLabel, duration, localDate, workingMinutes } from "../utils/date";
import {
  Confirm,
  IconButton,
  Modal,
  StatusBadge,
  download,
} from "../components/shared";
import { RecordEditor } from "../components/attendance/RecordEditor";
export function AttendanceRecords({
  records,
  onEdit,
}: {
  records: AttendanceRecord[];
  onEdit: (record: AttendanceRecord) => void;
}) {
  const { db, remove } = useWorkspace();
  const [search, setSearch] = useState(""),
    [ascending, setAscending] = useState(false),
    [deleting, setDeleting] = useState<AttendanceRecord | null>(null),
    [viewing, setViewing] = useState<AttendanceRecord | null>(null),
    [creating, setCreating] = useState<AttendanceRecord | null>(null),
    [report, setReport] = useState(false);
  const visible = records
    .filter((r) =>
      `${r.attendance_date} ${r.employee_name} ${r.notes} ${r.status} ${r.shift}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        (ascending ? 1 : -1) *
        a.attendance_date.localeCompare(b.attendance_date),
    );
  const nextFreeDate = (record: AttendanceRecord) => {
    const d = new Date(`${record.attendance_date}T12:00:00`);
    do {
      d.setDate(d.getDate() + 1);
    } while (db?.records.some((r) => r.attendance_date === localDate(d)));
    return { ...record, attendance_date: localDate(d) };
  };
  return (
    <section className="records-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">ATTENDANCE DATABASE</span>
          <h2>
            Attendance records<span>{records.length}</span>
          </h2>
          <p>Inspect and refine your attendance history.</p>
        </div>
        <div className="heading-actions">
          <button onClick={() => setReport(true)}>
            <FileBarChart2 size={15} />
            Report
          </button>
          <button
            className="primary"
            onClick={() => setCreating(emptyRecord(db!.employee))}
          >
            <Plus size={15} />
            New record
          </button>
        </div>
      </header>
      <div className="records-toolbar">
        <label className="search-field">
          <Search size={15} />
          <input
            aria-label="Search attendance records"
            placeholder="Search date, status, or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div>
          <IconButton
            title="Toggle date sort"
            onClick={() => setAscending(!ascending)}
          >
            <ArrowDownUp size={15} />
          </IconButton>
          <IconButton
            title="Export selected period"
            onClick={() => download("attendance-period.json", records)}
          >
            <Download size={15} />
          </IconButton>
        </div>
      </div>
      <div className="records-list">
        {visible.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={30} />
            <h3>No records found</h3>
            <p>Choose another period or create an attendance record.</p>
          </div>
        ) : (
          visible.map((r) => (
            <article className="attendance-record" key={r.attendance_date}>
              <header>
                <div className="record-employee">
                  <span className="avatar tiny">
                    {db!.employee.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span>{r.employee_name}</span>
                </div>
                <StatusBadge status={r.status} />
              </header>
              <div className="record-body">
                <div className="record-date">
                  <span className="eyebrow">TANGGAL</span>
                  <h3>{dateLabel(r.attendance_date)}</h3>
                  <p>{r.shift}</p>
                </div>
                <div className="record-times">
                  <div>
                    <span>
                      <ArrowDownLeft size={13} />
                      Check in
                    </span>
                    <strong className={r.check_in ? "green" : ""}>
                      {r.check_in || "--:--"}
                    </strong>
                  </div>
                  <div>
                    <span>
                      <ArrowUpRight size={13} />
                      Check out
                    </span>
                    <strong className={r.check_out ? "green" : ""}>
                      {r.check_out || "--:--"}
                    </strong>
                  </div>
                </div>
                <div className="record-durations">
                  <span>
                    <Clock3 size={13} />
                    {duration(workingMinutes(r))} worked
                  </span>
                  <span>
                    {duration(Math.max(0, workingMinutes(r) - 480))} overtime
                  </span>
                </div>
              </div>
              <footer>
                <span className="record-tags">{r.notes || "No notes"}</span>
                <div>
                  <IconButton
                    title={`View ${r.attendance_date}`}
                    onClick={() => setViewing(r)}
                  >
                    <Eye size={14} />
                  </IconButton>
                  <IconButton
                    title={`Edit ${r.attendance_date}`}
                    onClick={() => onEdit(r)}
                  >
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    title={`Duplicate ${r.attendance_date}`}
                    onClick={() => setCreating(nextFreeDate(r))}
                  >
                    <Copy size={14} />
                  </IconButton>
                  <IconButton
                    title={`Delete ${r.attendance_date}`}
                    onClick={() => setDeleting(r)}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </footer>
            </article>
          ))
        )}
      </div>
      {deleting && (
        <Confirm
          title="Delete attendance record?"
          message={`Record ${dateLabel(deleting.attendance_date)} akan dihapus dari penyimpanan lokal.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove(deleting.attendance_date)}
        />
      )}
      {viewing && (
        <RecordEditor
          record={viewing}
          readOnly
          onClose={() => setViewing(null)}
        />
      )}
      {creating && (
        <RecordEditor
          record={creating}
          newRecord
          onClose={() => setCreating(null)}
        />
      )}
      {report && (
        <Modal title="Attendance report" onClose={() => setReport(false)}>
          <p className="muted">
            Ringkasan periode pilihan · {records.length} record
          </p>
          <div className="report-grid">
            {Object.entries(makeReport(records)).map(([key, value]) => (
              <div key={key}>
                <span>{key.replaceAll("_", " ")}</span>
                <strong>
                  {key.endsWith("minutes") ? duration(value) : value}
                </strong>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button
              onClick={() =>
                download("attendance-report.json", {
                  generated_at: new Date().toISOString(),
                  report: makeReport(records),
                  records,
                })
              }
            >
              <Download size={15} />
              Export report
            </button>
            <button className="primary" onClick={() => setReport(false)}>
              Done
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
