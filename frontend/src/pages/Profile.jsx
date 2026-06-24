import { useEffect, useState } from 'react'
import { User, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ full_name: '', available_hours_per_day: 4, timezone: 'UTC' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    usersApi.me().then((p) => {
      setProfile(p)
      setForm({
        full_name: p.full_name || '',
        available_hours_per_day: p.available_hours_per_day || 4,
        timezone: p.timezone || 'UTC',
      })
    })
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await usersApi.update({
        ...form,
        available_hours_per_day: Number(form.available_hours_per_day),
      })
      toast.success('Profile updated')
    } catch { toast.error('Update failed') }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold">Profile</h1>

      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <User size={28} />
          </div>
          <div>
            <div className="text-lg font-semibold">{profile?.full_name || user?.email}</div>
            <div className="text-sm text-slate-400">{user?.email}</div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Available Hours per Day</label>
            <input type="number" min="1" max="16" step="0.5" className="input"
              value={form.available_hours_per_day}
              onChange={(e) => setForm({ ...form, available_hours_per_day: e.target.value })} />
            <div className="text-xs text-slate-500 mt-1">Used by the AI Planner to build your schedule.</div>
          </div>
          <div>
            <label className="label">Timezone</label>
            <input className="input" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            <Save size={16} className="inline mr-1" />
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
