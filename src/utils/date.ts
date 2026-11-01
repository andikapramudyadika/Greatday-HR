import type { AttendanceRecord, Period } from "../types";
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function localTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
export const dateLabel = (value: string, long = false) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("id-ID", {
    weekday: long ? "long" : "short",
    day: "2-digit",
    month: long ? "long" : "short",
    year: "numeric",
  });
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(`${value}T12:00:00`);
  return !isNaN(d.getTime()) && localDate(d) === value;
}
export function minutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
export function workingMinutes(r: AttendanceRecord) {
  return r.check_in && r.check_out
    ? minutes(r.check_out) - minutes(r.check_in)
    : 0;
}
export function duration(value: number) {
  return `${Math.floor(value / 60)}j ${value % 60}m`;
}
export function inPeriod(r: AttendanceRecord, p: Period) {
  return p.mode === "month"
    ? r.attendance_date.startsWith(p.month)
    : r.attendance_date >= p.start && r.attendance_date <= p.end;
}
export function moveMonth(month: string, amount: number) {
  const d = new Date(`${month}-01T12:00:00`);
  d.setMonth(d.getMonth() + amount);
  return localDate(d).slice(0, 7);
}
