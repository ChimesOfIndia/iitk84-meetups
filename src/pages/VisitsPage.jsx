import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { REGIONS } from '../lib/constants'
import MeetupForm from '../components/MeetupForm'
import { format } from 'date-fns'

function TriggerForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ visitor_name: '', city_cluster: '', custom_city: '', date_from: '', date_to: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const needsCustom = ['other_india','other_usa','rest_of_world'].includes(form.city_cluster)

  const save = async () => {
    if (!form.visitor_name || !form.city_cluster) return alert('Please fill visitor name and city')
    setSaving(true)
    await supabase.from('visit_triggers').insert({ ...form })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">Post a Visit</div>

        <div className="form-group">
          <label className="form-label">Visitor Name(s)</label>
          <input className="form-input" placeholder="e.g. Ramesh Kumar" value={form.visitor_name} onChange={e => set('visitor_name', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Visiting City</label>
          <select className="form-select" value={form.city_cluster} onChange={e => set('city_cluster', e.target.value)}>
            <option value="">Select city...</option>
            <optgroup label="India">
              {REGIONS.filter(c => ['delhi','gurgaon','noida','bangalore','mumbai','other_india'].includes(c.value)).map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </optgroup>
            <optgroup label="USA">
              {REGIONS.filter(c => ['bay_area','chicago','new_york','other_usa'].includes(c.value)).map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </optgroup>
            <optgroup label="Rest of World">
              <option value="rest_of_world">Rest of World</option>
            </optgroup>
          </select>
        </div>

        {needsCustom && (
          <div className="form-group">
            <label className="form-label">Specify City</label>
            <input className="form-input" placeholder="e.g. Kolkata" value={form.custom_city} onChange={e => set('custom_city', e.target.value)} />
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">From</label>
            <input className="form-input" type="date" value={form.date_from} onChange={e => set('date_from', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">To</label>
            <input className="form-input" type="date" value={form.date_to} onChange={e => set('date_to', e.target.value)} />
          </div>
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

export default function VisitsPage() {
  const [triggers, setTriggers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [converting, setConverting] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('visit_triggers').select('*').eq('converted_to_meetup', false).order('created_at', { ascending: false })
    setTriggers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const cityLabel = (t) => {
    if (t.custom_city) return t.custom_city
    return REGIONS.find(c => c.value === t.city_cluster)?.label || t.city_cluster
  }

  const markConverted = async (id) => {
    await supabase.from('visit_triggers').update({ converted_to_meetup: true }).eq('id', id)
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this visit post?')) return
    await supabase.from('visit_triggers').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="top-bar">
        <div className="brand">IITK84 <span>MeetUps</span></div>
      </div>
      <div className="page">
        <div className="page-header">
          <div className="page-title">Visit Board</div>
          <div className="page-subtitle">Batchmates passing through — organise a meetup!</div>
        </div>

        {loading ? <div className="spinner">Loading...</div> :
          triggers.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✈️</div>
              <div className="empty-text">No visits posted</div>
              <div className="empty-sub">Travelling? Post your visit so locals can organise!</div>
            </div>
          ) : triggers.map(t => (
            <div key={t.id} className="card">
              <div className="card-city">{cityLabel(t)}</div>
              <div className="card-title" style={{ marginBottom: 8 }}>{t.visitor_name} is visiting</div>
              {(t.date_from || t.date_to) && (
                <div className="meta-item" style={{ marginBottom: 8 }}>
                  📅 {t.date_from && format(new Date(t.date_from), 'd MMM')}
                  {t.date_to && t.date_from !== t.date_to ? ` – ${format(new Date(t.date_to), 'd MMM yyyy')}` : t.date_from ? ` ${format(new Date(t.date_from), 'yyyy')}` : ''}
                </div>
              )}
              {t.notes && <div className="notes-box" style={{ marginBottom: 10 }}>📝 {t.notes}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={() => setConverting(t)}>
                  📅 Organise Meetup
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Remove</button>
              </div>
            </div>
          ))
        }
      </div>

      <button className="fab" onClick={() => setShowForm(true)}>+</button>

      {showForm && <TriggerForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}

      {converting && (
        <MeetupForm
          existing={{
            meetup_type: 'visit',
            visitor_names: converting.visitor_name,
            city_cluster: converting.city_cluster,
            custom_city: converting.custom_city,
          }}
          onClose={() => setConverting(null)}
          onSaved={async () => {
            await markConverted(converting.id)
            setConverting(null)
            load()
          }}
        />
      )}
    </div>
  )
}
