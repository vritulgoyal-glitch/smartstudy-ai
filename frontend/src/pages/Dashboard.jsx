import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, AlertCircle, TrendingUp, Sparkles, Target, Lightbulb, RefreshCw } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'
import { aiApi, usersApi, tasksApi } from '../services/api'
import { format, parseISO } from 'date-fns'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e']

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [brief, setBrief] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [briefLoading, setBriefLoading] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [s, t] = await Promise.all([usersApi.stats(), tasksApi.list()])
      setStats(s)
      setTasks(t)
    } catch (e) { toast.error('Failed to load dashboard') }
    setLoading(false)
  }

  const loadBrief = async () => {
    setBriefLoading(true)
    try {
      const b = await aiApi.dailyBrief()
      setBrief(b)
    } catch (e) { toast.error('Failed to generate brief') }
    setBriefLoading(false)
  }

  useEffect(() => {
    loadAll()
    loadBrief()
  }, [])

  if (loading) return <div className="text-slate-400">Loading…</div>

  const pieData = stats ? [
    { name: 'Urgent', value: stats.by_priority.urgent },
    { name: 'High', value: stats.by_priority.high },
    { name: 'Medium', value: stats.by_priority.medium },
    { name: 'Low', value: stats.by_priority.low },
  ].filter(d => d.value > 0) : []

  const statusData = stats ? [
    { name: 'Completed', value: stats.completed },
    { name: 'Pending', value: stats.pending },
    { name: 'In Progress', value: stats.in_progress },
    { name: 'Missed', value: stats.missed },
  ] : []

  const upcoming = tasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5)

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-400 mt-1">Your AI-powered study overview</p>
      </div>

      {/* Daily Brief */}
      <div className="card p-6 bg-gradient-to-br from-indigo-900/40 to-purple-900/30 border-indigo-500/30">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-indigo-400" size={22} />
            <h2 className="text-xl font-bold">Daily AI Brief</h2>
          </div>
          <button onClick={loadBrief} disabled={briefLoading} className="btn-secondary text-sm">
            <RefreshCw size={14} className={briefLoading ? 'animate-spin inline mr-1' : 'inline mr-1'} />
            Refresh
          </button>
        </div>
        {!brief ? (
          <div className="text-slate-400">Generating your brief…</div>
        ) : (
          <div className="space-y-4">
            <div className="text-2xl font-semibold text-indigo-200">{brief.greeting}</div>
            <div>
              <div className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
                <Target size={16} /> Today's Priorities
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-200">
                {brief.priorities?.length ? brief.priorities.map((p, i) => <li key={i}>{p}</li>) : <li className="text-slate-500">No priorities yet</li>}
              </ol>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-900/60 rounded-lg p-3">
                <div className="text-xs text-slate-400">Recommended Focus Time</div>
                <div className="font-semibold text-indigo-300">{brief.focus_time}</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-3">
                <div className="text-xs text-slate-400">Expected Completion</div>
                <div className="font-semibold text-emerald-300">{brief.expected_completion}</div>
              </div>
            </div>
            {brief.tips?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
                  <Lightbulb size={16} /> Productivity Tips
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
                  {brief.tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={stats?.total || 0} icon={Target} color="indigo" />
        <StatCard label="Completed" value={stats?.completed || 0} icon={CheckCircle2} color="emerald" />
        <StatCard label="Pending" value={stats?.pending || 0} icon={Clock} color="amber" />
        <StatCard label="Completion" value={`${stats?.completion_percentage || 0}%`} icon={TrendingUp} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Tasks by Priority</h3>
          {pieData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="text-slate-500 text-center py-10">No data yet</div>}
        </div>

        <div className="card p-6">
          <h3 className="font-semibold mb-4">Tasks by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
              <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><AlertCircle size={18} /> Upcoming Deadlines</h3>
          <span className="text-sm text-slate-400">{upcoming.length} tasks</span>
        </div>
        <div className="space-y-2">
          {upcoming.length === 0 && <div className="text-slate-500 text-center py-6">All clear! No upcoming deadlines.</div>}
          {upcoming.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-slate-400">Due {format(parseISO(t.deadline), 'MMM d, yyyy HH:mm')}</div>
              </div>
              <span className={`badge ${priorityClass(t.priority)}`}>{t.priority}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    indigo: 'from-indigo-600/20 to-indigo-500/5 border-indigo-500/30 text-indigo-300',
    emerald: 'from-emerald-600/20 to-emerald-500/5 border-emerald-500/30 text-emerald-300',
    amber: 'from-amber-600/20 to-amber-500/5 border-amber-500/30 text-amber-300',
    purple: 'from-purple-600/20 to-purple-500/5 border-purple-500/30 text-purple-300',
  }
  return (
    <div className={`card p-5 bg-gradient-to-br ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

function priorityClass(p) {
  return {
    urgent: 'bg-red-500/20 text-red-300 border border-red-500/30',
    high: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    low: 'bg-green-500/20 text-green-300 border border-green-500/30',
  }[p] || 'bg-slate-700 text-slate-300'
}
