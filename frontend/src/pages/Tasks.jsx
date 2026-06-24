import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, CheckCircle2, Mic, MicOff, Sparkles, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { tasksApi } from '../services/api'

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [listening, setListening] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    try {
      const data = await tasksApi.list()
      setTasks(data)
    } catch (e) { toast.error('Failed to load tasks') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return
    await tasksApi.delete(id)
    toast.success('Task deleted')
    load()
  }

  const handleComplete = async (id) => {
    await tasksApi.complete(id)
    toast.success('Marked complete!')
    load()
  }

  const handlePrioritize = async () => {
    toast.loading('AI is analyzing your tasks…', { id: 'prio' })
    try {
      await tasksApi.prioritize()
      toast.success('Tasks reprioritized by AI', { id: 'prio' })
      load()
    } catch { toast.error('AI prioritization failed', { id: 'prio' }) }
  }

  // Voice input via Web Speech API
  const handleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast.error('Speech recognition not supported in this browser'); return }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false
    setListening(true)
    rec.start()
    rec.onresult = async (e) => {
      const transcript = e.results[0][0].transcript
      toast.loading(`Creating: "${transcript}"`, { id: 'voice' })
      try {
        await tasksApi.fromVoice(transcript)
        toast.success('Task created from voice!', { id: 'voice' })
        load()
      } catch { toast.error('Voice task failed', { id: 'voice' }) }
    }
    rec.onerror = (e) => { toast.error('Voice error: ' + e.error); setListening(false) }
    rec.onend = () => setListening(false)
  }

  const filtered = tasks.filter(t => filter === 'all' ? true : t.status === filter)

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-slate-400 mt-1">AI-ranked by urgency and deadline</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handlePrioritize} className="btn-secondary">
            <Sparkles size={16} className="inline mr-1" /> AI Re-rank
          </button>
          <button onClick={handleVoice} className={`btn-secondary ${listening ? 'bg-red-600/30 border-red-500/50' : ''}`}>
            {listening ? <MicOff size={16} className="inline mr-1" /> : <Mic size={16} className="inline mr-1" />}
            {listening ? 'Listening…' : 'Voice'}
          </button>
          <button onClick={() => { setEditing(null); setShowModal(true) }} className="btn-primary">
            <Plus size={16} className="inline mr-1" /> Add Task
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'in_progress', 'completed', 'missed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? <div className="text-slate-400">Loading…</div> :
       filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-slate-400">No tasks yet. Click "Add Task" to begin.</div>
        </div>
       ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => (
            <TaskCard key={t.id} task={t}
              onEdit={() => { setEditing(t); setShowModal(true) }}
              onDelete={() => handleDelete(t.id)}
              onComplete={() => handleComplete(t.id)}
            />
          ))}
        </div>
       )}

      {showModal && (
        <TaskModal
          task={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}

function TaskCard({ task, onEdit, onDelete, onComplete }) {
  const overdue = new Date(task.deadline) < new Date() && task.status !== 'completed'
  return (
    <div className={`card p-5 hover:border-indigo-500/40 transition ${task.status === 'completed' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <h3 className={`font-semibold ${task.status === 'completed' ? 'line-through' : ''}`}>{task.title}</h3>
          <div className="text-xs text-slate-400 mt-1">
            Due {format(parseISO(task.deadline), 'MMM d, yyyy HH:mm')}
            <span className={`ml-2 ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
              ({formatDistanceToNow(parseISO(task.deadline), { addSuffix: true })})
            </span>
          </div>
        </div>
        <span className={`badge ${priorityClass(task.priority)}`}>{task.priority}</span>
      </div>
      {task.description && <p className="text-sm text-slate-300 mt-2">{task.description}</p>}
      <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
        <span>⏱ {task.estimated_hours}h</span>
        <span>•</span>
        <span className="capitalize">{task.status.replace('_', ' ')}</span>
        {task.ai_priority_score > 0 && (
          <>
            <span>•</span>
            <span className="text-indigo-300">AI score: {task.ai_priority_score}</span>
          </>
        )}
      </div>
      {task.ai_reasoning && (
        <div className="mt-3 p-2 bg-indigo-900/20 border border-indigo-500/20 rounded text-xs text-indigo-200">
          <Sparkles size={11} className="inline mr-1" /> {task.ai_reasoning}
        </div>
      )}
      <div className="flex gap-2 mt-4">
        {task.status !== 'completed' && (
          <button onClick={onComplete} className="flex-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg border border-emerald-600/30 text-sm transition">
            <CheckCircle2 size={14} className="inline mr-1" /> Complete
          </button>
        )}
        <button onClick={onEdit} className="px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 rounded-lg text-sm transition">
          <Edit2 size={14} />
        </button>
        <button onClick={onDelete} className="btn-danger">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function TaskModal({ task, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    deadline: task?.deadline ? task.deadline.slice(0, 16) : new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    priority: task?.priority || 'medium',
    estimated_hours: task?.estimated_hours || 1,
    status: task?.status || 'pending',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        deadline: new Date(form.deadline).toISOString(),
        estimated_hours: Number(form.estimated_hours),
      }
      if (task) await tasksApi.update(task.id, payload)
      else await tasksApi.create(payload)
      toast.success(task ? 'Task updated' : 'Task created')
      onSaved()
    } catch (e) { toast.error('Save failed') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card p-6 w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Title</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Deadline</label>
              <input type="datetime-local" className="input" required value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div>
              <label className="label">Est. Hours</label>
              <input type="number" step="0.5" min="0.5" className="input" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
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
