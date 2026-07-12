import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { IdentityProvider, useIdentity } from './lib/IdentityContext'
import IdentityPicker from './components/IdentityPicker'
import MeetupsPage from './pages/MeetupsPage'
import VisitsPage from './pages/VisitsPage'
import PollsPage from './pages/PollsPage'
import MembersPage from './pages/MembersPage'
import PastPage from './pages/PastPage'
import { APP_VERSION, FEEDBACK_EMAIL, APP_AUTHOR } from './lib/constants'

function IdentityBar() {
  const { identity, setShowPicker, isAdmin } = useIdentity()
  return (
    <div className="identity-bar">
      {identity ? (
        <>
          <div>
            <div className="identity-name">
              {identity.name}
              {isAdmin && <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 10 }}>Admin</span>}
            </div>
            <div className="identity-hint">
              {isAdmin ? 'Tap Switch to change identity' : 'Go to Members tab to switch identity'}
            </div>
          </div>
          {isAdmin && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPicker(true)}>Switch</button>
          )}
        </>
      ) : (
        <>
          <div className="identity-hint">You're browsing anonymously</div>
          <button className="btn btn-secondary btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => setShowPicker(true)}>Set Identity</button>
        </>
      )}
    </div>
  )
}

function AppInner() {
  const { showPicker, setShowPicker } = useIdentity()

  const navItems = [
    { to: '/', label: 'Meetups', icon: '🍽️' },
    { to: '/visits', label: 'Visits', icon: '✈️' },
    { to: '/polls', label: 'Polls', icon: '🗳️' },
    { to: '/members', label: 'Members', icon: '👥' },
    { to: '/past', label: 'Past', icon: '📅' },
  ]

  return (
    <div className="app">
      <IdentityBar />
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <Routes>
          <Route path="/" element={<MeetupsPage />} />
          <Route path="/visits" element={<VisitsPage />} />
          <Route path="/polls" element={<PollsPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/past" element={<PastPage />} />
        </Routes>
      </div>
      <nav className="bottom-nav">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      {showPicker && <IdentityPicker onClose={() => setShowPicker(false)} />}
      <footer className="app-footer">
        <div className="footer-version">{APP_VERSION}</div>
        <div className="footer-text">
          Designed & vibe coded by {APP_AUTHOR}<br />
          Feedback / bugs: {FEEDBACK_EMAIL}
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <IdentityProvider>
      <AppInner />
    </IdentityProvider>
  )
}
