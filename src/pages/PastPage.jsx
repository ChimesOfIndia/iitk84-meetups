import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { REGIONS, NCR_VALUES, MEAL_TYPES, formatInTZ } from '../lib/constants'
import MeetupDetail from '../components/MeetupDetail'

export default function PastPage() {
  const [meetups, setMeetups] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [rsvpCounts, setRsvpCounts] = useState({})

  const load = async () => {
    setLoading(true)
    // Auto-archive past meetups
    const now = new Date().toISOString()
    await supabase.from('meetups').update({ status: 'past' }).eq('status', 'upcoming').lt('date_time', now)

    const { data } = await supabase.from('meetups').select('*').eq('status', 'past').order('date_time', { ascending: false })
    setMeetups(data || [])

    if (data && data.length > 0) {
      const { data: rsvps } = await supabase.from('rsvps').select('meetup_id, status, with_spouse').in('meetup_id', data.map(m => m.id))
      const counts = {}
      ;(rsvps || []).forEach(r => {
        if (!counts[r.meetup_id]) counts[r.meetup_id] = { coming: 0, spouses: 0 }
        if (r.status === 'coming') { counts[r.meetup_id].coming++; if (r.with_spouse) counts[r.meetup_id].spouses++ }
      })
      setRsvpCounts(counts)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const regionLabel = (m) => {
    if (m.custom_city) return m.custom_city
    if (NCR_VALUES.includes(m.city_cluster)) return 'Delhi-NCR'
    return REGIONS.find(c => c.value === m.city_cluster)?.label || m.city_cluster
  }

  const mealLabel = (m) => MEAL_TYPES.find(t => t.value === m.meal_type)?.label || ''

  const cardTitle = (m) => {
    const parts = []
    if (m.label) parts.push(m.label)
    if (m.meal_type) parts.push(mealLabel(m))
    if (parts.length === 0) return m.meetup_type === 'visit' ? `${m.visitor_names} visiting` : `${regionLabel(m)} Meetup`
    return parts.join(' — ')
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
            const counts = rsvpCounts[m.id] || { coming: 0, spouses: 0 }
            const tz = m.timezone || 'Asia/Kolkata'
            return (
              <div key={m.id} className="card" style={{ opacity: 0.85 }} onClick={() => setSelected(m)}>
                <div className="card-region">{regionLabel(m)}</div>
                <div className="card-header">
                  <div className="card-title">{cardTitle(m)}</div>
                  <span className="badge badge-past">Past</span>
                </div>
                <div className="card-meta">
                  {m.date_time && <div className="meta-item">📅 {formatInTZ(m.date_time, tz)}</div>}
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
        <MeetupDetail meetup={selected} onClose={() => setSelected(null)} onEdit={() => {}} onDeleted={() => { setSelected(null); load() }} />
      )}
    </div>
  )
}
