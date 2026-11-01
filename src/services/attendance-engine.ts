import type { AttendanceRecord, Database, Employee } from "../types";
import { localDate, validDate, minutes, workingMinutes } from "../utils/date";
export const shifts = ["Regular Cabang Office Hour", "Shift OFF"];
export function statusFor(
  r: Pick<AttendanceRecord, "shift" | "check_in" | "check_out">,
): AttendanceRecord["status"] {
  if (r.check_in && r.check_out) return "present";
  if (r.check_in || r.check_out) return "incomplete";
  return r.shift === "Shift OFF" ? "off" : "absent";
}
export function validateRecord(record: unknown): AttendanceRecord {
  if (!record || typeof record !== "object" || Array.isArray(record))
    throw new Error("Record harus berupa objek.");
  const r = record as AttendanceRecord;
  if (!validDate(r.attendance_date))
    throw new Error("Tanggal tidak valid. Gunakan YYYY-MM-DD.");
  if (!shifts.includes(r.shift)) throw new Error("Shift tidak dikenali.");
  for (const key of ["check_in", "check_out"] as const) {
    if (
      r[key] !== null &&
      (typeof r[key] !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r[key]!))
    )
      throw new Error(`${key} harus HH:MM atau null.`);
  }
  if (r.check_out && !r.check_in)
    throw new Error("Isi jam masuk sebelum jam keluar.");
  if (r.check_in && r.check_out && minutes(r.check_out) < minutes(r.check_in))
    throw new Error(
      "Jam keluar harus setelah jam masuk pada tanggal yang sama.",
    );
  if (
    typeof r.employee_id !== "string" ||
    !r.employee_id.trim() ||
    typeof r.employee_name !== "string" ||
    !r.employee_name.trim()
  )
    throw new Error("Identitas karyawan wajib diisi.");
  if (typeof r.notes !== "string" || r.notes.length > 500)
    throw new Error("Keterangan maksimal 500 karakter.");
  return {
    employee_id: r.employee_id.trim(),
    employee_name: r.employee_name.trim(),
    attendance_date: r.attendance_date,
    shift: r.shift,
    check_in: r.check_in,
    check_out: r.check_out,
    status: statusFor(r),
    notes: r.notes,
  };
}
export function validateEmployee(value: unknown): Employee {
  const e = value as Employee;
  if (
    !e ||
    ["id", "name", "position", "branch"].some(
      (k) =>
        typeof e[k as keyof Employee] !== "string" ||
        !e[k as keyof Employee].trim() ||
        e[k as keyof Employee].length > 100,
    )
  )
    throw new Error("Semua identitas wajib diisi (maks. 100 karakter).");
  return Object.fromEntries(
    Object.entries(e)
      .filter(([k]) => ["id", "name", "position", "branch"].includes(k))
      .map(([k, v]) => [k, v.trim()]),
  ) as unknown as Employee;
}
export function validateDatabase(value: unknown): Database {
  const db = value as Database;
  const employee = validateEmployee(db?.employee);
  if (!Array.isArray(db?.records) || db.records.length > 20000)
    throw new Error("Daftar record tidak valid atau melebihi 20.000 record.");
  const records = db.records.map((r) =>
    validateRecord({
      ...r,
      employee_id: employee.id,
      employee_name: employee.name,
    }),
  );
  if (new Set(records.map((r) => r.attendance_date)).size !== records.length)
    throw new Error("Tanggal record duplikat. Satu record per tanggal.");
  return { employee, records };
}
export function emptyRecord(
  employee: Employee,
  date = localDate(),
): AttendanceRecord {
  return {
    employee_id: employee.id,
    employee_name: employee.name,
    attendance_date: date,
    shift:
      new Date(`${date}T12:00:00`).getDay() === 0 ? "Shift OFF" : shifts[0],
    check_in: null,
    check_out: null,
    status: new Date(`${date}T12:00:00`).getDay() === 0 ? "off" : "absent",
    notes: "",
  };
}
export function makeReport(records: AttendanceRecord[]) {
  const totalMinutes = records.reduce((n, r) => n + workingMinutes(r), 0);
  return {
    records: records.length,
    present: records.filter((r) => r.status === "present").length,
    incomplete: records.filter((r) => r.status === "incomplete").length,
    absent: records.filter((r) => r.status === "absent").length,
    off: records.filter((r) => r.status === "off").length,
    working_minutes: totalMinutes,
    overtime_minutes: records.reduce(
      (n, r) => n + Math.max(0, workingMinutes(r) - 480),
      0,
    ),
  };
}
