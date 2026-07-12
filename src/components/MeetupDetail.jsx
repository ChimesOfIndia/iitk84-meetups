import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../lib/IdentityContext'
import { REGIONS, NCR_VALUES, MEAL_TYPES, TIMEZONES, formatInTZ } from '../lib/constants'

export default function MeetupDetail({ meetup, onClose, onEdit, onDeleted }) {
  const { identity, isAdmin } = useIdentity()
  const [rsvps, setRsvps] = useState([])
  const [myRsvp, setMyRsvp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [extraGuests, setExtraGuests] = useState(0)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestForm, setShowSuggestForm] = useState(false)
  const [suggestForm, setSuggestForm] = useState({ venue_name: '', maps_url: '', comment: '' })
  const [savingSuggestion, setSavingSuggestion] = useState(false)
  const [editingSuggestion, setEditingSuggestion] = useState(null)
  const [showBehalfForm, setShowBehalfForm] = useState(false)
  const [behalfMember, setBehalfMember] = useState(null)
  const [behalfStatus, setBehalfStatus] = useState('coming')
  const [behalfWithSpouse, setBehalfWithSpouse] = useState(false)
  const [allMembers, setAllMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')

  const loadData = async () => {
    const [rsvpRes, sugRes] = await Promise.all([
      supabase.from('rsvps').select('*, members(name, spouse_name, dietary_pref, spouse_dietary_pref)').eq('meetup_id', meetup.id),
      supabase.from('venue_suggestions').select('*').eq('meetup_id', meetup.id).order('created_at')
    ])
    setRsvps(rsvpRes.data || [])
    setSuggestions(sugRes.data || [])
    if (identity) {
      const mine = (rsvpRes.data || []).find(r => r.member_id === identity.id)
      setMyRsvp(mine || null)
      setExtraGuests(mine?.extra_guests || 0)
    }
    // Load members for behalf RSVP
    if (allMembers.length === 0) {
      const { data: mems } = await supabase.from('members').select('id, name').order('name')
      setAllMembers(mems || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [meetup.id, identity])

  const coming = rsvps.filter(r => r.status === 'coming')
  const maybe = rsvps.filter(r => r.status === 'maybe')
  const regrets = rsvps.filter(r => r.status === 'regrets')
  const spouseCount = coming.filter(r => r.with_spouse).length
  const extraGuestsTotal = coming.reduce((sum, r) => sum + (r.extra_guests || 0), 0)

  const isAnchor = identity?.id === meetup.anchor_id || identity?.name === meetup.anchor_name
  const isConfirmed = coming.some(r => r.member_id === identity?.id)
  const canEdit = isAdmin || isAnchor || isConfirmed

  const canEditSuggestion = (s) => isAdmin || isAnchor || identity?.name === s.suggested_by_name

  const handleRsvp = async (status) => {
    if (!identity) return
    setSaving(true)
    if (myRsvp && myRsvp.status === status) {
      await supabase.from('rsvps').delete().eq('id', myRsvp.id)
      setMyRsvp(null)
    } else {
      const payload = { meetup_id: meetup.id, member_id: identity.id, member_name: identity.name, status, with_spouse: myRsvp?.with_spouse || false, extra_guests: extraGuests }
      if (myRsvp) { await supabase.from('rsvps').update(payload).eq('id', myRsvp.id) }
      else { await supabase.from('rsvps').insert(payload) }
    }
    await loadData(); setSaving(false)
  }

  const submitBehalfRsvp = async () => {
    if (!behalfMember) return
    setSaving(true)
    const payload = {
      meetup_id: meetup.id,
      member_id: behalfMember.id,
      member_name: behalfMember.name,
      status: behalfStatus,
      with_spouse: behalfWithSpouse,
      extra_guests: 0,
    }
    const existing = rsvps.find(r => r.member_id === behalfMember.id)
    if (existing) {
      await supabase.from('rsvps').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('rsvps').insert(payload)
    }
    setShowBehalfForm(false)
    setBehalfMember(null)
    setBehalfStatus('coming')
    setBehalfWithSpouse(false)
    setMemberSearch('')
    await loadData()
    setSaving(false)
  }

  const toggleSpouse = async () => {
    if (!myRsvp) return
    await supabase.from('rsvps').update({ with_spouse: !myRsvp.with_spouse }).eq('id', myRsvp.id)
    await loadData()
  }

  const updateExtraGuests = async (val) => {
    const n = Math.max(0, val); setExtraGuests(n)
    if (myRsvp) { await supabase.from('rsvps').update({ extra_guests: n }).eq('id', myRsvp.id); await loadData() }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this meetup?')) return
    await supabase.from('meetups').delete().eq('id', meetup.id)
    onDeleted()
  }

  const submitSuggestion = async () => {
    if (!suggestForm.venue_name.trim()) return
    setSavingSuggestion(true)
    await supabase.from('venue_suggestions').insert({
      meetup_id: meetup.id,
      suggested_by_name: identity?.name || 'Anonymous',
      venue_name: suggestForm.venue_name,
      maps_url: suggestForm.maps_url,
      comment: suggestForm.comment,
    })
    setSuggestForm({ venue_name: '', maps_url: '', comment: '' })
    setShowSuggestForm(false)
    setSavingSuggestion(false)
    await loadData()
  }

  const saveSuggestionEdit = async () => {
    if (!editingSuggestion?.venue_name?.trim()) return
    setSavingSuggestion(true)
    await supabase.from('venue_suggestions').update({
      venue_name: editingSuggestion.venue_name,
      maps_url: editingSuggestion.maps_url,
      comment: editingSuggestion.comment,
    }).eq('id', editingSuggestion.id)
    setEditingSuggestion(null)
    setSavingSuggestion(false)
    await loadData()
  }

  const deleteSuggestion = async (s) => {
    if (!confirm(`Remove suggestion "${s.venue_name}"?`)) return
    await supabase.from('venue_suggestions').delete().eq('id', s.id)
    await loadData()
  }

  const confirmVenue = async (s) => {
    if (!confirm(`Confirm "${s.venue_name}" as the venue? This will update the meetup.`)) return
    await supabase.from('venue_suggestions').update({ is_confirmed: true }).eq('id', s.id)
    await supabase.from('meetups').update({ venue_name: s.venue_name, venue_maps_url: s.maps_url || meetup.venue_maps_url }).eq('id', meetup.id)
    await loadData()
  }

  const dietaryCounts = coming.reduce((acc, r) => {
    const mp = r.members?.dietary_pref
    if (mp === 'veg') acc.veg++; else if (mp === 'nonveg') acc.nonveg++; else acc.unspecified++
    if (r.with_spouse) {
      const sp = r.members?.spouse_dietary_pref
      if (sp === 'veg') acc.veg++; else if (sp === 'nonveg') acc.nonveg++; else acc.unspecified++
    }
    return acc
  }, { veg: 0, nonveg: 0, unspecified: 0 })

  const regionLabel = () => {
    if (meetup.custom_city) return meetup.custom_city
    if (NCR_VALUES.includes(meetup.city_cluster)) return 'Delhi-NCR'
    return REGIONS.find(c => c.value === meetup.city_cluster)?.label || meetup.city_cluster
  }

  const mealLabel = () => MEAL_TYPES.find(m => m.value === meetup.meal_type)?.label || ''

  const cardTitle = () => {
    const parts = []
    if (meetup.label) parts.push(meetup.label)
    if (meetup.meal_type) parts.push(mealLabel())
    if (parts.length === 0) return meetup.meetup_type === 'visit' ? `${meetup.visitor_names} visiting` : `${regionLabel()} Meetup`
    return parts.join(' — ')
  }

  const attendeeName = (r) => {
    const sn = r.members?.spouse_name
    if (r.with_spouse && sn) return `${r.member_name} + ${sn}`
    if (r.with_spouse) return `${r.member_name} + 1`
    return r.member_name
  }

  const tz = meetup.timezone || 'Asia/Kolkata'

  const shareText = () => {
    const NL = '\n'
    const DIV = '─────────────────────'
    const comingLabel = [
      `${coming.length} ${coming.length === 1 ? 'batchmate' : 'batchmates'}`,
      spouseCount > 0 ? `+ ${spouseCount} ${spouseCount === 1 ? 'spouse' : 'spouses'}` : '',
      extraGuestsTotal > 0 ? `+ ${extraGuestsTotal} guests` : '',
    ].filter(Boolean).join(' ')

    const parts = []
    parts.push('*IITK84 MeetUp*')
    parts.push('*' + cardTitle() + '*')
    parts.push('_' + regionLabel() + (meetup.meal_type ? ' · ' + mealLabel() : '') + (meetup.meetup_type === 'visit' ? ' · ' + meetup.visitor_names + ' visiting' : '') + '_')
    parts.push('')
    parts.push(DIV)
    if (meetup.date_time) parts.push('📅  *Date:* ' + formatInTZ(meetup.date_time, tz))
    parts.push('📍  *Venue:* ' + (meetup.venue_name || 'TBD'))
    parts.push('👫  ' + (meetup.with_spouses ? 'With spouses' : 'Batchmates only'))
    parts.push('⚓  *Anchor:* ' + meetup.anchor_name)
    if (meetup.notes) parts.push('📝  _' + meetup.notes + '_')
    parts.push('')
    parts.push(DIV)
    if (coming.length > 0) {
      parts.push('✅  *Coming* (' + comingLabel + ')')
      coming.forEach(r => parts.push('    • ' + attendeeName(r) + (r.extra_guests > 0 ? ' +' + r.extra_guests + ' guest(s)' : '')))
    } else {
      parts.push('✅  *Coming:* None yet')
    }
    const totalDiet = dietaryCounts.veg + dietaryCounts.nonveg + dietaryCounts.unspecified
    if (totalDiet > 0) {
      parts.push('')
      let dietStr = '🍽️  *Dietary:* 🌿 Veg ' + dietaryCounts.veg + '  🍖 Non-Veg ' + dietaryCounts.nonveg
      if (dietaryCounts.unspecified > 0) dietStr += '  ❓ Not specified ' + dietaryCounts.unspecified
      parts.push(dietStr)
    }
    if (maybe.length > 0) {
      parts.push('')
      parts.push('🤔  *Maybe* (' + maybe.length + ')')
      maybe.forEach(r => parts.push('    • ' + r.member_name))
    }
    if (regrets.length > 0) {
      parts.push('')
      parts.push('❌  *Regrets* (' + regrets.length + ')')
      regrets.forEach(r => parts.push('    • ' + r.member_name))
    }
    parts.push('')
    parts.push(DIV)
    parts.push('_IITK84 MeetUps app:_')
    parts.push('https://iitk84-meetups.vercel.app')

    return parts.join(NL)
  }


  const handleShare = () => {
    const text = shareText()
    if (navigator.share) { navigator.share({ text }) }
    else { navigator.clipboard.writeText(text); alert('Copied to clipboard! Paste in WhatsApp.') }
  }

  const hasConfirmedVenue = suggestions.some(s => s.is_confirmed)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div className="card-region">{regionLabel()}</div>
            {meetup.meal_type && <span className="badge badge-visit">{mealLabel()}</span>}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--navy)', marginBottom: 8 }}>{cardTitle()}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={`badge ${meetup.meetup_type === 'visit' ? 'badge-visit' : 'badge-local'}`}>
              {meetup.meetup_type === 'visit' ? '✈️ Visit' : '🏠 Local'}
            </span>
            {meetup.with_spouses && <span className="badge badge-spouse">👫 With spouses</span>}
          </div>
        </div>

        <div className="card-meta">
          {meetup.date_time && <div className="meta-item">📅 {formatInTZ(meetup.date_time, tz)}</div>}
          {meetup.venue_name && (
            <div className="meta-item">
              📍 {meetup.venue_maps_url
                ? <a href={meetup.venue_maps_url} target="_blank" rel="noopener noreferrer" className="venue-link">{meetup.venue_name}</a>
                : meetup.venue_name}
            </div>
          )}
          <div className="meta-item">⚓ Anchor: {meetup.anchor_name}</div>
        </div>

        {meetup.notes && <div className="notes-box">📝 {meetup.notes}</div>}

        <div className="divider" />

        {/* RSVP */}
        {meetup.status === 'upcoming' && (
          <>
            <div className="section-title" style={{ marginBottom: 8 }}>Your RSVP</div>
            {!identity && <div className="alert alert-info" style={{ marginBottom: 8 }}>Set your identity to RSVP</div>}
            <div className="rsvp-actions">
              <button className={`rsvp-btn coming ${myRsvp?.status === 'coming' ? 'active' : ''}`} onClick={() => handleRsvp('coming')} disabled={saving || !identity}>✅ Coming</button>
              <button className={`rsvp-btn maybe ${myRsvp?.status === 'maybe' ? 'active' : ''}`} onClick={() => handleRsvp('maybe')} disabled={saving || !identity}>🤔 Maybe</button>
              <button className={`rsvp-btn regrets ${myRsvp?.status === 'regrets' ? 'active' : ''}`} onClick={() => handleRsvp('regrets')} disabled={saving || !identity}>❌ Regrets</button>
            </div>

            {myRsvp?.status === 'coming' && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {meetup.with_spouses && (
                  <button className={`toggle-btn ${myRsvp.with_spouse ? 'active' : ''}`} onClick={toggleSpouse}>
                    {myRsvp.with_spouse ? '👫 Spouse will join' : '👤 Spouse not joining'}
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="section-title">Additional guests</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => updateExtraGuests(extraGuests - 1)}>−</button>
                    <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{extraGuests}</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => updateExtraGuests(extraGuests + 1)}>+</button>
                  </div>
                </div>
              </div>
            )}
            {/* RSVP on behalf — Admin and Anchor only */}
            {(isAdmin || isAnchor) && (
              <div style={{ marginTop: 12 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowBehalfForm(s => !s)}
                  style={{ fontSize: 12 }}
                >
                  {showBehalfForm ? 'Cancel' : 'RSVP on behalf of someone'}
                </button>

                {showBehalfForm && (
                  <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 12, marginTop: 10 }}>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <input
                        className="form-input"
                        placeholder="Search member name..."
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {memberSearch.length > 1 && (
                      <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 8, border: '1px solid var(--border)', borderRadius: 6 }}>
                        {allMembers
                          .filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
                          .slice(0, 8)
                          .map(m => (
                            <div
                              key={m.id}
                              onClick={() => { setBehalfMember(m); setMemberSearch(m.name) }}
                              style={{
                                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                                background: behalfMember?.id === m.id ? 'var(--blue-bg)' : 'var(--bg2)',
                                color: behalfMember?.id === m.id ? 'var(--navy)' : 'var(--text)',
                                fontWeight: behalfMember?.id === m.id ? 600 : 400,
                              }}
                            >{m.name}</div>
                          ))
                        }
                      </div>
                    )}
                    <div className="toggle-group" style={{ marginBottom: 8 }}>
                      <button className={`toggle-btn ${behalfStatus === 'coming' ? 'active' : ''}`} onClick={() => setBehalfStatus('coming')}>Coming</button>
                      <button className={`toggle-btn ${behalfStatus === 'maybe' ? 'active' : ''}`} onClick={() => setBehalfStatus('maybe')}>Maybe</button>
                      <button className={`toggle-btn ${behalfStatus === 'regrets' ? 'active' : ''}`} onClick={() => setBehalfStatus('regrets')}>Regrets</button>
                    </div>
                    {meetup.with_spouses && behalfStatus === 'coming' && (
                      <div className="toggle-group" style={{ marginBottom: 8 }}>
                        <button className={`toggle-btn ${behalfWithSpouse ? 'active' : ''}`} onClick={() => setBehalfWithSpouse(true)}>Spouse joining</button>
                        <button className={`toggle-btn ${!behalfWithSpouse ? 'active' : ''}`} onClick={() => setBehalfWithSpouse(false)}>Without spouse</button>
                      </div>
                    )}
                    <button
                      className="btn btn-primary btn-sm btn-full"
                      onClick={submitBehalfRsvp}
                      disabled={!behalfMember || saving}
                    >
                      Save RSVP for {behalfMember?.name || '...'}
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="divider" />
          </>
        )}

        {/* Counts & Attendees */}
        {loading ? <div className="spinner">Loading...</div> : (
          <>
            <div className="rsvp-bar">
              <div className="rsvp-count"><span className="num">✅ {coming.length}</span><span className="lbl">batchmates{spouseCount > 0 ? ` +${spouseCount} sp.` : ''}{extraGuestsTotal > 0 ? ` +${extraGuestsTotal} guests` : ''}</span></div>
              <div className="rsvp-count"><span className="num">🤔 {maybe.length}</span><span className="lbl">maybe</span></div>
              {regrets.length > 0 && <div className="rsvp-count"><span className="num">❌ {regrets.length}</span><span className="lbl">regrets</span></div>}
            </div>

            {coming.length > 0 && (
              <div className="dietary-box" style={{ marginTop: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, width: '100%', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dietary (confirmed)</span>
                <span style={{ fontSize: 12 }}>🌿 Veg: <strong>{dietaryCounts.veg}</strong></span>
                <span style={{ fontSize: 12 }}>🍖 Non-Veg: <strong>{dietaryCounts.nonveg}</strong></span>
                {dietaryCounts.unspecified > 0 && <span style={{ fontSize: 12 }}>❓ Not specified: <strong>{dietaryCounts.unspecified}</strong></span>}
              </div>
            )}

            {coming.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 14, marginBottom: 6 }}>Coming</div>
                <div className="attendee-list">
                  {coming.map(r => <div key={r.id} className="attendee-chip">{attendeeName(r)}{r.extra_guests > 0 && <span className="spouse-tag">+{r.extra_guests}</span>}</div>)}
                </div>
              </>
            )}
            {maybe.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 12, marginBottom: 6 }}>Maybe</div>
                <div className="attendee-list">{maybe.map(r => <div key={r.id} className="attendee-chip maybe">{r.member_name}</div>)}</div>
              </>
            )}
            {regrets.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 12, marginBottom: 6 }}>Regrets</div>
                <div className="attendee-list">{regrets.map(r => <div key={r.id} className="attendee-chip" style={{ opacity: 0.5 }}>{r.member_name}</div>)}</div>
              </>
            )}
          </>
        )}

        {/* Venue Suggestions */}
        {meetup.status === 'upcoming' && (
          <>
            <div className="divider" />
            <div className="section-header">
              <div className="section-title">Venue Suggestions</div>
              {!hasConfirmedVenue && identity && !showSuggestForm && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowSuggestForm(true)}>+ Suggest</button>
              )}
            </div>

            {showSuggestForm && (
              <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 12 }}>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <input className="form-input" placeholder="Venue name *" value={suggestForm.venue_name} onChange={e => setSuggestForm(f => ({ ...f, venue_name: e.target.value }))} autoFocus />
                </div>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <input className="form-input" placeholder="Google Maps URL (optional)" value={suggestForm.maps_url} onChange={e => setSuggestForm(f => ({ ...f, maps_url: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <input className="form-input" placeholder="Comment (optional)" value={suggestForm.comment} onChange={e => setSuggestForm(f => ({ ...f, comment: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowSuggestForm(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={submitSuggestion} disabled={savingSuggestion}>Submit</button>
                </div>
              </div>
            )}

            {suggestions.length === 0 && !showSuggestForm && (
              <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>No venue suggestions yet.</p>
            )}

            {suggestions.map(s => (
              <div key={s.id} className={`suggestion-card ${s.is_confirmed ? 'confirmed' : hasConfirmedVenue ? 'greyed' : ''}`}>
                {editingSuggestion?.id === s.id ? (
                  <div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <input className="form-input" value={editingSuggestion.venue_name} onChange={e => setEditingSuggestion(es => ({ ...es, venue_name: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <input className="form-input" placeholder="Maps URL" value={editingSuggestion.maps_url || ''} onChange={e => setEditingSuggestion(es => ({ ...es, maps_url: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <input className="form-input" placeholder="Comment" value={editingSuggestion.comment || ''} onChange={e => setEditingSuggestion(es => ({ ...es, comment: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingSuggestion(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={saveSuggestionEdit} disabled={savingSuggestion}>Save</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: s.is_confirmed ? 'var(--green)' : 'var(--text)' }}>
                        {s.is_confirmed ? '✅ ' : ''}{s.venue_name}
                      </div>
                      {s.comment && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{s.comment}</div>}
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>by {s.suggested_by_name}</div>
                      {s.maps_url && <a href={s.maps_url} target="_blank" rel="noopener noreferrer" className="venue-link" style={{ fontSize: 12 }}>View on Maps</a>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                      {!hasConfirmedVenue && (isAnchor || isAdmin) && (
                        <button className="btn btn-secondary btn-sm" onClick={() => confirmVenue(s)}>✓ Confirm</button>
                      )}
                      {!s.is_confirmed && canEditSuggestion(s) && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingSuggestion({ ...s })}>✏️</button>
                      )}
                      {canEditSuggestion(s) && (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteSuggestion(s)}>🗑️</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        <div className="divider" />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="wa-btn" onClick={handleShare}>📱 Share</button>
          {canEdit && <button className="btn btn-secondary btn-sm" onClick={onEdit}>✏️ Edit</button>}
          {(isAdmin || isAnchor) && <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑️ Delete</button>}
        </div>

        {!canEdit && meetup.status === 'upcoming' && (
          <div className="alert alert-info" style={{ marginTop: 12 }}>Only the Anchor, confirmed attendees or Admin can edit this meetup.</div>
        )}
      </div>
    </div>
  )
}
