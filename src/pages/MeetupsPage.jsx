import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { REGIONS, NCR_VALUES, MEAL_TYPES } from '../lib/constants'
import MeetupForm from '../components/MeetupForm'
import MeetupDetail from '../components/MeetupDetail'

const FILTER_GROUPS = [
  { label: 'All', value: 'all' },
  { label: '— India —', isHeader: true },
  { label: 'Delhi-NCR', value: 'ncr' },
  { label: 'Bangalore', value: 'bangalore' },
  { label: 'Mumbai', value: 'mumbai' },
  { label: 'Other India', value: 'other_india' },
  { label: '— USA —', isHeader: true },
  { label: 'Bay Area', value: 'bay_area' },
  { label: 'Chicago', value: 'chicago' },
  { label: 'New York', value: 'new_york' },
  { label: 'Other USA', value: 'other_usa' },
  { label: '— Rest of World —', isHeader: true },
  { label: 'Middle East', value: 'middle_east' },
  { label: 'Singapore', value: 'singapore' },
  { label: 'Australia', value: 'australia' },
  { label: 'Rest of World', value: 'rest_of_world' },
]

function formatDate(d) {
  if (!d) return ''
  // Handle both 'YYYY-MM-DD' and full ISO timestamps
  const dateStr = d.slice(0, 10)
  const [y, m, day] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, day)
  return dt.toLocaleDateString('en-IN', {weekday:'short', day:'numeric', month:'short', year:'numeric'})
}

export default function MeetupsPage() {
  const [meetups, setMeetups] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [rsvpCounts, setRsvpCounts] = useState({})
  const [dietaryCounts, setDietaryCounts] = useState({})

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('meetups').select('*').eq('status', 'upcoming').order('date_time', { ascending: true })
    setMeetups(data || [])
    if (data && data.length > 0) {
      const { data: rsvps } = await supabase
        .from('rsvps')
        .select('meetup_id, status, with_spouse, extra_guests, members(dietary_pref, spouse_dietary_pref)')
        .in('meetup_id', data.map(m => m.id))
      const counts = {}, dietary = {}
      ;(rsvps || []).forEach(r => {
        if (!counts[r.meetup_id]) counts[r.meetup_id] = { coming: 0, maybe: 0, regrets: 0, spouses: 0, extras: 0 }
        if (!dietary[r.meetup_id]) dietary[r.meetup_id] = { veg: 0, nonveg: 0, unspecified: 0 }
        if (r.status === 'coming') {
          counts[r.meetup_id].coming++
          if (r.with_spouse) counts[r.meetup_id].spouses++
          counts[r.meetup_id].extras += (r.extra_guests || 0)
          const mp = r.members?.dietary_pref
          if (mp === 'veg') dietary[r.meetup_id].veg++
          else if (mp === 'nonveg') dietary[r.meetup_id].nonveg++
          else dietary[r.meetup_id].unspecified++
          if (r.with_spouse) {
            const sp = r.members?.spouse_dietary_pref
            if (sp === 'veg') dietary[r.meetup_id].veg++
            else if (sp === 'nonveg') dietary[r.meetup_id].nonveg++
            else dietary[r.meetup_id].unspecified++
          }
        }
        if (r.status === 'maybe') counts[r.meetup_id].maybe++
        if (r.status === 'regrets') counts[r.meetup_id].regrets++
      })
      setRsvpCounts(counts); setDietaryCounts(dietary)
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

  const matchesFilter = (m) => {
    if (filter === 'all') return true
    if (filter === 'ncr') return NCR_VALUES.includes(m.city_cluster)
    return m.city_cluster === filter
  }

  const sorted = [...meetups.filter(matchesFilter)].sort((a, b) => {
    if (sortBy === 'date') return new Date(a.date_time) - new Date(b.date_time)
    return regionLabel(a).localeCompare(regionLabel(b))
  })

  return (
    <div>
      <div className="top-bar">
        <div className="brand">IITK84 <span>MeetUps</span></div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`filter-chip ${sortBy === 'date' ? 'active' : ''}`} onClick={() => setSortBy('date')} style={{ fontSize: 11 }}>📅 Date</button>
          <button className={`filter-chip ${sortBy === 'city' ? 'active' : ''}`} onClick={() => setSortBy('city')} style={{ fontSize: 11 }}>📍 Region</button>
        </div>
      </div>
      <div className="page">
        <div className="filter-bar">
          {FILTER_GROUPS.map((f, i) => f.isHeader ? (
            <span key={i} style={{ fontSize: 10, color: 'var(--text3)', padding: '5px 4px', flexShrink: 0, alignSelf: 'center' }}>{f.label}</span>
          ) : (
            <button key={f.value} className={`filter-chip ${filter === f.value ? 'active' : ''}`} onClick={() => setFilter(f.value)}>{f.label}</button>
          ))}
        </div>

        {loading ? <div className="spinner">Loading meetups...</div> :
          sorted.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🍽️</div>
              <div className="empty-text">No upcoming meetups</div>
              <div className="empty-sub">Tap + to create one</div>
            </div>
          ) : sorted.map(m => {
            const counts = rsvpCounts[m.id] || { coming: 0, maybe: 0, regrets: 0, spouses: 0, extras: 0 }
            const diet = dietaryCounts[m.id] || { veg: 0, nonveg: 0, unspecified: 0 }
return (
              <div key={m.id} className="card card-accent" onClick={() => setSelected(m)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <div className="card-region">{regionLabel(m)}</div>
                  {m.meal_type && <span className="badge badge-visit" style={{ fontSize: 10 }}>{mealLabel(m)}</span>}
                </div>
                <div className="card-header">
                  <div className="card-title">{cardTitle(m)}</div>
                  <span className={`badge ${m.meetup_type === 'visit' ? 'badge-visit' : 'badge-local'}`}>
                    {m.meetup_type === 'visit' ? '✈️' : '🏠'}
                  </span>
                </div>
                <div className="card-meta">
                  {m.date_time && <div className="meta-item">📅 {formatDate(m.date_time)}{m.time_text ? ' · ' + m.time_text : ''}</div>}
                  {m.venue_name && <div className="meta-item">📍 {m.venue_name}</div>}
                  {m.with_spouses && <div className="meta-item">👫 With spouses</div>}
                  <div className="meta-item">⚓ {m.anchor_name}</div>
                </div>
                <div className="rsvp-bar">
                  <div className="rsvp-count"><span className="num">✅ {counts.coming}</span><span className="lbl">batchmates{counts.spouses > 0 ? ` +${counts.spouses} sp.` : ''}</span></div>
                  <div className="rsvp-count"><span className="num">🤔 {counts.maybe}</span><span className="lbl">maybe</span></div>
                  {counts.regrets > 0 && <div className="rsvp-count"><span className="num">❌ {counts.regrets}</span><span className="lbl">regrets</span></div>}
                </div>
                {counts.coming > 0 && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border2)', fontSize: 11, color: 'var(--text2)' }}>
                    <span>🌿 {diet.veg}</span><span>🍖 {diet.nonveg}</span>
                    {diet.unspecified > 0 && <span>❓ {diet.unspecified}</span>}
                  </div>
                )}
              </div>
            )
          })
        }
      </div>

      <button className="fab" onClick={() => setShowForm(true)}>+</button>
      {showForm && <MeetupForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
      {selected && !editing && (
        <MeetupDetail meetup={selected} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null) }} onDeleted={() => { setSelected(null); load() }} />
      )}
      {editing && <MeetupForm existing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </div>
  )
}
