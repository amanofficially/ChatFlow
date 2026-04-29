import { createContext, useContext, useState } from 'react'

const SocketContext = createContext()

// DEMO MODE: No real socket connection needed
export function SocketProvider({ children }) {
  const [onlineUsers] = useState(['u2', 'u4', 'u6'])
  const [isConnected] = useState(true)

  const getSocket = () => null

  return (
    <SocketContext.Provider value={{ socket: null, getSocket, onlineUsers, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
