import React, { createContext, useContext, useState, useEffect } from 'react'

const IdentityContext = createContext(null)

export function IdentityProvider({ children }) {
  const [identity, setIdentity] = useState(() => {
    try {
      const saved = localStorage.getItem('iitk84_identity')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [showPicker, setShowPicker] = useState(false)

  const saveIdentity = (member) => {
    setIdentity(member)
    localStorage.setItem('iitk84_identity', JSON.stringify(member))
    setShowPicker(false)
  }

  const clearIdentity = () => {
    setIdentity(null)
    localStorage.removeItem('iitk84_identity')
  }

  return (
    <IdentityContext.Provider value={{ identity, saveIdentity, clearIdentity, showPicker, setShowPicker }}>
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity() {
  return useContext(IdentityContext)
}
