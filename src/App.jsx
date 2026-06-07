import React, { useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { IdentityProvider, useIdentity } from './lib/IdentityContext'
import IdentityPicker from './components/IdentityPicker'
import MeetupsPage from './pages/MeetupsPage'
import VisitsPage from './pages/VisitsPage'
import MembersPage from './pages/MembersPage'
import PastPage from './pages/PastPage'
import { APP_VERSION, FEEDBACK_EMAIL, APP_AUTHOR } from './lib/constants'

function IdentityBar() {
  const { identity, setShowPicker, clearIdentity } = useIdentity()
  return (
    <div className="identity-bar">
      {identity ? (
        <>
          <div>
            <div className="identity-name">👤 {identity.name}</div>
            <div className="identity-hint">Tap to switch</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPicker(true)}>Switch</button>
        </>
      ) : (
        <>
          <div className="identity-hint">You're browsing anonymously</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowPicker(true)}>Set Identity</button>
        </>
      )}
    </div>
  )
}

function AppInner() {
  const { showPicker, setShowPicker } = useIdentity()
  const location = useLocation()

  const navItems = [
    { to: '/', label: 'Meetups', icon: '🍽️' },
    { to: '/visits', label: 'Visits', icon: '✈️' },
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
          <Route path="/members" element={<MembersPage />} />
          <Route path="/past" element={<PastPage />} />
        </Routes>
      </div>
      <nav className="bottom-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      {showPicker && <IdentityPicker onClose={() => setShowPicker(false)} />}
      <footer className="app-footer">
        <div className="footer-version">{APP_VERSION}</div>
        <div className="footer-text">
          Designed & vibe coded by {APP_AUTHOR}<br/>
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
