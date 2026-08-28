import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'

export interface UserProfile {
  id: string
  email: string
  name: string
  avatar?: string
  created?: string
  updated?: string
}

interface AuthContextType {
  user: UserProfile | null
  rawRecord: RecordModel | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<RecordModel>
  logout: () => void
  requestPasswordReset: (email: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const REMEMBER_KEY = 'rubra_remember_me'

function recordToProfile(record: RecordModel | null): UserProfile | null {
  if (!record) return null
  return {
    id: record.id,
    email: record.email || ((record as Record<string, unknown>).email as string) || '',
    name:
      ((record as Record<string, unknown>).name as string) ||
      (record.email?.split('@')[0] ?? 'Usuário'),
    avatar: (record as Record<string, unknown>).avatar as string | undefined,
    created: record.created,
    updated: record.updated,
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => recordToProfile(pb.authStore.record))
  const [rawRecord, setRawRecord] = useState<RecordModel | null>(() => pb.authStore.record)
  const [token, setToken] = useState<string | null>(() => pb.authStore.token || null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // Initial verification
    const shouldRemember = localStorage.getItem(REMEMBER_KEY) === 'true'

    // If not remembered and we just opened a new tab/session where localStorage was cleaned,
    // Pocketbase might have persisted in localStorage default store.
    // Check if session is valid.
    if (pb.authStore.isValid && pb.authStore.record) {
      if (!shouldRemember && !sessionStorage.getItem('rubra_session_active')) {
        // Was not remembered and this is a fresh window/tab session -> clear
        pb.authStore.clear()
        setUser(null)
        setRawRecord(null)
        setToken(null)
      } else {
        setUser(recordToProfile(pb.authStore.record))
        setRawRecord(pb.authStore.record)
        setToken(pb.authStore.token)
        if (!shouldRemember) {
          sessionStorage.setItem('rubra_session_active', 'true')
        }
      }
    } else {
      pb.authStore.clear()
      setUser(null)
      setRawRecord(null)
      setToken(null)
    }

    setIsLoading(false)

    // Listen to changes in auth store
    const unsubscribe = pb.authStore.onChange((newToken, newModel) => {
      setToken(newToken || null)
      setRawRecord(newModel)
      setUser(recordToProfile(newModel))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string, rememberMe = true) => {
    // Authenticate via PocketBase
    const authData = await pb.collection('users').authWithPassword(email.trim(), password)

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, 'true')
      sessionStorage.removeItem('rubra_session_active')
    } else {
      localStorage.removeItem(REMEMBER_KEY)
      sessionStorage.setItem('rubra_session_active', 'true')
    }

    setUser(recordToProfile(authData.record))
    setRawRecord(authData.record)
    setToken(authData.token)

    return authData.record
  }, [])

  const logout = useCallback(() => {
    pb.authStore.clear()
    localStorage.removeItem(REMEMBER_KEY)
    sessionStorage.removeItem('rubra_session_active')
    setUser(null)
    setRawRecord(null)
    setToken(null)
  }, [])

  const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    try {
      await pb.collection('users').requestPasswordReset(email.trim())
      return true
    } catch (err) {
      // For security and per spec, success state is shown regardless, but we catch network/404 errors gracefully
      if (err instanceof ClientResponseError && err.status >= 500) {
        throw err
      }
      return true
    }
  }, [])

  const value: AuthContextType = {
    user,
    rawRecord,
    token,
    isAuthenticated: !!token && !!user && pb.authStore.isValid,
    isLoading,
    login,
    logout,
    requestPasswordReset,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
