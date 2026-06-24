import { useEffect, useState } from 'react'
import { Calendar, Clock, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { plannerApi } from '../services/api'

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
            <input type="number" min="1" max="16" step="0.5" className="input" value={hours} onChange={(e) => setHours(e.target.value)} />
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
          {data.summary && (
            <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-indigo-100">
              {data.summary}
            </div>
          )}

          {data.schedule?.map((day, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl p-4">
              <div className="font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                <Calendar size={16} /> {day.day}
              </div>
              <div className="space-y-2">
                {day.blocks?.map((b, j) => (
                  <div key={j} className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-lg">
                    <div className="text-sm font-mono text-indigo-300 whitespace-nowrap">
                      <Clock size={12} className="inline mr-1" />
                      {b.start} – {b.end}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{b.task}</div>
                      {b.notes && <div className="text-xs text-slate-400 mt-1">{b.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {data.completion_timeline && (
            <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
              <div className="font-semibold text-emerald-300 mb-1">Expected Completion</div>
              <div className="text-slate-200 text-sm">{data.completion_timeline}</div>
            </div>
          )}

          {data.tips?.length > 0 && (
            <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
              <div className="font-semibold text-amber-300 mb-2">💡 Tips</div>
              <ul className="list-disc list-inside text-sm space-y-1 text-slate-200">
                {data.tips.map((t, i) => <li key={i}>{t}</li>)}
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
          <div className="text-slate-200 whitespace-pre-wrap mb-3">{reschedule.explanation}</div>
          {reschedule.new_schedule?.length > 0 && reschedule.new_schedule.map((day, i) => (
            <div key={i} className="mt-3 bg-slate-800/40 rounded-xl p-3">
              <div className="font-semibold text-amber-300 mb-2">{day.day}</div>
              {day.blocks?.map((b, j) => (
                <div key={j} className="text-sm py-1">
                  <span className="font-mono text-amber-200">{b.start} – {b.end}</span> · {b.task}
                </div>
              ))}
            </div>
          ))}
          {reschedule.warnings?.length > 0 && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
              {reschedule.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
