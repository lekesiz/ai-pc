import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuthStore } from '../authStore'
import { api } from '@/services/api'

// Mock axios
vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
  setAuthToken: vi.fn(),
}))

describe('authStore', () => {
  beforeEach(() => {
    // Clear store state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    })

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clear localStorage
    localStorage.clear()
  })

  describe('login', () => {
    it('logs in successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
      }

      // Mock login response
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          access_token: 'test-token',
        },
      } as any)

      // Mock user data response
      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockUser,
      } as any)

      const { login } = useAuthStore.getState()

      await login({
        username: 'testuser',
        password: 'password123',
      })

      const state = useAuthStore.getState()

      expect(state.isAuthenticated).toBe(true)
      expect(state.token).toBe('test-token')
      expect(state.user).toEqual(mockUser)
      expect(state.isLoading).toBe(false)
    })

    it('handles login error', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Invalid credentials'))

      const { login } = useAuthStore.getState()

      await expect(
        login({
          username: 'testuser',
          password: 'wrong',
        })
      ).rejects.toThrow()

      const state = useAuthStore.getState()

      expect(state.isAuthenticated).toBe(false)
      expect(state.token).toBe(null)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('register', () => {
    it('registers and auto-logins successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'newuser@example.com',
        username: 'newuser',
        full_name: 'New User',
      }

      // Mock register response
      vi.mocked(api.post).mockResolvedValueOnce({
        data: mockUser,
      } as any)

      // Mock login response (auto-login after register)
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          access_token: 'new-token',
        },
      } as any)

      // Mock user data response
      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockUser,
      } as any)

      const { register } = useAuthStore.getState()

      await register({
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        full_name: 'New User',
      })

      const state = useAuthStore.getState()

      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(mockUser)
    })
  })

  describe('logout', () => {
    it('clears user state and calls logout endpoint', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: { id: 1 } as any,
        token: 'test-token',
        isAuthenticated: true,
      })

      vi.mocked(api.post).mockResolvedValueOnce({
        data: { message: 'Logged out' },
      } as any)

      const { logout } = useAuthStore.getState()

      await logout()

      const state = useAuthStore.getState()

      expect(state.isAuthenticated).toBe(false)
      expect(state.token).toBe(null)
      expect(state.user).toBe(null)
      expect(api.post).toHaveBeenCalledWith('/api/auth/logout')
    })

    it('clears state even if logout request fails', async () => {
      useAuthStore.setState({
        user: { id: 1 } as any,
        token: 'test-token',
        isAuthenticated: true,
      })

      vi.mocked(api.post).mockRejectedValueOnce(new Error('Network error'))

      const { logout } = useAuthStore.getState()

      await logout()

      const state = useAuthStore.getState()

      expect(state.isAuthenticated).toBe(false)
      expect(state.token).toBe(null)
      expect(state.user).toBe(null)
    })
  })

  describe('fetchUser', () => {
    it('fetches user data when token exists', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
      }

      useAuthStore.setState({
        token: 'test-token',
      })

      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockUser,
      } as any)

      const { fetchUser } = useAuthStore.getState()

      await fetchUser()

      const state = useAuthStore.getState()

      expect(state.user).toEqual(mockUser)
      expect(api.get).toHaveBeenCalledWith('/api/auth/me')
    })

    it('does nothing when no token exists', async () => {
      useAuthStore.setState({
        token: null,
      })

      const { fetchUser } = useAuthStore.getState()

      await fetchUser()

      expect(api.get).not.toHaveBeenCalled()
    })

    it('logs out on fetch error', async () => {
      useAuthStore.setState({
        token: 'test-token',
        user: { id: 1 } as any,
        isAuthenticated: true,
      })

      vi.mocked(api.get).mockRejectedValueOnce(new Error('Unauthorized'))

      const { fetchUser } = useAuthStore.getState()

      await expect(fetchUser()).rejects.toThrow()

      const state = useAuthStore.getState()

      expect(state.isAuthenticated).toBe(false)
      expect(state.token).toBe(null)
    })
  })

  describe('updateUser', () => {
    it('updates user data', async () => {
      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Updated Name',
      }

      vi.mocked(api.put).mockResolvedValueOnce({
        data: updatedUser,
      } as any)

      const { updateUser } = useAuthStore.getState()

      await updateUser({ full_name: 'Updated Name' })

      const state = useAuthStore.getState()

      expect(state.user).toEqual(updatedUser)
      expect(state.isLoading).toBe(false)
      expect(api.put).toHaveBeenCalledWith('/api/auth/me', { full_name: 'Updated Name' })
    })
  })
})
