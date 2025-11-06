import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import ChatInput from '../chat/ChatInput'

describe('ChatInput', () => {
  it('renders input textarea', () => {
    const mockSend = vi.fn()
    render(<ChatInput onSendMessage={mockSend} />)

    const textarea = screen.getByPlaceholderText(/type your message/i)
    expect(textarea).toBeInTheDocument()
  })

  it('sends message on button click', async () => {
    const mockSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSendMessage={mockSend} />)

    const textarea = screen.getByPlaceholderText(/type your message/i)
    const sendButton = screen.getByTitle(/send message/i)

    await user.type(textarea, 'Hello AI')
    await user.click(sendButton)

    expect(mockSend).toHaveBeenCalledWith('Hello AI')
    expect(textarea).toHaveValue('')  // Should clear after sending
  })

  it('sends message on Enter key', async () => {
    const mockSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSendMessage={mockSend} />)

    const textarea = screen.getByPlaceholderText(/type your message/i)

    await user.type(textarea, 'Hello AI{Enter}')

    expect(mockSend).toHaveBeenCalledWith('Hello AI')
  })

  it('does not send on Shift+Enter (new line)', async () => {
    const mockSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSendMessage={mockSend} />)

    const textarea = screen.getByPlaceholderText(/type your message/i)

    await user.type(textarea, 'Line 1{Shift>}{Enter}Line 2')

    expect(mockSend).not.toHaveBeenCalled()
    expect(textarea).toHaveValue('Line 1\nLine 2')
  })

  it('does not send empty message', async () => {
    const mockSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSendMessage={mockSend} />)

    const sendButton = screen.getByTitle(/send message/i)

    await user.click(sendButton)

    expect(mockSend).not.toHaveBeenCalled()
  })

  it('disables input and button when isDisabled is true', () => {
    const mockSend = vi.fn()
    render(<ChatInput onSendMessage={mockSend} isDisabled={true} />)

    const textarea = screen.getByPlaceholderText(/type your message/i)
    const sendButton = screen.getByTitle(/send message/i)

    expect(textarea).toBeDisabled()
    expect(sendButton).toBeDisabled()
  })

  it('shows character count', async () => {
    const mockSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSendMessage={mockSend} />)

    const textarea = screen.getByPlaceholderText(/type your message/i)

    await user.type(textarea, 'Test message')

    expect(screen.getByText(/12\/4000/)).toBeInTheDocument()
  })

  it('highlights character count when over limit', async () => {
    const mockSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSendMessage={mockSend} />)

    const textarea = screen.getByPlaceholderText(/type your message/i)

    // Type more than 4000 characters
    const longMessage = 'a'.repeat(4001)
    await user.type(textarea, longMessage)

    const charCount = screen.getByText(/4001\/4000/)
    expect(charCount).toHaveClass('text-red-500')
  })

  it('shows voice button when onVoiceRecord is provided', () => {
    const mockSend = vi.fn()
    const mockVoice = vi.fn()
    render(<ChatInput onSendMessage={mockSend} onVoiceRecord={mockVoice} />)

    const voiceButton = screen.getByTitle(/voice recording/i)
    expect(voiceButton).toBeInTheDocument()
  })

  it('calls onVoiceRecord when voice button is clicked', async () => {
    const mockSend = vi.fn()
    const mockVoice = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSendMessage={mockSend} onVoiceRecord={mockVoice} />)

    const voiceButton = screen.getByTitle(/voice recording/i)
    await user.click(voiceButton)

    expect(mockVoice).toHaveBeenCalled()
  })

  it('changes voice button appearance when recording', () => {
    const mockSend = vi.fn()
    const mockVoice = vi.fn()
    render(
      <ChatInput
        onSendMessage={mockSend}
        onVoiceRecord={mockVoice}
        isRecording={true}
      />
    )

    const voiceButton = screen.getByTitle(/stop recording/i)
    expect(voiceButton).toHaveClass('bg-red-600')
  })
})
