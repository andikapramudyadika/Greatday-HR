import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { Period } from "../../types";
import { moveMonth } from "../../utils/date";
import { IconButton } from "../shared";
export function PeriodSelector({
  period,
  onChange,
  count,
}: {
  period: Period;
  onChange: (p: Period) => void;
  count: number;
}) {
  return (
    <div className="period-bar">
      <span className="period-label">
        <CalendarDays size={14} />
        ATTENDANCE PERIOD
      </span>
      <div className="period-controls">
        <select
          aria-label="Period mode"
          value={period.mode}
          onChange={(e) =>
            onChange({
              ...period,
              mode: e.currentTarget.value as Period["mode"],
            })
          }
        >
          <option value="month">Monthly</option>
          <option value="custom">Custom range</option>
        </select>
        {period.mode === "month" ? (
          <div className="month-control">
            <IconButton
              title="Previous month"
              onClick={() =>
                onChange({ ...period, month: moveMonth(period.month, -1) })
              }
            >
              <ChevronLeft size={14} />
            </IconButton>
            <input
              aria-label="Attendance month"
              type="month"
              value={period.month}
              min="1900-01"
              max="9999-12"
              onInput={(e) => {
                if (/^\d{4}-\d{2}$/.test(e.currentTarget.value))
                  onChange({ ...period, month: e.currentTarget.value });
              }}
            />
            <IconButton
              title="Next month"
              onClick={() =>
                onChange({ ...period, month: moveMonth(period.month, 1) })
              }
            >
              <ChevronRight size={14} />
            </IconButton>
          </div>
        ) : (
          <div className="date-range">
            <input
              aria-label="Start date"
              type="date"
              value={period.start}
              max={period.end}
              onInput={(e) => {
                if (e.currentTarget.value)
                  onChange({
                    ...period,
                    start: e.currentTarget.value,
                    end:
                      e.currentTarget.value > period.end
                        ? e.currentTarget.value
                        : period.end,
                  });
              }}
            />
            <span>→</span>
            <input
              aria-label="End date"
              type="date"
              min={period.start}
              value={period.end}
              onInput={(e) => {
                if (e.currentTarget.value)
                  onChange({
                    ...period,
                    end: e.currentTarget.value,
                    start:
                      e.currentTarget.value < period.start
                        ? e.currentTarget.value
                        : period.start,
                  });
              }}
            />
          </div>
        )}
      </div>
      <span className="period-count">
        <i />
        {count} record{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
