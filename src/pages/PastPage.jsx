import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CITY_CLUSTERS } from '../lib/constants'
import MeetupDetail from '../components/MeetupDetail'
import { format } from 'date-fns'

export default function PastPage() {
  const [meetups, setMeetups] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [rsvpCounts, setRsvpCounts] = useState({})

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('meetups').select('*').eq('status', 'past').order('date_time', { ascending: false })
    setMeetups(data || [])

    // Also auto-archive upcoming meetups that are past
    const now = new Date().toISOString()
    await supabase.from('meetups').update({ status: 'past' }).eq('status', 'upcoming').lt('date_time', now)

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

  return (
    <div>
      <div className="top-bar">
        <div className="brand">IITK84 <span>MeetUps</span></div>
      </div>
      <div className="page">
        <div className="page-header">
          <div className="page-title">Past Meetups</div>
          <div className="page-subtitle">The memories we've made</div>
        </div>

        {loading ? <div className="spinner">Loading...</div> :
          meetups.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📅</div>
              <div className="empty-text">No past meetups yet</div>
              <div className="empty-sub">Past meetups will appear here automatically</div>
            </div>
          ) : meetups.map(m => {
            const counts = rsvpCounts[m.id] || { coming: 0, maybe: 0, spouses: 0 }
            return (
              <div key={m.id} className="card" style={{ opacity: 0.85 }} onClick={() => setSelected(m)}>
                <div className="card-city">{cityLabel(m)}</div>
                <div className="card-header">
                  <div className="card-title">{m.title}</div>
                  <span className="badge badge-past">Past</span>
                </div>
                <div className="card-meta">
                  {m.date_time && <div className="meta-item">📅 {format(new Date(m.date_time), 'd MMM yyyy')}</div>}
                  {m.venue_name && <div className="meta-item">📍 {m.venue_name}</div>}
                </div>
                <div className="rsvp-bar">
                  <div className="rsvp-count">
                    <span className="num">👥 {counts.coming}</span>
                    <span className="lbl">attended{counts.spouses > 0 ? ` +${counts.spouses} spouses` : ''}</span>
                  </div>
                </div>
              </div>
            )
          })
        }
      </div>

      {selected && (
        <MeetupDetail
          meetup={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {}}
          onDeleted={() => { setSelected(null); load() }}
        />
      )}
    </div>
  )
}
