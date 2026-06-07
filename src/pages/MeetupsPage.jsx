import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CITY_CLUSTERS } from '../lib/constants'
import MeetupForm from '../components/MeetupForm'
import MeetupDetail from '../components/MeetupDetail'
import { format } from 'date-fns'

export default function MeetupsPage() {
  const [meetups, setMeetups] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [rsvpCounts, setRsvpCounts] = useState({})

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('meetups').select('*').eq('status', 'upcoming').order('date_time', { ascending: true })
    setMeetups(data || [])

    // Load RSVP counts for all meetups
    if (data && data.length > 0) {
      const { data: rsvps } = await supabase.from('rsvps').select('meetup_id, status, with_spouse').in('meetup_id', data.map(m => m.id))
      const counts = {}
      ;(rsvps || []).forEach(r => {
        if (!counts[r.meetup_id]) counts[r.meetup_id] = { coming: 0, maybe: 0, spouses: 0 }
        if (r.status === 'coming') { counts[r.meetup_id].coming++; if (r.with_spouse) counts[r.meetup_id].spouses++ }
        if (r.status === 'maybe') counts[r.meetup_id].maybe++
      })
      setRsvpCounts(counts)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const cityLabel = (m) => {
    if (m.custom_city) return m.custom_city
    return CITY_CLUSTERS.find(c => c.value === m.city_cluster)?.label || m.city_cluster
  }

  const filtered = filter === 'all' ? meetups : meetups.filter(m => m.city_cluster === filter)

  return (
    <div>
      <div className="top-bar">
        <div className="brand">IITK84 <span>MeetUps</span></div>
      </div>
      <div className="page">
        <div className="filter-bar">
          <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Cities</button>
          {CITY_CLUSTERS.map(c => (
            <button key={c.value} className={`filter-chip ${filter === c.value ? 'active' : ''}`} onClick={() => setFilter(c.value)}>{c.label}</button>
          ))}
        </div>

        {loading ? <div className="spinner">Loading meetups...</div> :
          filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🍽️</div>
              <div className="empty-text">No upcoming meetups</div>
              <div className="empty-sub">Tap + to create one</div>
            </div>
          ) : filtered.map(m => {
            const counts = rsvpCounts[m.id] || { coming: 0, maybe: 0, spouses: 0 }
            return (
              <div key={m.id} className="card card-accent" onClick={() => setSelected(m)}>
                <div className="card-city">{cityLabel(m)}</div>
                <div className="card-header">
                  <div className="card-title">{m.title}</div>
                  <span className={`badge ${m.meetup_type === 'visit' ? 'badge-visit' : 'badge-local'}`}>
                    {m.meetup_type === 'visit' ? '✈️' : '🏠'}
                  </span>
                </div>
                <div className="card-meta">
                  {m.date_time && <div className="meta-item">📅 {format(new Date(m.date_time), 'd MMM • h:mm a')}</div>}
                  {m.venue_name && <div className="meta-item">📍 {m.venue_name}</div>}
                  {m.with_spouses && <div className="meta-item">👫 With spouses</div>}
                  <div className="meta-item">⚓ {m.anchor_name}</div>
                </div>
                <div className="rsvp-bar">
                  <div className="rsvp-count">
                    <span className="num">✅ {counts.coming}</span>
                    <span className="lbl">coming{counts.spouses > 0 ? ` +${counts.spouses} sp.` : ''}</span>
                  </div>
                  <div className="rsvp-count">
                    <span className="num">🤔 {counts.maybe}</span>
                    <span className="lbl">maybe</span>
                  </div>
                </div>
              </div>
            )
          })
        }
      </div>

      <button className="fab" onClick={() => setShowForm(true)}>+</button>

      {showForm && <MeetupForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}

      {selected && !editing && (
        <MeetupDetail
          meetup={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null) }}
          onDeleted={() => { setSelected(null); load() }}
        />
      )}

      {editing && (
        <MeetupForm
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}
