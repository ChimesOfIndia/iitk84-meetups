import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { REGIONS, NCR_VALUES, DIETARY_PREFS } from '../lib/constants'
import { useIdentity } from '../lib/IdentityContext'

function MemberForm({ existing, onClose, onSaved }) {
  const { isAdmin, identity, saveIdentity } = useIdentity()
  const [form, setForm] = useState({
    name: existing?.name || '',
    cities: existing?.cities || [],
    whatsapp: existing?.whatsapp || '',
    on_main_wa_group: existing?.on_main_wa_group || false,
    spouse_name: existing?.spouse_name || '',
    dietary_pref: existing?.dietary_pref || '',
    spouse_dietary_pref: existing?.spouse_dietary_pref || '',
    is_admin: existing?.is_admin || false,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleCity = (val) => {
    setForm(f => ({ ...f, cities: f.cities.includes(val) ? f.cities.filter(c => c !== val) : [...f.cities, val] }))
  }

  const save = async () => {
    if (!form.name.trim()) return alert('Please enter a name')
    setSaving(true)
    const payload = { ...form }
    if (!isAdmin) delete payload.is_admin // only admin can change admin flag
    if (existing) {
      await supabase.from('members').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('members').insert(payload)
    }
    setSaving(false); onSaved()
  }

  const handleDelete = async () => {
    if (!confirm(`Remove ${existing.name} from the directory?`)) return
    await supabase.from('members').delete().eq('id', existing.id)
    onSaved()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose}>✕</button>
        <div className="sheet-title">{existing ? 'Edit Member' : 'Add Member'}</div>

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" placeholder="e.g. Ramesh Kumar" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
        </div>

        <div className="form-group">
          <label className="form-label">Regions (select all that apply)</label>
          <div className="city-chips">
            <div style={{ width: '100%', fontSize: 10, color: 'var(--text3)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>India</div>
            {REGIONS.filter(c => c.group === 'India').map(c => (
              <button key={c.value} className={`city-chip ${form.cities.includes(c.value) ? 'selected' : ''}`} onClick={() => toggleCity(c.value)}>{c.label}</button>
            ))}
            <div style={{ width: '100%', fontSize: 10, color: 'var(--text3)', margin: '6px 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>USA</div>
            {REGIONS.filter(c => c.group === 'USA').map(c => (
              <button key={c.value} className={`city-chip ${form.cities.includes(c.value) ? 'selected' : ''}`} onClick={() => toggleCity(c.value)}>{c.label}</button>
            ))}
            <div style={{ width: '100%', fontSize: 10, color: 'var(--text3)', margin: '6px 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>Rest of World</div>
            {REGIONS.filter(c => c.group === 'Rest of World').map(c => (
              <button key={c.value} className={`city-chip ${form.cities.includes(c.value) ? 'selected' : ''}`} onClick={() => toggleCity(c.value)}>{c.label}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">WhatsApp Number (optional)</label>
          <input className="form-input" placeholder="+91 98765 43210" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Dietary Preference</label>
          <div className="toggle-group">
            <button className={`toggle-btn ${form.dietary_pref === 'veg' ? 'active' : ''}`} onClick={() => set('dietary_pref', form.dietary_pref === 'veg' ? '' : 'veg')}>🌿 Veg only</button>
            <button className={`toggle-btn ${form.dietary_pref === 'nonveg' ? 'active' : ''}`} onClick={() => set('dietary_pref', form.dietary_pref === 'nonveg' ? '' : 'nonveg')}>🍖 Non-Veg</button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Spouse Name (optional)</label>
          <input className="form-input" placeholder="e.g. Archana" value={form.spouse_name} onChange={e => set('spouse_name', e.target.value)} />
        </div>

        {form.spouse_name && (
          <div className="form-group">
            <label className="form-label">Spouse Dietary Preference</label>
            <div className="toggle-group">
              <button className={`toggle-btn ${form.spouse_dietary_pref === 'veg' ? 'active' : ''}`} onClick={() => set('spouse_dietary_pref', form.spouse_dietary_pref === 'veg' ? '' : 'veg')}>🌿 Veg only</button>
              <button className={`toggle-btn ${form.spouse_dietary_pref === 'nonveg' ? 'active' : ''}`} onClick={() => set('spouse_dietary_pref', form.spouse_dietary_pref === 'nonveg' ? '' : 'nonveg')}>🍖 Non-Veg</button>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Main WhatsApp Group</label>
          <div className="toggle-group">
            <button className={`toggle-btn ${form.on_main_wa_group ? 'active' : ''}`} onClick={() => set('on_main_wa_group', true)}>✅ Yes</button>
            <button className={`toggle-btn ${!form.on_main_wa_group ? 'active' : ''}`} onClick={() => set('on_main_wa_group', false)}>❌ No</button>
          </div>
        </div>

        {isAdmin && (
          <div className="form-group">
            <label className="form-label">Admin Access</label>
            <div className="toggle-group">
              <button className={`toggle-btn ${form.is_admin ? 'active' : ''}`} onClick={() => set('is_admin', true)} style={{ borderColor: form.is_admin ? 'var(--admin)' : undefined }}>👑 Admin</button>
              <button className={`toggle-btn ${!form.is_admin ? 'active' : ''}`} onClick={() => set('is_admin', false)}>Regular member</button>
            </div>
            <div className="form-hint">Only visible to you as Admin</div>
          </div>
        )}

        {existing && existing.id !== identity?.id && (
          <div style={{ marginBottom: 12 }}>
            <button
              className="btn btn-secondary btn-full"
              onClick={() => { saveIdentity(existing); onClose() }}
              style={{ borderColor: 'var(--navy)', color: 'var(--navy)' }}
            >
              Switch to {existing.name}
            </button>
            <div className="form-hint" style={{ textAlign: 'center', marginTop: 4 }}>Tap to log in as this person on this device</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving}>{saving ? 'Saving...' : existing ? 'Save Changes' : 'Add Member'}</button>
          {existing && (isAdmin || true) && <button className="btn btn-danger" onClick={handleDelete}>Delete</button>}
        </div>
      </div>
    </div>
  )
}

export default function MembersPage() {
  const { identity, isAdmin } = useIdentity()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('members').select('*').order('name')
    setMembers(data || []); setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase())
    const matchCity = cityFilter === 'all'
      || (cityFilter === 'ncr' && (m.cities || []).some(c => NCR_VALUES.includes(c)))
      || (m.cities || []).includes(cityFilter)
    return matchSearch && matchCity
  })

  const cityLabel = (cities) => {
    if (!cities || cities.length === 0) return 'No region set'
    const labels = cities.map(c => {
      if (NCR_VALUES.includes(c)) return 'Delhi-NCR'
      return REGIONS.find(cl => cl.value === c)?.label || c
    })
    return [...new Set(labels)].join(', ')
  }

  const dietLabel = (pref) => pref === 'veg' ? '🌿' : pref === 'nonveg' ? '🍖' : ''

  const FILTER_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'ncr', label: 'Delhi-NCR' },
    { value: 'bangalore', label: 'Bangalore' },
    { value: 'mumbai', label: 'Mumbai' },
    { value: 'other_india', label: 'Other India' },
    { value: 'bay_area', label: 'Bay Area' },
    { value: 'chicago', label: 'Chicago' },
    { value: 'new_york', label: 'New York' },
    { value: 'other_usa', label: 'Other USA' },
    { value: 'middle_east', label: 'Middle East' },
    { value: 'singapore', label: 'Singapore' },
    { value: 'australia', label: 'Australia' },
    { value: 'rest_of_world', label: 'RoW' },
  ]

  return (
    <div>
      <div className="top-bar">
        <div className="brand">IITK84 <span>MeetUps</span></div>
        {isAdmin && <span className="badge badge-admin">👑 Admin</span>}
      </div>
      <div className="page">
        <div className="page-header">
          <div className="page-title">Members</div>
          <div className="page-subtitle">{members.length} batchmates in directory</div>
        </div>

        <input className="search-box" placeholder="🔍 Search by name..." value={search} onChange={e => setSearch(e.target.value)} />

        <div className="filter-bar">
          {FILTER_OPTIONS.map(f => (
            <button key={f.value} className={`filter-chip ${cityFilter === f.value ? 'active' : ''}`} onClick={() => setCityFilter(f.value)}>{f.label}</button>
          ))}
        </div>

        {loading ? <div className="spinner">Loading...</div> :
          filtered.length === 0 ? (
            <div className="empty"><div className="empty-icon">👥</div><div className="empty-text">No members found</div></div>
          ) : filtered.map(m => (
            <div key={m.id} className="member-card" style={{ cursor: 'pointer' }} onClick={() => setEditing(m)}>
              <div className="member-avatar" style={{ background: m.is_admin ? 'var(--admin)' : 'var(--navy)' }}>{m.name[0]}</div>
              <div className="member-info">
                <div className="member-name">
                  {m.name} {dietLabel(m.dietary_pref)}
                  {m.is_admin && <span className="badge badge-admin" style={{ marginLeft: 6, fontSize: 10 }}>👑 Admin</span>}
                  {m.on_main_wa_group && <span style={{ fontSize: 10, color: 'var(--green)', marginLeft: 4 }}>●WA</span>}
                </div>
                {m.spouse_name && <div style={{ fontSize: 11, color: 'var(--text3)' }}>+{m.spouse_name} {dietLabel(m.spouse_dietary_pref)}</div>}
                <div className="member-cities">{cityLabel(m.cities)}</div>
                {m.whatsapp && <div className="member-wa">📱 {m.whatsapp}</div>}
              </div>
            </div>
          ))
        }
      </div>

      <button className="fab" onClick={() => setShowForm(true)}>+</button>
      {showForm && <MemberForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
      {editing && <MemberForm existing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </div>
  )
}
