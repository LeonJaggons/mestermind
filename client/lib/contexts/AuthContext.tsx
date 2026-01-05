"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"
import { User, onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase/config"
import { syncUserToDatabase } from "@/lib/hooks/useUserSync"

interface AuthContextType {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      setLoading(false)
      
      // Automatically sync user to database when they authenticate
      if (user && user.email) {
        try {
          await syncUserToDatabase({
            email: user.email,
            role: 'customer', // Default role, can be updated later
            firebaseUid: user.uid,
          })
        } catch (error) {
          // Don't block authentication if sync fails
          console.error("Failed to sync user to database:", error)
        }
      }
    })

    return unsubscribe
  }, [])

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
