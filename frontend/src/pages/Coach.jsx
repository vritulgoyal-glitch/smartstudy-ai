import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, Trash2, Mic } from 'lucide-react'
import toast from 'react-hot-toast'
import { aiApi } from '../services/api'

const EXAMPLES = [
  'How should I prepare for my robotics exam?',
  'I only have 2 hours today. What should I do?',
  'Which task should I finish first?',
  'How do I avoid procrastinating tonight?',
]

export default function Coach() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', message: msg }])
    setLoading(true)
    try {
      const res = await aiApi.chat(msg, sessionId)
      setSessionId(res.session_id)
      setMessages(prev => [...prev, { role: 'assistant', message: res.reply }])
    } catch { toast.error('Coach failed to respond') }
    setLoading(false)
  }

  const handleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast.error('Speech recognition not supported'); return }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.start()
    rec.onresult = (e) => setInput(e.results[0][0].transcript)
  }

  const clear = async () => {
    if (!confirm('Clear all chat history?')) return
    await aiApi.clearHistory()
    setMessages([])
    setSessionId(null)
    toast.success('Chat cleared')
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="text-indigo-400" /> AI Productivity Coach
          </h1>
          <p className="text-slate-400 mt-1">Powered by Google Gemini</p>
        </div>
        <button onClick={clear} className="btn-danger"><Trash2 size={14} /></button>
      </div>

      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-10 space-y-4">
              <Sparkles size={40} className="mx-auto text-indigo-400" />
              <div className="text-slate-300">Ask me anything about your studies & schedule.</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                {EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => send(ex)}
                    className="text-left p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-lg text-sm transition">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm'
                  : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700'
              }`}>
                {m.message}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 px-4 py-3 rounded-2xl border border-slate-700">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send() }} className="p-3 border-t border-slate-800 flex gap-2">
          <button type="button" onClick={handleVoice} className="btn-secondary"><Mic size={16} /></button>
          <input
            className="input flex-1"
            placeholder="Ask the coach anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()} className="btn-primary">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
