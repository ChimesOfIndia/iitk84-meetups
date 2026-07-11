import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../lib/IdentityContext'

export default function IdentityPicker({ onClose }) {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const { saveIdentity } = useIdentity()

  useEffect(() => {
    supabase.from('members').select('*').order('name').then(({ data }) => {
      setMembers(data || [])
      setLoading(false)
    })
  }, [])

  const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose}>✕</button>
        <div className="sheet-title">Who are you?</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, marginTop: -12 }}>
          Pick your name — we'll remember you on this device
        </p>
        <input className="search-box" placeholder="Search your name..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        {loading ? <div className="spinner">Loading members...</div> : (
          <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {filtered.map(m => (
              <div key={m.id} className="member-card" style={{ cursor: 'pointer' }} onClick={() => saveIdentity(m)}>
                <div className="member-avatar">{m.name[0]}</div>
                <div className="member-info">
                  <div className="member-name">
                    {m.name}
                    {m.is_admin && <span className="badge badge-admin" style={{ marginLeft: 8, fontSize: 10 }}>Admin</span>}
                  </div>
                  <div className="member-cities">{(m.cities || []).join(', ')}</div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="empty">
                <div className="empty-text">Not found</div>
                <div className="empty-sub">Ask someone to add you in the Members tab</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
