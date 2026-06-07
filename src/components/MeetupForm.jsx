import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { CITY_CLUSTERS } from '../lib/constants'
import { useIdentity } from '../lib/IdentityContext'

const emptyForm = {
  city_cluster: '',
  custom_city: '',
  meetup_type: 'local',
  visitor_names: '',
  date_time: '',
  venue_name: '',
  venue_maps_url: '',
  with_spouses: false,
  notes: '',
}

export default function MeetupForm({ onClose, onSaved, existing }) {
  const { identity } = useIdentity()
  const [form, setForm] = useState(existing ? {
    city_cluster: existing.city_cluster || '',
    custom_city: existing.custom_city || '',
    meetup_type: existing.meetup_type || 'local',
    visitor_names: existing.visitor_names || '',
    date_time: existing.date_time ? existing.date_time.slice(0, 16) : '',
    venue_name: existing.venue_name || '',
    venue_maps_url: existing.venue_maps_url || '',
    with_spouses: existing.with_spouses || false,
    notes: existing.notes || '',
  } : emptyForm)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const needsCustomCity = ['other_india', 'other_usa', 'rest_of_world'].includes(form.city_cluster)

  const getTitle = () => {
    if (form.meetup_type === 'visit' && form.visitor_names) {
      return `${form.visitor_names} visiting`
    }
    const cluster = CITY_CLUSTERS.find(c => c.value === form.city_cluster)
    const cityName = needsCustomCity && form.custom_city ? form.custom_city : cluster?.label || ''
    return `${cityName} Meetup`
  }

  const save = async () => {
    if (!form.city_cluster) return alert('Please select a city')
    if (!form.date_time) return alert('Please set a date and time')
    setSaving(true)
    const rawDate = form.date_time
    const parsedDate = rawDate ? new Date(rawDate).toISOString() : null
    const payload = {
        ...form,
        date_time: parsedDate,
        title: getTitle(),
        anchor_id: identity?.id || null,
        anchor_name: identity?.name || 'Unknown',
        status: 'upcoming',
        visitor_names: form.meetup_type === 'visit' ? form.visitor_names : null,
      }
    if (existing) {
      await supabase.from('meetups').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('meetups').insert(payload)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">{existing ? 'Edit Meetup' : 'New Meetup'}</div>

        <div className="form-group">
          <label className="form-label">Type</label>
          <div className="toggle-group">
            <button className={`toggle-btn ${form.meetup_type === 'local' ? 'active' : ''}`} onClick={() => set('meetup_type', 'local')}>🏠 Local Gather</button>
            <button className={`toggle-btn ${form.meetup_type === 'visit' ? 'active' : ''}`} onClick={() => set('meetup_type', 'visit')}>✈️ Visit-Triggered</button>
          </div>
        </div>

        {form.meetup_type === 'visit' && (
          <div className="form-group">
            <label className="form-label">Visitor Name(s)</label>
            <input className="form-input" placeholder="e.g. Ramesh & Suresh" value={form.visitor_names} onChange={e => set('visitor_names', e.target.value)} />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">City</label>
          <select className="form-select" value={form.city_cluster} onChange={e => set('city_cluster', e.target.value)}>
            <option value="">Select city...</option>
            <optgroup label="India">
              {CITY_CLUSTERS.filter(c => ['delhi','gurgaon','noida','bangalore','mumbai','other_india'].includes(c.value)).map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </optgroup>
            <optgroup label="USA">
              {CITY_CLUSTERS.filter(c => ['bay_area','chicago','new_york','other_usa'].includes(c.value)).map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </optgroup>
            <optgroup label="Rest of World">
              {CITY_CLUSTERS.filter(c => c.value === 'rest_of_world').map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {needsCustomCity && (
          <div className="form-group">
            <label className="form-label">Specify City</label>
            <input className="form-input" placeholder="e.g. Kolkata" value={form.custom_city} onChange={e => set('custom_city', e.target.value)} />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Date & Time</label>
          <input className="form-input" type="datetime-local" value={form.date_time} onChange={e => set('date_time', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Venue Name</label>
          <input className="form-input" placeholder="e.g. Bukhara, ITC Maurya" value={form.venue_name} onChange={e => set('venue_name', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Google Maps Link (optional)</label>
          <input className="form-input" placeholder="Paste Google Maps URL" value={form.venue_maps_url} onChange={e => set('venue_maps_url', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Spouses</label>
          <div className="toggle-group">
            <button className={`toggle-btn ${!form.with_spouses ? 'active' : ''}`} onClick={() => set('with_spouses', false)}>Batchmates only</button>
            <button className={`toggle-btn ${form.with_spouses ? 'active' : ''}`} onClick={() => set('with_spouses', true)}>With spouses</button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes / Any details</label>
          <textarea className="form-textarea" placeholder="Parking, dress code, special occasion..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-full" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : existing ? 'Save Changes' : 'Create Meetup'}
          </button>
        </div>
      </div>
    </div>
  )
}
