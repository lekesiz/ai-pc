import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, setAuthToken } from '@/services/api'
import type { User, LoginCredentials, RegisterData } from '@/types/auth'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/api/auth/login', credentials)
          const { access_token } = response.data
          // refresh_token is now in httpOnly cookie, not in response body

          // Set access token
          setAuthToken(access_token)

          // Fetch user data
          const userResponse = await api.get('/api/auth/me')

          set({
            token: access_token,
            user: userResponse.data,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          await api.post('/api/auth/register', data)
          
          // Auto-login after registration
          await get().login({
            username: data.username,
            password: data.password,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          // Call logout endpoint to clear httpOnly cookie
          await api.post('/api/auth/logout')
        } catch (error) {
          // Continue with logout even if request fails
          console.error('Logout request failed:', error)
        }

        // Clear access token and state
        setAuthToken(null)
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      fetchUser: async () => {
        const token = get().token
        if (!token) return

        try {
          setAuthToken(token)
          const response = await api.get('/api/auth/me')
          set({ user: response.data })
        } catch (error) {
          get().logout()
          throw error
        }
      },

      updateUser: async (data) => {
        set({ isLoading: true })
        try {
          const response = await api.put('/api/auth/me', data)
          set({ user: response.data, isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)