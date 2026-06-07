import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../lib/IdentityContext'
import { CITY_CLUSTERS } from '../lib/constants'
import { format } from 'date-fns'

export default function MeetupDetail({ meetup, onClose, onEdit, onDeleted }) {
  const { identity, setShowPicker } = useIdentity()
  const [rsvps, setRsvps] = useState([])
  const [myRsvp, setMyRsvp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadRsvps = async () => {
    const { data } = await supabase.from('rsvps').select('*').eq('meetup_id', meetup.id)
    setRsvps(data || [])
    if (identity) {
      setMyRsvp((data || []).find(r => r.member_id === identity.id) || null)
    }
    setLoading(false)
  }

  useEffect(() => { loadRsvps() }, [meetup.id, identity])

  const handleRsvp = async (status) => {
    if (!identity) { setShowPicker(true); return }
    setSaving(true)
    if (myRsvp && myRsvp.status === status) {
      // Toggle off
      await supabase.from('rsvps').delete().eq('id', myRsvp.id)
      setMyRsvp(null)
    } else {
      const payload = {
        meetup_id: meetup.id,
        member_id: identity.id,
        member_name: identity.name,
        status,
        with_spouse: myRsvp?.with_spouse || false,
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

  const handleDelete = async () => {
    if (!confirm('Delete this meetup?')) return
    await supabase.from('meetups').delete().eq('id', meetup.id)
    onDeleted()
  }

  const coming = rsvps.filter(r => r.status === 'coming')
  const maybe = rsvps.filter(r => r.status === 'maybe')
  const spouseCount = coming.filter(r => r.with_spouse).length

  const cityLabel = () => {
    if (meetup.custom_city) return meetup.custom_city
    return CITY_CLUSTERS.find(c => c.value === meetup.city_cluster)?.label || meetup.city_cluster
  }

  const shareText = () => {
    const lines = [
      `🎉 IITK84 MeetUp — ${cityLabel()}`,
      meetup.meetup_type === 'visit' ? `✈️ Occasion: ${meetup.visitor_names} visiting` : '',
      `📅 ${meetup.date_time ? format(new Date(meetup.date_time), 'EEE, d MMM yyyy • h:mm a') : 'TBD'}`,
      meetup.venue_name ? `📍 ${meetup.venue_name}` : '',
      meetup.with_spouses ? '👫 With spouses' : '👤 Batchmates only',
      `⚓ Anchor: ${meetup.anchor_name}`,
      coming.length > 0 ? `\n✅ Coming (${coming.length}): ${coming.map(r => r.member_name + (r.with_spouse ? ' +spouse' : '')).join(', ')}` : '',
      maybe.length > 0 ? `🤔 Maybe (${maybe.length}): ${maybe.map(r => r.member_name).join(', ')}` : '',
      meetup.notes ? `\n📝 ${meetup.notes}` : '',
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
          <div className="card-city">{cityLabel()}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>{meetup.title}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={`badge ${meetup.meetup_type === 'visit' ? 'badge-visit' : 'badge-local'}`}>
              {meetup.meetup_type === 'visit' ? '✈️ Visit' : '🏠 Local'}
            </span>
            {meetup.with_spouses && <span className="badge badge-spouse">👫 With spouses</span>}
          </div>
        </div>

        <div className="card-meta">
          {meetup.date_time && (
            <div className="meta-item">📅 {format(new Date(meetup.date_time), 'EEE, d MMM yyyy • h:mm a')}</div>
          )}
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
              <button
                className={`rsvp-btn coming ${myRsvp?.status === 'coming' ? 'active' : ''}`}
                onClick={() => handleRsvp('coming')} disabled={saving}>
                ✅ Coming
              </button>
              <button
                className={`rsvp-btn maybe ${myRsvp?.status === 'maybe' ? 'active' : ''}`}
                onClick={() => handleRsvp('maybe')} disabled={saving}>
                🤔 Maybe
              </button>
            </div>
            {myRsvp?.status === 'coming' && meetup.with_spouses && (
              <button className={`toggle-btn ${myRsvp.with_spouse ? 'active' : ''}`} style={{ marginTop: 8, width: '100%' }} onClick={toggleSpouse}>
                {myRsvp.with_spouse ? '👫 Bringing spouse' : '👤 Not bringing spouse'}
              </button>
            )}
            <div className="divider" />
          </>
        )}

        {/* Attendee counts */}
        {loading ? <div className="spinner">Loading...</div> : (
          <>
            <div className="rsvp-bar">
              <div className="rsvp-count"><span className="num">✅ {coming.length}</span><span className="lbl">coming{spouseCount > 0 ? ` +${spouseCount} spouses` : ''}</span></div>
              <div className="rsvp-count"><span className="num">🤔 {maybe.length}</span><span className="lbl">maybe</span></div>
            </div>

            {coming.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Coming</div>
                <div className="attendee-list">
                  {coming.map(r => (
                    <div key={r.id} className="attendee-chip">
                      {r.member_name}{r.with_spouse && <span className="spouse-tag">+spouse</span>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {maybe.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Maybe</div>
                <div className="attendee-list">
                  {maybe.map(r => (
                    <div key={r.id} className="attendee-chip maybe">{r.member_name}</div>
                  ))}
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
