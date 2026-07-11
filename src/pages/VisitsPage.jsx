import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { REGIONS, NCR_VALUES, TIMEZONES, REGION_TIMEZONE_MAP, formatInTZ, localToUTC, utcToLocal } from '../lib/constants'
import MeetupForm from '../components/MeetupForm'
import { useIdentity } from '../lib/IdentityContext'

// ─── VISIT TRIGGERS ───

function TriggerForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ visitor_name: '', city_cluster: '', custom_city: '', date_from: '', date_to: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const needsCustom = ['other_india','other_usa','rest_of_world'].includes(form.city_cluster)

  const save = async () => {
    if (!form.visitor_name || !form.city_cluster) return alert('Please fill visitor name and region')
    setSaving(true)
    await supabase.from('visit_triggers').insert({ ...form })
    setSaving(false); onSaved()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose}>✕</button>
        <div className="sheet-title">Post a Visit</div>

        <div className="form-group">
          <label className="form-label">Visitor Name(s)</label>
          <input className="form-input" placeholder="e.g. Ramesh Kumar" value={form.visitor_name} onChange={e => set('visitor_name', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Visiting Region</label>
          <select className="form-select" value={form.city_cluster} onChange={e => set('city_cluster', e.target.value)}>
            <option value="">Select region...</option>
            <optgroup label="— India —">{REGIONS.filter(c => c.group === 'India').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</optgroup>
            <optgroup label="— USA —">{REGIONS.filter(c => c.group === 'USA').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</optgroup>
            <optgroup label="— Rest of World —">{REGIONS.filter(c => c.group === 'Rest of World').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</optgroup>
          </select>
        </div>
        {needsCustom && (
          <div className="form-group">
            <label className="form-label">Specify City</label>
            <input className="form-input" placeholder="e.g. Kolkata" value={form.custom_city} onChange={e => set('custom_city', e.target.value)} />
          </div>
        )}
        <div className="form-row">
          <div className="form-group"><label className="form-label">From</label><input className="form-input" type="date" value={form.date_from} onChange={e => set('date_from', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">To</label><input className="form-input" type="date" value={form.date_to} onChange={e => set('date_to', e.target.value)} /></div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <textarea className="form-textarea" placeholder="Any context..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-full" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>{saving ? 'Posting...' : 'Post Visit'}</button>
        </div>
      </div>
    </div>
  )
}

function VisitsTab({ onCreateMeetup }) {
  const [triggers, setTriggers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [converting, setConverting] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('visit_triggers').select('*').eq('converted_to_meetup', false).order('created_at', { ascending: false })
    setTriggers(data || []); setLoading(false)
  }

  useEffect(() => { load() }, [])

  const cityLabel = (t) => {
    if (t.custom_city) return t.custom_city
    return REGIONS.find(c => c.value === t.city_cluster)?.label || t.city_cluster
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this visit post?')) return
    await supabase.from('visit_triggers').delete().eq('id', id); load()
  }

  const markConverted = async (id) => {
    await supabase.from('visit_triggers').update({ converted_to_meetup: true }).eq('id', id)
  }

  return (
    <div>
      {loading ? <div className="spinner">Loading...</div> :
        triggers.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">✈️</div>
            <div className="empty-text">No visits posted</div>
            <div className="empty-sub">Travelling? Post your visit so locals can organise!</div>
          </div>
        ) : triggers.map(t => (
          <div key={t.id} className="card">
            <div className="card-region">{cityLabel(t)}</div>
            <div className="card-title" style={{ marginBottom: 8 }}>{t.visitor_name} is visiting</div>
            {(t.date_from || t.date_to) && (
              <div className="meta-item" style={{ marginBottom: 8 }}>
                📅 {t.date_from && formatDate(t.date_from)}{t.date_to && t.date_from !== t.date_to ? ` – ${formatDate(t.date_to)}` : ''}
              </div>
            )}
            {t.notes && <div className="notes-box" style={{ marginBottom: 10 }}>📝 {t.notes}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setConverting(t)}>📅 Organise Meetup</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Remove</button>
            </div>
          </div>
        ))
      }
      <button className="fab" onClick={() => setShowForm(true)}>+</button>
      {showForm && <TriggerForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
      {converting && (
        <MeetupForm
          existing={{ meetup_type: 'visit', visitor_names: converting.visitor_name, city_cluster: converting.city_cluster, custom_city: converting.custom_city }}
          onClose={() => setConverting(null)}
          onSaved={async () => { await markConverted(converting.id); setConverting(null); load() }}
        />
      )}
    </div>
  )
}

// ─── DATE POLLS ───

function PollForm({ onClose, onSaved }) {
  const { identity } = useIdentity()
  const [form, setForm] = useState({ title: '', region: '', custom_city: '' })
  const [options, setOptions] = useState([{ date_time: '', timezone: 'Asia/Kolkata' }, { date_time: '', timezone: 'Asia/Kolkata' }])
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleRegionChange = (val) => {
    set('region', val)
    const tz = REGION_TIMEZONE_MAP[val] || 'Asia/Kolkata'
    setOptions(opts => opts.map(o => ({ ...o, timezone: tz })))
  }

  const setOption = (i, k, v) => setOptions(opts => opts.map((o, idx) => idx === i ? { ...o, [k]: v } : o))
  const addOption = () => setOptions(opts => [...opts, { date_time: '', timezone: options[0]?.timezone || 'Asia/Kolkata' }])
  const removeOption = (i) => setOptions(opts => opts.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!form.title || !form.region) return alert('Please fill title and region')
    const validOpts = options.filter(o => o.date_time)
    if (validOpts.length < 2) return alert('Please add at least 2 date options')
    setSaving(true)
    const { data: poll } = await supabase.from('date_polls').insert({
      title: form.title, region: form.region, custom_city: form.custom_city,
      proposed_by_name: identity?.name || 'Unknown', status: 'open'
    }).select().single()
    if (poll) {
      await supabase.from('date_poll_options').insert(
        validOpts.map(o => ({ poll_id: poll.id, date_time: localToUTC(o.date_time, o.timezone), timezone: o.timezone }))
      )
    }
    setSaving(false); onSaved()
  }

  const needsCustom = ['other_india','other_usa','rest_of_world'].includes(form.region)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose}>✕</button>
        <div className="sheet-title">New Date Poll</div>

        <div className="form-group">
          <label className="form-label">Poll Title</label>
          <input className="form-input" placeholder="e.g. Delhi Dinner — which date works?" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Region</label>
          <select className="form-select" value={form.region} onChange={e => handleRegionChange(e.target.value)}>
            <option value="">Select region...</option>
            <optgroup label="— India —">{REGIONS.filter(c => c.group === 'India').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</optgroup>
            <optgroup label="— USA —">{REGIONS.filter(c => c.group === 'USA').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</optgroup>
            <optgroup label="— Rest of World —">{REGIONS.filter(c => c.group === 'Rest of World').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</optgroup>
          </select>
        </div>
        {needsCustom && (
          <div className="form-group">
            <label className="form-label">Specify City</label>
            <input className="form-input" placeholder="e.g. Kolkata" value={form.custom_city} onChange={e => set('custom_city', e.target.value)} />
          </div>
        )}

        <div className="section-title" style={{ marginBottom: 8 }}>Date Options</div>
        {options.map((opt, i) => (
          <div key={i} style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>Option {i + 1}</span>
              {options.length > 2 && <button className="btn btn-ghost btn-sm" onClick={() => removeOption(i)} style={{ color: 'var(--red)', padding: 2 }}>✕</button>}
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input className="form-input" type="datetime-local" value={opt.date_time} onChange={e => setOption(i, 'date_time', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <select className="form-select" value={opt.timezone} onChange={e => setOption(i, 'timezone', e.target.value)}>
                  {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.abbr}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
        {options.length < 5 && (
          <button className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }} onClick={addOption}>+ Add another date</button>
        )}

        {saving ? <div className="spinner">Creating poll...</div> : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary btn-full" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-full" onClick={save}>Create Poll</button>
          </div>
        )}
      </div>
    </div>
  )
}

function PollDetail({ poll, onClose, onConverted }) {
  const { identity, isAdmin } = useIdentity()
  const [options, setOptions] = useState([])
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)

  const loadData = async () => {
    const [optRes, voteRes] = await Promise.all([
      supabase.from('date_poll_options').select('*').eq('poll_id', poll.id).order('date_time'),
      supabase.from('date_poll_votes').select('*').eq('option_id', poll.id)
    ])
    // Get all votes across all options
    const optIds = (optRes.data || []).map(o => o.id)
    let allVotes = []
    if (optIds.length > 0) {
      const { data: v } = await supabase.from('date_poll_votes').select('*').in('option_id', optIds)
      allVotes = v || []
    }
    setOptions(optRes.data || [])
    setVotes(allVotes)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [poll.id])

  const myVoteFor = (optionId) => votes.find(v => v.option_id === optionId && v.member_id === identity?.id)

  const vote = async (optionId, available) => {
    if (!identity) return
    setSaving(true)
    const existing = myVoteFor(optionId)
    if (existing) {
      if (existing.available === available) {
        await supabase.from('date_poll_votes').delete().eq('id', existing.id)
      } else {
        await supabase.from('date_poll_votes').update({ available }).eq('id', existing.id)
      }
    } else {
      await supabase.from('date_poll_votes').insert({ option_id: optionId, member_id: identity.id, member_name: identity.name, available })
    }
    await loadData(); setSaving(false)
  }

  const closePoll = async () => {
    if (!confirm("Close this poll? No more voting after this.")) return
    await supabase.from("date_polls").update({ status: "closed" }).eq("id", poll.id)
    onConverted()
  }

  const deletePoll = async () => {
    if (!confirm("Delete this poll entirely? This cannot be undone.")) return
    await supabase.from("date_polls").delete().eq("id", poll.id)
    onConverted()
  }

  const canManage = isAdmin || identity?.name === poll.proposed_by_name

  const regionLabel = () => {
    if (poll.custom_city) return poll.custom_city
    if (NCR_VALUES.includes(poll.region)) return 'Delhi-NCR'
    return REGIONS.find(c => c.value === poll.region)?.label || poll.region
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose}>✕</button>
        <div className="card-region" style={{ marginBottom: 4 }}>{regionLabel()}</div>
        <div className="sheet-title" style={{ marginBottom: 4 }}>{poll.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Proposed by {poll.proposed_by_name} · {poll.status === 'closed' ? '🔒 Closed' : '🟢 Open for voting'}</div>

        {!identity && <div className="alert alert-info">Set your identity to vote</div>}

        {loading ? <div className="spinner">Loading...</div> : options.map(opt => {
          const optVotes = votes.filter(v => v.option_id === opt.id)
          const yesVotes = optVotes.filter(v => v.available)
          const noVotes = optVotes.filter(v => !v.available)
          const myVote = myVoteFor(opt.id)
          const total = optVotes.length
          const yesPercent = total > 0 ? Math.round((yesVotes.length / total) * 100) : 0
          const tz = opt.timezone || 'Asia/Kolkata'

          return (
            <div key={opt.id} className={`poll-option ${myVote?.available ? 'voted-yes' : myVote ? 'voted-no' : ''}`}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 4 }}>
                {formatInTZ(opt.date_time, tz)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                ✅ {yesVotes.length} available · ❌ {noVotes.length} not available
                {yesVotes.length > 0 && <span style={{ marginLeft: 6, color: 'var(--text2)' }}>({yesVotes.map(v => v.member_name).join(', ')})</span>}
              </div>
              <div className="poll-bar"><div className="poll-bar-fill" style={{ width: `${yesPercent}%` }} /></div>
              {poll.status === 'open' && identity && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className={`rsvp-btn coming btn-sm ${myVote?.available === true ? 'active' : ''}`} style={{ flex: 1, padding: '6px 10px', fontSize: 12 }} onClick={() => vote(opt.id, true)} disabled={saving}>✅ Available</button>
                  <button className={`rsvp-btn regrets btn-sm ${myVote?.available === false ? 'active' : ''}`} style={{ flex: 1, padding: '6px 10px', fontSize: 12 }} onClick={() => vote(opt.id, false)} disabled={saving}>❌ Not available</button>
                  {canManage && (
                    <button className="btn btn-primary btn-sm" onClick={() => { setSelectedOption(opt); setConverting(true) }}>Convert</button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {canManage && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {poll.status === 'open' && (
              <button className="btn btn-secondary btn-full" onClick={closePoll}>🔒 Close Poll</button>
            )}
            <button className="btn btn-danger btn-full" onClick={deletePoll}>🗑️ Delete Poll</button>
          </div>
        )}

        {converting && selectedOption && (
          <MeetupForm
            existing={{ meetup_type: 'local', city_cluster: poll.region, custom_city: poll.custom_city, date_time: utcToLocal(selectedOption.date_time, selectedOption.timezone), timezone: selectedOption.timezone }}
            onClose={() => { setConverting(false); setSelectedOption(null) }}
            onSaved={async () => {
              await supabase.from('date_polls').update({ status: 'closed', converted_to_meetup: true }).eq('id', poll.id)
              setConverting(false); setSelectedOption(null); onConverted()
            }}
          />
        )}
      </div>
    </div>
  )
}

function PollsTab() {
  const { identity } = useIdentity()
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('date_polls').select('*').order('created_at', { ascending: false })
    setPolls(data || []); setLoading(false)
  }

  useEffect(() => { load() }, [])

  const regionLabel = (p) => {
    if (p.custom_city) return p.custom_city
    if (NCR_VALUES.includes(p.region)) return 'Delhi-NCR'
    return REGIONS.find(c => c.value === p.region)?.label || p.region
  }

  return (
    <div>
      {loading ? <div className="spinner">Loading...</div> :
        polls.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🗳️</div>
            <div className="empty-text">No date polls yet</div>
            <div className="empty-sub">Tap + to propose some dates</div>
          </div>
        ) : polls.map(p => (
          <div key={p.id} className="card" onClick={() => setSelected(p)}>
            <div className="card-region">{regionLabel(p)}</div>
            <div className="card-title" style={{ marginBottom: 6 }}>{p.title}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>by {p.proposed_by_name}</span>
              <span className={`badge ${p.status === 'open' ? 'badge-local' : 'badge-past'}`}>{p.status === 'open' ? '🟢 Open' : '🔒 Closed'}</span>
              {p.converted_to_meetup && <span className="badge badge-visit">→ Meetup created</span>}
            </div>
          </div>
        ))
      }
      <button className="fab" onClick={() => setShowForm(true)}>+</button>
      {showForm && <PollForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
      {selected && <PollDetail poll={selected} onClose={() => setSelected(null)} onConverted={() => { setSelected(null); load() }} />}
    </div>
  )
}

// ─── MAIN VISITS PAGE (with toggle) ───

export default function VisitsPage() {
  const [tab, setTab] = useState('visits')

  return (
    <div>
      <div className="top-bar">
        <div className="brand">IITK84 <span>MeetUps</span></div>
      </div>
      <div className="page">
        <div className="tab-toggle">
          <button className={`tab-toggle-btn ${tab === 'visits' ? 'active' : ''}`} onClick={() => setTab('visits')}>✈️ Visits</button>
          <button className={`tab-toggle-btn ${tab === 'polls' ? 'active' : ''}`} onClick={() => setTab('polls')}>🗳️ Date Polls</button>
        </div>
        {tab === 'visits' ? <VisitsTab /> : <PollsTab />}
      </div>
    </div>
  )
}
