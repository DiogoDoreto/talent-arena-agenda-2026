import { useState, useCallback } from 'react'
import './App.css'
import eventsRaw from './events.json'

// ── Types ────────────────────────────────────────────────────────────────────

interface Event {
  id: number
  post_id: number
  title: string
  date: string
  time_slot: string
  stage: string
  speakers: string[]
  description: string
  topic: string
  language: string
  event_type: string
  pass_type: string
}

const events = eventsRaw as Event[]

// ── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['March 2', 'March 3', 'March 4']
const PX_PER_MIN = 2.4   // grid density — pixels per minute
const GUTTER_W = 58      // width of the time gutter column (px)
const COL_W = 180        // width of each stage column (px)

// Ordered stage list (keeps columns stable across days)
const ALL_STAGES = [
  'Visionary Stage',
  'XPRO stage',
  'XPRO Talks',
  'XPRO Lab',
  'Hotspot Talks',
  'Plug-in Talks',
  'Barcelona',
  'Focus Lab',
  'Frontier lab',
  'Skills Hub',
  'Meetup area',
  'Robotics',
  'Gaming',
]

// ── Time helpers ─────────────────────────────────────────────────────────────

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function parseSlot(slot: string): { start: number; end: number } {
  const [s, e] = slot.split('-')
  return { start: toMinutes(s), end: toMinutes(e) }
}

function fmtTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── Calendar export ──────────────────────────────────────────────────────────

// Talent Arena 2026 is in Barcelona (UTC+1 in March — CET, no DST yet)
const YEAR = 2026
const MONTH_MAP: Record<string, number> = {
  'January': 1, 'February': 2, 'March': 3, 'April': 4,
  'May': 5, 'June': 6, 'July': 7, 'August': 8,
  'September': 9, 'October': 10, 'November': 11, 'December': 12,
}

function toICSDate(date: string, hhmm: string): string {
  // date = "March 2", hhmm = "09:30"
  const [monthName, dayStr] = date.split(' ')
  const month = MONTH_MAP[monthName]
  const day = parseInt(dayStr, 10)
  const [h, m] = hhmm.split(':').map(Number)
  // Store as UTC — Barcelona is UTC+1 in March
  const utc = new Date(Date.UTC(YEAR, month - 1, day, h - 1, m, 0))
  return utc.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function generateICS(event: Event): string {
  const [startHHMM, endHHMM] = event.time_slot.split('-')
  const dtstart = toICSDate(event.date, startHHMM)
  const dtend   = toICSDate(event.date, endHHMM)
  const uid     = `talent-arena-2026-${event.post_id}@talentarena.co`
  const speakers = event.speakers.length > 0 ? `\nSpeakers: ${event.speakers.join(', ')}` : ''
  const summary  = event.title.replace(/,/g, '\\,').replace(/;/g, '\\;')
  const location = `${event.stage}, Talent Arena 2026, Barcelona`
  const description = `${event.event_type.toUpperCase()}${speakers}`
    .replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Talent Arena 2026//Agenda//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SUMMARY:${summary}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function downloadICS(event: Event): void {
  const ics = generateICS(event)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Sub-components ───────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  conference: 'Conference',
  talk: 'Talk',
  workshop: 'Workshop',
  meetup: 'Meetup',
  'robotics-gaming': 'Robotics / Gaming',
}

const LEGEND_ITEMS = [
  { type: 'conference', color: '#2d3560' },
  { type: 'talk', color: '#2d4a2d' },
  { type: 'workshop', color: '#4a3218' },
  { type: 'meetup', color: '#3a2850' },
  { type: 'robotics-gaming', color: '#1e4040' },
]

function EventCard({
  event,
  dayStart,
  colIndex,
  onClick,
}: {
  event: Event
  dayStart: number
  colIndex: number
  onClick: (e: Event) => void
}) {
  const { start, end } = parseSlot(event.time_slot)
  const rowStart = (start - dayStart) * PX_PER_MIN + 1
  const rowEnd   = (end   - dayStart) * PX_PER_MIN + 1
  const height   = rowEnd - rowStart

  return (
    <div
      className={`event-card type-${event.event_type}`}
      style={{
        gridColumn: colIndex + 2, // +2 because col 1 is the time gutter
        position: 'absolute',
        top: rowStart + 'px',
        height: Math.max(height - 4, 20) + 'px',
        left: GUTTER_W + colIndex * COL_W + 4 + 'px',
        width: COL_W - 8 + 'px',
      }}
      onClick={() => onClick(event)}
      title={event.title}
    >
      {event.pass_type === 'n-xpro' && (
        <span className="pass-badge xpro">XPRO</span>
      )}
      <div className="event-card-time">{event.time_slot}</div>
      <div className="event-card-title">{event.title}</div>
      {event.speakers.length > 0 && (
        <div className="event-card-speakers">
          {event.speakers.slice(0, 2).join(' · ')}
          {event.speakers.length > 2 && ` +${event.speakers.length - 2}`}
        </div>
      )}
      {height > 60 && event.topic && (
        <div className="event-card-topic">{event.topic}</div>
      )}
    </div>
  )
}

function EventModal({ event, onClose }: { event: Event; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className={`modal-type-tag type-${event.event_type}`}>
          {TYPE_LABELS[event.event_type] ?? event.event_type}
        </div>

        <h2>{event.title}</h2>

        <div className="modal-meta">
          <span className="modal-meta-item">
            <span className="icon">📅</span>
            {event.date}
          </span>
          <span className="modal-meta-item">
            <span className="icon">🕐</span>
            {event.time_slot}
          </span>
          <span className="modal-meta-item">
            <span className="icon">📍</span>
            {event.stage}
          </span>
          <span className="modal-meta-item">
            <span className="icon">🌐</span>
            {event.language}
          </span>
          {event.topic && (
            <span className="modal-meta-item">
              <span className="icon">🏷</span>
              {event.topic}
            </span>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-add-to-calendar" onClick={() => downloadICS(event)}>
            + Add to my calendar
          </button>
        </div>

        {event.speakers.length > 0 && (
          <div className="modal-speakers">
            <h3>Speakers</h3>
            <ul>
              {event.speakers.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {event.description && (
          <div
            className="modal-description"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
        )}
      </div>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [selectedDay, setSelectedDay] = useState(DAYS[0])
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)

  const dayEvents = events.filter(e => e.date === selectedDay)

  // Only show stages that have at least one event today
  const activeStages = ALL_STAGES.filter(s => dayEvents.some(e => e.stage === s))

  // Time range for the day
  const allTimes = dayEvents.map(e => parseSlot(e.time_slot))
  const dayStart = Math.min(...allTimes.map(t => t.start))
  const dayEnd   = Math.max(...allTimes.map(t => t.end))
  const totalMinutes = dayEnd - dayStart
  const totalHeight  = totalMinutes * PX_PER_MIN

  // Hour tick marks
  const hourTicks: number[] = []
  const firstHour = Math.ceil(dayStart / 60) * 60
  for (let m = firstHour; m <= dayEnd; m += 60) {
    hourTicks.push(m)
  }

  const handleCardClick = useCallback((e: Event) => setActiveEvent(e), [])
  const handleClose     = useCallback(() => setActiveEvent(null), [])

  const gridTemplateColumns = `${GUTTER_W}px ${activeStages.map(() => `${COL_W}px`).join(' ')}`

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-top">
          <h1>Talent Arena 2026</h1>
          <span className="subtitle">Barcelona · March 2–4</span>
        </div>
        <div className="day-selector">
          {DAYS.map(day => (
            <button
              key={day}
              className={`day-btn${selectedDay === day ? ' active' : ''}`}
              onClick={() => setSelectedDay(day)}
            >
              {day}
            </button>
          ))}
        </div>
      </header>

      {/* Legend */}
      <div className="legend">
        {LEGEND_ITEMS.map(({ type, color }) => (
          <span key={type} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            {TYPE_LABELS[type]}
          </span>
        ))}
      </div>

      {/* Scrollable grid area */}
      <div className="grid-scroll">
        <div
          className="agenda-grid"
          style={{
            gridTemplateColumns,
            position: 'relative',
          }}
        >
          {/* Sticky stage headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns,
              position: 'sticky',
              top: 0,
              zIndex: 20,
              background: '#13131a',
              borderBottom: '1px solid #2a2a3a',
            }}
          >
            <div className="stage-header-cell time-gutter">Time</div>
            {activeStages.map(stage => (
              <div key={stage} className="stage-header-cell">{stage}</div>
            ))}
          </div>

          {/* Grid body — absolutely positioned content inside a relative wrapper */}
          <div
            style={{
              gridColumn: `1 / ${activeStages.length + 2}`,
              position: 'relative',
              height: totalHeight + 'px',
            }}
          >
            {/* Stage column background stripes */}
            {activeStages.map((stage, i) => (
              <div
                key={stage}
                className="stage-col-bg"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: GUTTER_W + i * COL_W + 'px',
                  width: COL_W + 'px',
                  height: '100%',
                  borderRight: '1px solid #1a1a26',
                }}
              />
            ))}

            {/* Hour grid lines + time labels */}
            {hourTicks.map(m => {
              const top = (m - dayStart) * PX_PER_MIN
              return (
                <div key={m} style={{ position: 'absolute', top: top + 'px', left: 0, right: 0 }}>
                  {/* horizontal rule */}
                  <div
                    style={{
                      position: 'absolute',
                      left: GUTTER_W + 'px',
                      right: 0,
                      borderTop: '1px solid #1e1e2c',
                    }}
                  />
                  {/* time label */}
                  <div
                    className="time-label"
                    style={{
                      position: 'absolute',
                      left: 0,
                      width: GUTTER_W + 'px',
                      top: 0,
                    }}
                  >
                    {fmtTime(m)}
                  </div>
                </div>
              )
            })}

            {/* Half-hour minor ticks */}
            {hourTicks.map(m => {
              const halfM = m + 30
              if (halfM > dayEnd) return null
              const top = (halfM - dayStart) * PX_PER_MIN
              return (
                <div
                  key={`h${halfM}`}
                  style={{
                    position: 'absolute',
                    top: top + 'px',
                    left: GUTTER_W + 'px',
                    right: 0,
                    borderTop: '1px dashed #17172299',
                    pointerEvents: 'none',
                  }}
                />
              )
            })}

            {/* Event cards */}
            {dayEvents.map(event => {
              const colIndex = activeStages.indexOf(event.stage)
              if (colIndex === -1) return null
              return (
                <EventCard
                  key={event.post_id}
                  event={event}
                  dayStart={dayStart}
                  colIndex={colIndex}
                  onClick={handleCardClick}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Event detail modal */}
      {activeEvent && (
        <EventModal event={activeEvent} onClose={handleClose} />
      )}
    </div>
  )
}
