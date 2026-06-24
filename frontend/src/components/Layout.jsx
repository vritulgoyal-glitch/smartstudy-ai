import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ListTodo, Calendar, MessageSquare, User, LogOut, Menu, X, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/planner', label: 'Planner', icon: Calendar },
  { to: '/coach', label: 'AI Coach', icon: MessageSquare },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen gradient-bg flex">
      {/* Mobile menu button */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg border border-slate-700"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 z-40
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-lg leading-none">SmartStudy</div>
              <div className="text-xs text-indigo-400">AI Companion</div>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${active
                    ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border border-indigo-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}
                `}
              >
                <Icon size={18} />
                <span className="font-medium">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <div className="mb-3 px-3 py-2 bg-slate-800/40 rounded-lg">
            <div className="text-xs text-slate-500">Signed in as</div>
            <div className="text-sm font-medium truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:bg-red-600/20 hover:text-red-300 rounded-lg transition-all"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
