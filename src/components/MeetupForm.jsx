import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { REGIONS, MEAL_TYPES } from '../lib/constants'
import { useIdentity } from '../lib/IdentityContext'

const emptyForm = {
  label: '', meal_type: '', city_cluster: '', custom_city: '',
  meetup_type: 'local', visitor_names: '', date_time: '', timezone: 'Asia/Kolkata',
  venue_name: '', venue_maps_url: '', with_spouses: false, notes: '',
}

export default function MeetupForm({ onClose, onSaved, existing }) {
  const { identity } = useIdentity()

  // When editing: convert stored UTC to local time in the meetup's timezone
  const getInitialDateTime = () => {
    if (!existing?.date_time) return ''
    if (!existing.date_time) return ''
    return existing.date_time.slice(0, 10)
  }

  const [form, setForm] = useState(existing ? {
    label: existing.label || '',
    meal_type: existing.meal_type || '',
    city_cluster: existing.city_cluster || '',
    custom_city: existing.custom_city || '',
    meetup_type: existing.meetup_type || 'local',
    visitor_names: existing.visitor_names || '',
    date_time: getInitialDateTime(),
    timezone: existing.timezone || 'Asia/Kolkata',
    venue_name: existing.venue_name || '',
    venue_maps_url: existing.venue_maps_url || '',
    with_spouses: existing.with_spouses || false,
    notes: existing.notes || '',
    time_text: existing.time_text || '',
  } : emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-set timezone when region changes
  const handleRegionChange = (val) => {
    set('city_cluster', val)
  }

  const needsCustomRegion = ['other_india', 'other_usa', 'rest_of_world'].includes(form.city_cluster)

  const save = async () => {
    setError(null)
    if (!form.city_cluster) { setError('Please select a region'); return }
    if (!form.date_time) { setError('Please set a date'); return }
    setSaving(true)
    try {
      // Convert local time + timezone to UTC
      const utcDateTime = form.date_time ? form.date_time + 'T00:00:00+00:00' : null
      const payload = {
        label: form.label,
        meal_type: form.meal_type,
        city_cluster: form.city_cluster,
        custom_city: form.custom_city,
        meetup_type: form.meetup_type,
        visitor_names: form.meetup_type === 'visit' ? form.visitor_names : null,
        date_time: utcDateTime,
        timezone: form.timezone,
        venue_name: form.venue_name,
        venue_maps_url: form.venue_maps_url,
        with_spouses: form.with_spouses,
        notes: form.notes,
        status: 'upcoming',
      }
      // Only set anchor on CREATE — never overwrite on edit
      if (!existing) {
        payload.anchor_id = identity?.id || null
        payload.anchor_name = identity?.name || 'Unknown'
      }
      let result
      if (existing) {
        result = await supabase.from('meetups').update(payload).eq('id', existing.id)
      } else {
        result = await supabase.from('meetups').insert(payload)
      }
      if (result.error) { setError('Error: ' + result.error.message); setSaving(false); return }
      setSaving(false)
      onSaved()
    } catch(e) {
      setError('Unexpected error: ' + e.message)
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose}>✕</button>
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
          <label className="form-label">Region</label>
          <select className="form-select" value={form.city_cluster} onChange={e => handleRegionChange(e.target.value)}>
            <option value="">Select region...</option>
            <optgroup label="— India —">
              {REGIONS.filter(c => c.group === 'India').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </optgroup>
            <optgroup label="— USA —">
              {REGIONS.filter(c => c.group === 'USA').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </optgroup>
            <optgroup label="— Rest of World —">
              {REGIONS.filter(c => c.group === 'Rest of World').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </optgroup>
          </select>
        </div>

        {needsCustomRegion && (
          <div className="form-group">
            <label className="form-label">Specify Location</label>
            <input className="form-input" placeholder="e.g. Kolkata" value={form.custom_city} onChange={e => set('custom_city', e.target.value)} />
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Label (optional)</label>
            <input className="form-input" placeholder="e.g. Batch Reunion" value={form.label} onChange={e => set('label', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Meal Type</label>
            <select className="form-select" value={form.meal_type} onChange={e => set('meal_type', e.target.value)}>
              <option value="">Select...</option>
              {MEAL_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date_time || ''} onChange={e => set('date_time', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Time (optional)</label>
            <input className="form-input" type="text" placeholder="e.g. 7:30 PM" value={form.time_text || ''} onChange={e => set('time_text', e.target.value)} />
          </div>
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

        {error && <div className="alert alert-error">⚠️ {error}</div>}

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
