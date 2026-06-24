import { useEffect, useState } from 'react'
import { Calendar, Clock, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { plannerApi } from '../services/api'

/* ---------- Defensive helpers ---------- */

// Safely turn anything into a renderable string.
// - string/number/boolean -> String(v)
// - null/undefined -> ''
// - array -> join readable
// - object -> "key: value" lines
const safeText = (v) => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) {
    return v.map((item) => safeText(item)).filter(Boolean).join(', ')
  }
  if (typeof v === 'object') {
    try {
      return Object.entries(v)
        .map(([k, val]) => `${k}: ${safeText(val)}`)
        .join(' • ')
    } catch {
      return ''
    }
  }
  return String(v)
}

// Always return an array, no matter what the backend gives us.
const safeArray = (v) => {
  if (Array.isArray(v)) return v
  if (v === null || v === undefined || v === '') return []
  if (typeof v === 'object') return Object.values(v)
  return [v]
}

// Normalize a "block" so .start / .end / .task / .notes are always strings.
const normalizeBlock = (b) => {
  if (b === null || b === undefined) return { start: '', end: '', task: '', notes: '' }
  if (typeof b === 'string') return { start: '', end: '', task: b, notes: '' }
  if (typeof b !== 'object') return { start: '', end: '', task: String(b), notes: '' }
  return {
    start: safeText(b.start ?? b.from ?? b.time_start),
    end: safeText(b.end ?? b.to ?? b.time_end),
    task: safeText(b.task ?? b.title ?? b.subject ?? b.activity),
    notes: safeText(b.notes ?? b.description ?? b.detail),
  }
}

// Normalize a "day" entry: ensure .day is a string and .blocks is an array of normalized blocks.
const normalizeDay = (d, idx) => {
  if (d === null || d === undefined) return { day: `Day ${idx + 1}`, blocks: [] }
  if (typeof d === 'string') return { day: d, blocks: [] }
  if (typeof d !== 'object') return { day: String(d), blocks: [] }
  const dayLabel = safeText(d.day ?? d.date ?? d.label) || `Day ${idx + 1}`
  const blocks = safeArray(d.blocks ?? d.items ?? d.tasks).map(normalizeBlock)
  return { day: dayLabel, blocks }
}

/* ---------- Renderable sub-components ---------- */

// Renders completion_timeline whether it's a string, array, or object like {maths: "Tomorrow"}.
function CompletionTimeline({ value }) {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <div className="text-slate-200 text-sm">{String(value)}</div>
  }

  if (Array.isArray(value)) {
    const items = value.filter((x) => x !== null && x !== undefined && x !== '')
    if (items.length === 0) return null
    return (
      <ul className="list-disc list-inside text-sm space-y-1 text-slate-200">
        {items.map((item, i) => (
          <li key={i}>{safeText(item)}</li>
        ))}
      </ul>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(
      ([, v]) => v !== null && v !== undefined && v !== ''
    )
    if (entries.length === 0) return null
    return (
      <div className="space-y-1 text-sm text-slate-200">
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-emerald-500/10 py-1 last:border-0">
            <span className="text-emerald-200/90 font-medium capitalize">{safeText(k)}</span>
            <span className="text-slate-200 text-right">{safeText(v)}</span>
          </div>
        ))}
      </div>
    )
  }

  return <div className="text-slate-200 text-sm">{safeText(value)}</div>
}

export default function Planner() {
  const [plan, setPlan] = useState(null)
  const [hours, setHours] = useState(4)
  const [planType, setPlanType] = useState('daily')
  const [loading, setLoading] = useState(false)
  const [reschedule, setReschedule] = useState(null)

  const loadCurrent = async () => {
    try {
      const p = await plannerApi.current()
      setPlan(p)
    } catch { /* none */ }
  }

  useEffect(() => { loadCurrent() }, [])

  const generate = async () => {
    setLoading(true)
    try {
      const p = await plannerApi.generate(Number(hours), planType)
      setPlan(p)
      toast.success('Plan generated!')
    } catch { toast.error('Failed to generate plan') }
    setLoading(false)
  }

  const doReschedule = async () => {
    setLoading(true)
    try {
      const r = await plannerApi.reschedule()
      setReschedule(r)
      toast.success('Schedule rebalanced')
    } catch { toast.error('Reschedule failed') }
    setLoading(false)
  }

  const data = plan?.plan_data || plan

  console.log("PLAN RAW =", plan)
  console.log("PLAN DATA =", data)

  if (data) {
    console.log("SUMMARY =", data.summary)
    console.log("SCHEDULE =", data.schedule)
    console.log("TIMELINE =", data.completion_timeline)
    console.log("TIPS =", data.tips)
  }

  // Normalize main plan
  const summaryText = data ? safeText(data.summary) : ''
  const scheduleDays = data ? safeArray(data.schedule).map(normalizeDay) : []
  const tipsList = data
    ? safeArray(data.tips).map((t) => safeText(t)).filter(Boolean)
    : []
  const timelineValue = data ? data.completion_timeline : null

  // Normalize reschedule payload
  const rescheduleExplanation = reschedule ? safeText(reschedule.explanation) : ''
  const rescheduleDays = reschedule
    ? safeArray(reschedule.new_schedule).map(normalizeDay)
    : []
  const rescheduleWarnings = reschedule
    ? safeArray(reschedule.warnings).map((w) => safeText(w)).filter(Boolean)
    : []

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">AI Study Planner</h1>
        <p className="text-slate-400 mt-1">Let Gemini build your study schedule</p>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="label">Available Hours / Day</label>
            <input
              type="number"
              min="1"
              max="16"
              step="0.5"
              className="input"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Plan Type</label>
            <select className="input" value={planType} onChange={(e) => setPlanType(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <button onClick={generate} disabled={loading} className="btn-primary">
            <Sparkles size={16} className="inline mr-1" />
            {loading ? 'Generating…' : 'Generate Plan'}
          </button>
          <button onClick={doReschedule} disabled={loading} className="btn-secondary">
            <RefreshCw size={16} className="inline mr-1" /> Smart Reschedule
          </button>
        </div>
      </div>

      {data && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-indigo-400" size={20} />
            <h2 className="text-xl font-semibold">Your Study Plan</h2>
          </div>

          {summaryText && (
            <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-indigo-100">
              {summaryText}
            </div>
          )}

          {scheduleDays.map((day, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl p-4">
              <div className="font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                <Calendar size={16} /> {day.day}
              </div>
              <div className="space-y-2">
                {day.blocks.length === 0 ? (
                  <div className="text-xs text-slate-500 italic">No blocks scheduled.</div>
                ) : (
                  day.blocks.map((b, j) => (
                    <div key={j} className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-lg">
                      <div className="text-sm font-mono text-indigo-300 whitespace-nowrap">
                        <Clock size={12} className="inline mr-1" />
                        {b.start}{b.start && b.end ? ' – ' : ''}{b.end}
                      </div>
                      <div className="flex-1">
                        {b.task && <div className="font-medium">{b.task}</div>}
                        {b.notes && <div className="text-xs text-slate-400 mt-1">{b.notes}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          {timelineValue !== null && timelineValue !== undefined && timelineValue !== '' && (
            <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
              <div className="font-semibold text-emerald-300 mb-1">Expected Completion</div>
              <CompletionTimeline value={timelineValue} />
            </div>
          )}

          {tipsList.length > 0 && (
            <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
              <div className="font-semibold text-amber-300 mb-2">💡 Tips</div>
              <ul className="list-disc list-inside text-sm space-y-1 text-slate-200">
                {tipsList.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {reschedule && (
        <div className="card p-6 border-amber-500/30 bg-amber-900/10">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-amber-400" size={20} />
            <h2 className="text-xl font-semibold">Smart Reschedule</h2>
          </div>

          {rescheduleExplanation && (
            <div className="text-slate-200 whitespace-pre-wrap mb-3">{rescheduleExplanation}</div>
          )}

          {rescheduleDays.map((day, i) => (
            <div key={i} className="mt-3 bg-slate-800/40 rounded-xl p-3">
              <div className="font-semibold text-amber-300 mb-2">{day.day}</div>
              {day.blocks.length === 0 ? (
                <div className="text-xs text-slate-500 italic">No blocks.</div>
              ) : (
                day.blocks.map((b, j) => (
                  <div key={j} className="text-sm py-1">
                    <span className="font-mono text-amber-200">
                      {b.start}{b.start && b.end ? ' – ' : ''}{b.end}
                    </span>
                    {b.task && <> · {b.task}</>}
                  </div>
                ))
              )}
            </div>
          ))}

          {rescheduleWarnings.length > 0 && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
              {rescheduleWarnings.map((w, i) => (
                <div key={i}>⚠ {w}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
