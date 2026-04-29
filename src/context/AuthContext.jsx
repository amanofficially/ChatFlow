import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

// Demo credentials for quick login
export const DEMO_CREDENTIALS = {
  email: 'demo@chatflow.app',
  password: 'demo123',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('chat_user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch { localStorage.removeItem('chat_user') }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    // Any email/password works in demo mode
    const fakeUser = {
      _id: 'u1',
      username: email === DEMO_CREDENTIALS.email ? 'Demo User' : email.split('@')[0],
      email,
      avatar: null,
    }
    setUser(fakeUser)
    localStorage.setItem('chat_user', JSON.stringify(fakeUser))
    return { user: fakeUser }
  }

  const signup = async (username, email, password) => {
    const fakeUser = { _id: 'u1', username, email, avatar: null }
    setUser(fakeUser)
    localStorage.setItem('chat_user', JSON.stringify(fakeUser))
    return { user: fakeUser }
  }

  const logout = async () => {
    setUser(null)
    localStorage.removeItem('chat_user')
  }

  const updateProfile = async (updates) => {
    const updated = { ...user, ...updates }
    setUser(updated)
    localStorage.setItem('chat_user', JSON.stringify(updated))
    return { user: updated }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
