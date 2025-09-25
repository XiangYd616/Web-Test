import React, { createContext, useContext, useState, type ReactNode } from 'react'

interface User {
  id: string
  username: string
  email: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  const login = async (username: string, password: string) => {
    setLoading(true)
    try {
      // 模拟登录API调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟用户数据
      const userData: User = {
        id: '1',
        username,
        email: `${username}@example.com`,
        avatar: undefined
      }
      
      setUser(userData)
      localStorage.setItem('token', 'mock-jwt-token')
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('token')
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
