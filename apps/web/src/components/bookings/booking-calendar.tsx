'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Booking } from '@/lib/api-client';
import { useTheme } from '@/lib/theme-context';

interface BookingCalendarProps {
  bookings: Booking[];
  onBookingClick?: (booking: Booking) => void;
}

type ViewMode = 'month' | 'week';

const DAYS_MIN   = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const EVENT_COLORS = [
  { pill: 'bg-violet-500', light: 'bg-violet-100 text-violet-700', dark: 'bg-violet-900/70 text-violet-300' },
  { pill: 'bg-blue-500',    light: 'bg-blue-100 text-blue-700',     dark: 'bg-blue-900/70 text-blue-300'    },
  { pill: 'bg-emerald-500', light: 'bg-emerald-100 text-emerald-700', dark: 'bg-emerald-900/70 text-emerald-300' },
  { pill: 'bg-amber-500',   light: 'bg-amber-100 text-amber-700',   dark: 'bg-amber-900/70 text-amber-300'  },
  { pill: 'bg-rose-500',    light: 'bg-rose-100 text-rose-700',     dark: 'bg-rose-900/70 text-rose-300'    },
];

function getEventColor(id: string) {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return EVENT_COLORS[hash % EVENT_COLORS.length];
}

const HOUR_HEIGHT = 60; // px per hour

function formatHour(h: number) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(start: string, end: string) {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() &&
         a.getMonth() === b.getMonth() &&
         a.getFullYear() === b.getFullYear();
}

export function BookingCalendar({ bookings, onBookingClick }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const { isDark } = useTheme();
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Live clock — update every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll to current time when entering week view
  useEffect(() => {
    if (viewMode === 'week' && scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (now.getHours() - 1.5) * HOUR_HEIGHT);
    }
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ──────────────────────────────────────
  const goToPrev = () => {
    const d = new Date(currentDate);
    viewMode === 'month' ? d.setMonth(d.getMonth() - 1) : d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };
  const goToNext = () => {
    const d = new Date(currentDate);
    viewMode === 'month' ? d.setMonth(d.getMonth() + 1) : d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };

  // ── Computed day arrays ──────────────────────────────
  const miniDays = useMemo(() => {
    const y = currentDate.getFullYear(), mo = currentDate.getMonth();
    const firstDow = new Date(y, mo, 1).getDay();
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const daysInPrev  = new Date(y, mo, 0).getDate();
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = firstDow - 1; i >= 0; i--)
      cells.push({ date: new Date(y, mo - 1, daysInPrev - i), isCurrentMonth: false });
    for (let i = 1; i <= daysInMonth; i++)
      cells.push({ date: new Date(y, mo, i), isCurrentMonth: true });
    while (cells.length < 42)
      cells.push({ date: new Date(y, mo + 1, cells.length - firstDow - daysInMonth + 1), isCurrentMonth: false });
    return cells;
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const y = currentDate.getFullYear(), mo = currentDate.getMonth();
    const firstDay = new Date(y, mo, 1);
    const lastDay  = new Date(y, mo + 1, 0);
    const days: (Date | null)[] = Array(firstDay.getDay()).fill(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(y, mo, i));
    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(d.getDate() + i); return d;
    });
  }, [currentDate]);

  // ── Helpers ─────────────────────────────────────────
  const getBookingsForDate = (date: Date) =>
    bookings.filter((b) => {
      const bS = new Date(b.startTime), bE = new Date(b.endTime);
      const dS = new Date(date); dS.setHours(0, 0, 0, 0);
      const dE = new Date(date); dE.setHours(23, 59, 59, 999);
      return bS <= dE && bE >= dS;
    });

  const datesWithBookings = useMemo(() => {
    const s = new Set<string>();
    bookings.forEach((b) => {
      const d = new Date(b.startTime);
      s.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return s;
  }, [bookings]);

  const hasBookings = (d: Date) =>
    datesWithBookings.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);

  const getBookingStyle = (b: Booking) => {
    const s = new Date(b.startTime), e = new Date(b.endTime);
    const sh = s.getHours() + s.getMinutes() / 60;
    const eh = e.getHours() + e.getMinutes() / 60;
    return { top: `${sh * HOUR_HEIGHT}px`, height: `${Math.max((eh - sh) * HOUR_HEIGHT, 22)}px` };
  };

  const nowTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
  const isCurrentWeek = weekDays.some((d) => isSameDay(d, now));
  const selectedDayBookings = getBookingsForDate(selectedDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const headerTitle =
    viewMode === 'month'
      ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : `${MONTHS_SHORT[weekDays[0].getMonth()]} ${weekDays[0].getDate()} – ${MONTHS_SHORT[weekDays[6].getMonth()]} ${weekDays[6].getDate()}, ${currentDate.getFullYear()}`;

  // ── Theme shorthand helpers ──────────────────────────
  const cx = {
    root:        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-gray-200 text-gray-900',
    header:      isDark ? 'border-zinc-800'            : 'border-gray-100',
    title:       isDark ? 'text-zinc-100'              : 'text-gray-900',
    navBtn:      isDark ? 'text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700',
    todayBtn:    isDark ? 'bg-violet-950/60 text-violet-400 border-violet-800 hover:bg-violet-900/50' : 'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100',
    toggleWrap:  isDark ? 'bg-zinc-800'                : 'bg-gray-100',
    toggleOn:    isDark ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'bg-white text-gray-900 shadow-sm',
    toggleOff:   isDark ? 'text-zinc-500 hover:text-zinc-300'   : 'text-gray-500 hover:text-gray-700',
    sidebar:     isDark ? 'bg-zinc-900 border-zinc-800'         : 'bg-gray-50 border-gray-100',
    divider:     isDark ? 'border-zinc-800'            : 'border-gray-100',
    miniLabel:   isDark ? 'text-zinc-600'              : 'text-gray-400',
    miniDay:     isDark ? 'text-zinc-400 hover:bg-zinc-800'     : 'text-gray-600 hover:bg-gray-200',
    miniMuted:   isDark ? 'text-zinc-700'              : 'text-gray-300',
    miniSel:     isDark ? 'bg-zinc-700 text-zinc-100'           : 'bg-gray-200 text-gray-900',
    dayHeader:   isDark ? 'bg-zinc-900 border-zinc-800'         : 'bg-gray-50 border-gray-100',
    dayHeaderTxt:isDark ? 'text-zinc-600'              : 'text-gray-400',
    todayCol:    isDark ? 'bg-violet-950/20 border-zinc-800'    : 'bg-violet-50/30 border-gray-100',
    normalCol:   isDark ? 'bg-zinc-950 border-zinc-800'         : 'bg-white border-gray-100',
    todayHdr:    isDark ? 'text-violet-400'            : 'text-violet-500',
    todayCircle: 'bg-violet-600 text-white',
    cellToday:   isDark ? 'bg-violet-950/25 border-zinc-800'    : 'bg-violet-50/40 border-gray-100',
    cellNormal:  isDark ? 'bg-zinc-950 border-zinc-800 hover:bg-zinc-900' : 'bg-white border-gray-100 hover:bg-gray-50',
    cellOut:     isDark ? 'bg-zinc-900/50 border-zinc-800'      : 'bg-gray-50/50 border-gray-100',
    hourLine:    isDark ? 'border-zinc-800/50'         : 'border-gray-100',
    timeGutter:  isDark ? 'border-zinc-800 bg-zinc-950 text-zinc-600' : 'border-gray-100 bg-white text-gray-400',
    eventSidebar:isDark ? 'border-zinc-700'            : 'border-transparent',
  };

  return (
    <div className={`rounded-2xl border overflow-hidden flex flex-col h-[700px] ${cx.root}`}>

      {/* ═══════════════════ HEADER ═══════════════════ */}
      <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 flex-shrink-0 ${cx.header}`}>
        <div className="flex items-center gap-2 min-w-0">
          <h2 className={`text-lg font-bold truncate ${cx.title}`}>{headerTitle}</h2>
          <div className="flex items-center flex-shrink-0">
            <button onClick={goToPrev} className={`p-1.5 rounded-lg transition-colors ${cx.navBtn}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={goToNext} className={`p-1.5 rounded-lg transition-colors ${cx.navBtn}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <button onClick={goToToday}
            className={`flex-shrink-0 px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${cx.todayBtn}`}>
            Today
          </button>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View toggle */}
          <div className={`flex items-center rounded-xl p-1 gap-0.5 ${cx.toggleWrap}`}>
            {(['month', 'week'] as ViewMode[]).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewMode === mode ? cx.toggleOn : cx.toggleOff
                }`}>
                {mode === 'month' ? 'Month' : 'Week'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════ BODY ═══════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ───── SIDEBAR ───── */}
        <div className={`w-44 flex-shrink-0 border-r flex flex-col ${cx.sidebar}`}>

          {/* Mini calendar */}
          <div className="p-3 flex-shrink-0">
            <p className={`text-[11px] font-bold uppercase tracking-widest text-center mb-2 ${cx.miniLabel}`}>
              {MONTHS_SHORT[currentDate.getMonth()]} {currentDate.getFullYear()}
            </p>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS_MIN.map((d, i) => (
                <div key={i} className={`text-[10px] font-bold text-center ${cx.miniLabel}`}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {miniDays.map(({ date, isCurrentMonth }, idx) => {
                const isT  = isSameDay(date, now);
                const isSel = isSameDay(date, selectedDate) && !isT;
                const dot  = hasBookings(date) && isCurrentMonth;
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <button
                      onClick={() => { setSelectedDate(date); setCurrentDate(date); }}
                      className={`w-6 h-6 text-[11px] font-semibold rounded-full flex items-center justify-center transition-colors ${
                        isT   ? cx.todayCircle
                        : isSel ? cx.miniSel
                        : isCurrentMonth ? cx.miniDay
                        : cx.miniMuted
                      }`}
                    >
                      {date.getDate()}
                    </button>
                    <div className={`h-1 w-1 rounded-full mt-0.5 ${dot ? 'bg-violet-500' : 'bg-transparent'}`} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`mx-3 border-t flex-shrink-0 ${cx.divider}`} />

          {/* Selected-day events */}
          <div className="flex-1 overflow-y-auto p-3 min-h-0">
            <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${cx.miniLabel}`}>
              {isSameDay(selectedDate, now)
                ? "Today"
                : `${MONTHS_SHORT[selectedDate.getMonth()]} ${selectedDate.getDate()}`}
            </p>

            {selectedDayBookings.length === 0 ? (
              <p className={`text-[11px] ${cx.miniMuted}`}>No events</p>
            ) : (
              <div className="space-y-1.5">
                {selectedDayBookings.map((b) => {
                  const color = getEventColor(b.id);
                  return (
                    <button key={b.id} onClick={() => onBookingClick?.(b)}
                      className={`w-full text-left rounded-lg px-2 py-1.5 border transition-all hover:brightness-95 ${
                        isDark ? `${color.dark} ${cx.eventSidebar}` : `${color.light} ${cx.eventSidebar}`
                      }`}>
                      <p className="text-[11px] font-bold leading-tight truncate">{b.title}</p>
                      <p className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                        {formatTime(b.startTime)} · {formatDuration(b.startTime, b.endTime)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ───── MAIN VIEW ───── */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">

          {/* ── MONTH VIEW ── */}
          {viewMode === 'month' ? (
            <div className="flex-1 overflow-y-auto">
              {/* Day-of-week header row */}
              <div className={`grid grid-cols-7 border-b sticky top-0 z-10 ${cx.dayHeader}`}>
                {DAYS_SHORT.map((d) => (
                  <div key={d} className={`py-3 text-center text-[11px] font-bold uppercase tracking-wider ${cx.dayHeaderTxt}`}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {monthDays.map((date, idx) => {
                  const dayB   = date ? getBookingsForDate(date) : [];
                  const inMo   = date?.getMonth() === currentDate.getMonth();
                  const isT    = date ? isSameDay(date, now) : false;
                  const isSel  = date ? isSameDay(date, selectedDate) && !isT : false;

                  return (
                    <div key={idx}
                      onClick={() => date && setSelectedDate(date)}
                      className={`min-h-[110px] border-b border-r p-2 cursor-pointer transition-colors last:border-r-0 ${
                        isT  ? cx.cellToday
                        : inMo ? cx.cellNormal
                        : cx.cellOut
                      } ${isSel ? isDark ? 'ring-1 ring-inset ring-violet-700' : 'ring-1 ring-inset ring-violet-300' : ''}`}
                    >
                      {date && (
                        <>
                          <div className="mb-1.5">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              isT  ? cx.todayCircle
                              : inMo ? isDark ? 'text-zinc-300' : 'text-gray-700'
                              : isDark ? 'text-zinc-700' : 'text-gray-300'
                            }`}>
                              {date.getDate()}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {dayB.slice(0, 2).map((b) => {
                              const color = getEventColor(b.id);
                              return (
                                <button key={b.id}
                                  onClick={(e) => { e.stopPropagation(); onBookingClick?.(b); }}
                                  className={`w-full text-left text-[11px] px-1.5 py-0.5 rounded-md ${color.pill} text-white truncate font-bold hover:brightness-110 transition-all`}>
                                  {b.title}
                                </button>
                              );
                            })}
                            {dayB.length > 2 && (
                              <p className={`text-[10px] font-semibold pl-1 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
                                +{dayB.length - 2} more
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          ) : (
            /* ── WEEK VIEW ── */
            <div className="flex flex-col flex-1 overflow-hidden">

              {/* Sticky day headers */}
              <div className={`flex border-b flex-shrink-0 ${cx.header}`}>
                <div className={`w-14 flex-shrink-0 border-r ${cx.header}`} />
                {weekDays.map((date, idx) => {
                  const isT = isSameDay(date, now);
                  return (
                    <div key={idx}
                      onClick={() => setSelectedDate(date)}
                      className={`flex-1 py-3 flex flex-col items-center gap-0.5 border-r last:border-r-0 cursor-pointer transition-colors ${
                        isT ? cx.todayCol : cx.normalCol
                      }`}>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${
                        isT ? cx.todayHdr : cx.dayHeaderTxt
                      }`}>
                        {DAYS_SHORT[date.getDay()]}
                      </span>
                      <span className={`text-sm font-bold leading-none ${
                        isT
                          ? 'w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center'
                          : isDark ? 'text-zinc-200' : 'text-gray-800'
                      }`}>
                        {date.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Scrollable time grid */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
                <div className="flex" style={{ height: `${24 * HOUR_HEIGHT}px` }}>

                  {/* Time gutter */}
                  <div className={`w-14 flex-shrink-0 border-r select-none ${cx.timeGutter}`}>
                    {hours.map((h) => (
                      <div key={h} className="text-[10px] font-medium text-right pr-2 -mt-2"
                        style={{ height: `${HOUR_HEIGHT}px` }}>
                        {formatHour(h)}
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  <div className="flex-1 grid grid-cols-7">
                    {weekDays.map((date, idx) => {
                      const dayB = getBookingsForDate(date);
                      const isT  = isSameDay(date, now);
                      return (
                        <div key={idx}
                          className={`relative border-r last:border-r-0 ${isT ? cx.todayCol : cx.normalCol}`}>
                          {/* Hour grid lines */}
                          {hours.map((h) => (
                            <div key={h} className={`border-b ${cx.hourLine}`}
                              style={{ height: `${HOUR_HEIGHT}px` }} />
                          ))}
                          {/* Events */}
                          {dayB.map((b) => {
                            const style = getBookingStyle(b);
                            const color = getEventColor(b.id);
                            const start = new Date(b.startTime);
                            return (
                              <button key={b.id}
                                onClick={() => onBookingClick?.(b)}
                                className={`absolute inset-x-0.5 ${color.pill} text-white text-xs rounded-lg px-1.5 py-1 overflow-hidden transition-all hover:brightness-110 hover:shadow-lg cursor-pointer z-10`}
                                style={style}>
                                <div className="font-bold truncate leading-tight">{b.title}</div>
                                <div className="opacity-75 text-[10px] leading-tight">
                                  {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Current time indicator */}
                {isCurrentWeek && (
                  <div
                    className="absolute left-14 right-0 z-20 pointer-events-none flex items-center"
                    style={{ top: `${nowTop}px` }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0 shadow-sm" />
                    <div className="flex-1 h-px bg-red-500" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
