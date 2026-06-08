import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../lib/IdentityContext'
import { REGIONS, NCR_VALUES, MEAL_TYPES } from '../lib/constants'
import { format } from 'date-fns'

export default function MeetupDetail({ meetup, onClose, onEdit, onDeleted }) {
  const { identity, setShowPicker } = useIdentity()
  const [rsvps, setRsvps] = useState([])
  const [myRsvp, setMyRsvp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [extraGuests, setExtraGuests] = useState(0)

  const loadRsvps = async () => {
    const { data } = await supabase
      .from('rsvps')
      .select('*, members(name, spouse_name, dietary_pref, spouse_dietary_pref)')
      .eq('meetup_id', meetup.id)
    setRsvps(data || [])
    if (identity) {
      const mine = (data || []).find(r => r.member_id === identity.id)
      setMyRsvp(mine || null)
      setExtraGuests(mine?.extra_guests || 0)
    }
    setLoading(false)
  }

  useEffect(() => { loadRsvps() }, [meetup.id, identity])

  const handleRsvp = async (status) => {
    if (!identity) { setShowPicker(true); return }
    setSaving(true)
    if (myRsvp && myRsvp.status === status) {
      await supabase.from('rsvps').delete().eq('id', myRsvp.id)
      setMyRsvp(null)
    } else {
      const payload = {
        meetup_id: meetup.id,
        member_id: identity.id,
        member_name: identity.name,
        status,
        with_spouse: myRsvp?.with_spouse || false,
        extra_guests: extraGuests,
      }
      if (myRsvp) {
        await supabase.from('rsvps').update(payload).eq('id', myRsvp.id)
      } else {
        await supabase.from('rsvps').insert(payload)
      }
    }
    await loadRsvps()
    setSaving(false)
  }

  const toggleSpouse = async () => {
    if (!myRsvp) return
    await supabase.from('rsvps').update({ with_spouse: !myRsvp.with_spouse }).eq('id', myRsvp.id)
    await loadRsvps()
  }

  const updateExtraGuests = async (val) => {
    const n = Math.max(0, val)
    setExtraGuests(n)
    if (myRsvp) {
      await supabase.from('rsvps').update({ extra_guests: n }).eq('id', myRsvp.id)
      await loadRsvps()
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this meetup?')) return
    await supabase.from('meetups').delete().eq('id', meetup.id)
    onDeleted()
  }

  const coming = rsvps.filter(r => r.status === 'coming')
  const maybe = rsvps.filter(r => r.status === 'maybe')
  const regrets = rsvps.filter(r => r.status === 'regrets')
  const spouseCount = coming.filter(r => r.with_spouse).length
  const extraGuestsTotal = coming.reduce((sum, r) => sum + (r.extra_guests || 0), 0)

  // Dietary counts — confirmed only, member + spouse combined
  const dietaryCounts = coming.reduce((acc, r) => {
    const memberPref = r.members?.dietary_pref
    if (memberPref === 'veg') acc.veg++
    else if (memberPref === 'nonveg') acc.nonveg++
    else acc.unspecified++

    if (r.with_spouse) {
      const spousePref = r.members?.spouse_dietary_pref
      if (spousePref === 'veg') acc.veg++
      else if (spousePref === 'nonveg') acc.nonveg++
      else acc.unspecified++
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

  const formatDate = (dt) => {
    if (!dt) return ''
    return format(new Date(dt), 'EEE, d MMM yyyy • h:mm a')
  }

  const attendeeName = (r) => {
    const spouseName = r.members?.spouse_name
    if (r.with_spouse && spouseName) return `${r.member_name} + ${spouseName}`
    if (r.with_spouse) return `${r.member_name} + 1`
    return r.member_name
  }

  const shareText = () => {
    const dietLine = coming.length > 0
      ? `🌿 Veg: ${dietaryCounts.veg}  🍖 Non-Veg: ${dietaryCounts.nonveg}${dietaryCounts.unspecified > 0 ? `  ❓ Not specified: ${dietaryCounts.unspecified}` : ''}`
      : ''
    const lines = [
      `⚠️ TEST DATA — IGNORE`,
      `🎉 IITK84 MeetUp — ${regionLabel()}`,
      meetup.meal_type ? `🍽️ ${mealLabel()}` : '',
      meetup.label ? `📌 ${meetup.label}` : '',
      meetup.meetup_type === 'visit' ? `✈️ Occasion: ${meetup.visitor_names} visiting` : '',
      `📅 ${formatDate(meetup.date_time)}`,
      meetup.venue_name ? `📍 ${meetup.venue_name}` : '',
      meetup.with_spouses ? '👫 With spouses' : '👤 Batchmates only',
      `⚓ Anchor: ${meetup.anchor_name}`,
      coming.length > 0 ? `\n✅ Coming (${coming.length} batchmates${spouseCount > 0 ? ` + ${spouseCount} spouses` : ''}${extraGuestsTotal > 0 ? ` + ${extraGuestsTotal} guests` : ''}):\n${coming.map(r => '  ' + attendeeName(r) + (r.extra_guests > 0 ? ` +${r.extra_guests} guest(s)` : '')).join('\n')}` : '',
      dietLine ? `\n🍴 Dietary: ${dietLine}` : '',
      maybe.length > 0 ? `\n🤔 Maybe (${maybe.length}):\n${maybe.map(r => '  ' + r.member_name).join('\n')}` : '',
      regrets.length > 0 ? `\n❌ Regrets (${regrets.length}):\n${regrets.map(r => '  ' + r.member_name).join('\n')}` : '',
      meetup.notes ? `\n📝 ${meetup.notes}` : '',
      `\n📱 Join us on IITK84 MeetUps: https://iitk84-meetups.vercel.app`,
      `👤 Update your profile & preferences: https://iitk84-meetups.vercel.app/members`,
    ].filter(Boolean).join('\n')
    return lines
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ text: shareText() })
    } else {
      navigator.clipboard.writeText(shareText())
      alert('Copied to clipboard! Paste in WhatsApp.')
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div className="card-city">{regionLabel()}</div>
            {meetup.meal_type && <span className="badge badge-visit">{mealLabel()}</span>}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>{cardTitle()}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={`badge ${meetup.meetup_type === 'visit' ? 'badge-visit' : 'badge-local'}`}>
              {meetup.meetup_type === 'visit' ? '✈️ Visit' : '🏠 Local'}
            </span>
            {meetup.with_spouses && <span className="badge badge-spouse">👫 With spouses</span>}
          </div>
        </div>

        <div className="card-meta">
          {meetup.date_time && <div className="meta-item">📅 {formatDate(meetup.date_time)}</div>}
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

        {/* RSVP section */}
        {meetup.status === 'upcoming' && (
          <>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Your RSVP</div>
            <div className="rsvp-actions">
              <button className={`rsvp-btn coming ${myRsvp?.status === 'coming' ? 'active' : ''}`} onClick={() => handleRsvp('coming')} disabled={saving}>✅ Coming</button>
              <button className={`rsvp-btn maybe ${myRsvp?.status === 'maybe' ? 'active' : ''}`} onClick={() => handleRsvp('maybe')} disabled={saving}>🤔 Maybe</button>
              <button className={`rsvp-btn regrets ${myRsvp?.status === 'regrets' ? 'active' : ''}`} onClick={() => handleRsvp('regrets')} disabled={saving}>❌ Regrets</button>
            </div>

            {myRsvp?.status === 'coming' && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {meetup.with_spouses && (
                  <button className={`toggle-btn ${myRsvp.with_spouse ? 'active' : ''}`} onClick={toggleSpouse}>
                    {myRsvp.with_spouse ? '👫 Spouse will join' : '👤 Spouse not joining'}
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Additional guests</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => updateExtraGuests(extraGuests - 1)}>−</button>
                    <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{extraGuests}</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => updateExtraGuests(extraGuests + 1)}>+</button>
                  </div>
                </div>
              </div>
            )}
            <div className="divider" />
          </>
        )}

        {/* Counts */}
        {loading ? <div className="spinner">Loading...</div> : (
          <>
            <div className="rsvp-bar">
              <div className="rsvp-count"><span className="num">✅ {coming.length}</span><span className="lbl">batchmates{spouseCount > 0 ? ` +${spouseCount} spouses` : ''}{extraGuestsTotal > 0 ? ` +${extraGuestsTotal} guests` : ''}</span></div>
              <div className="rsvp-count"><span className="num">🤔 {maybe.length}</span><span className="lbl">maybe</span></div>
              {regrets.length > 0 && <div className="rsvp-count"><span className="num">❌ {regrets.length}</span><span className="lbl">regrets</span></div>}
            </div>

            {/* Dietary counts */}
            {coming.length > 0 && (
              <div style={{ display: 'flex', gap: 12, marginTop: 8, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, width: '100%', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dietary (confirmed)</span>
                <span style={{ fontSize: 12 }}>🌿 Veg: <strong>{dietaryCounts.veg}</strong></span>
                <span style={{ fontSize: 12 }}>🍖 Non-Veg: <strong>{dietaryCounts.nonveg}</strong></span>
                {dietaryCounts.unspecified > 0 && <span style={{ fontSize: 12 }}>❓ Not specified: <strong>{dietaryCounts.unspecified}</strong></span>}
              </div>
            )}

            {coming.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Coming</div>
                <div className="attendee-list">
                  {coming.map(r => (
                    <div key={r.id} className="attendee-chip">
                      {attendeeName(r)}{r.extra_guests > 0 && <span className="spouse-tag">+{r.extra_guests}</span>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {maybe.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Maybe</div>
                <div className="attendee-list">
                  {maybe.map(r => <div key={r.id} className="attendee-chip maybe">{r.member_name}</div>)}
                </div>
              </>
            )}

            {regrets.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Regrets</div>
                <div className="attendee-list">
                  {regrets.map(r => <div key={r.id} className="attendee-chip" style={{ opacity: 0.5 }}>{r.member_name}</div>)}
                </div>
              </>
            )}
          </>
        )}

        <div className="divider" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="wa-btn" onClick={handleShare}>📱 Share on WhatsApp</button>
          <button className="btn btn-secondary btn-sm" onClick={onEdit}>✏️ Edit</button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑️ Delete</button>
        </div>
      </div>
    </div>
  )
}
