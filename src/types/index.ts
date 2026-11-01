export interface Employee {
  id: string;
  name: string;
  position: string;
  branch: string;
}
export type AttendanceStatus = "present" | "incomplete" | "absent" | "off";
export interface AttendanceRecord {
  employee_id: string;
  employee_name: string;
  attendance_date: string;
  shift: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  notes: string;
}
export interface Database {
  employee: Employee;
  records: AttendanceRecord[];
}
export interface Preferences {
  theme: "dark" | "monochrome" | "rainbow";
  fontSize: number;
  fontFamily: string;
  terminalFontSize: number;
  speed: number;
  autoScroll: boolean;
  layout: "split" | "stacked";
  compact: boolean;
}
export type LogLevel = "info" | "success" | "warning" | "error" | "debug";
export interface Log {
  id: number;
  time: string;
  level: LogLevel;
  message: string;
}
export interface Period {
  mode: "month" | "custom";
  month: string;
  start: string;
  end: string;
}
