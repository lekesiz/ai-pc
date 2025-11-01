import { api } from './api'

interface TranscriptionResponse {
  transcription: string
  duration: number
  language: string
  cost: number
  segments: any[]
}

interface VoiceProcessResponse {
  session_id: number
  transcription: {
    transcription: string
    duration: number
    language: string
  }
  ai_response?: {
    content: string
    model: string
    tokens: number
  }
  total_cost: number
}

export const voiceService = {
  /**
   * Transcribe audio file to text
   */
  async transcribeAudio(
    audioFile: Blob,
    options: {
      sessionId?: number
      language?: string
      prompt?: string
    } = {}
  ): Promise<TranscriptionResponse> {
    const formData = new FormData()
    formData.append('audio', audioFile, 'recording.webm')
    
    if (options.sessionId) {
      formData.append('session_id', options.sessionId.toString())
    }
    if (options.language) {
      formData.append('language', options.language)
    }
    if (options.prompt) {
      formData.append('prompt', options.prompt)
    }

    const { data } = await api.post('/api/voice/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return data
  },

  /**
   * Process voice message with optional AI response
   */
  async processVoiceMessage(
    audioFile: Blob,
    options: {
      sessionId?: number
      language?: string
      autoRespond?: boolean
    } = {}
  ): Promise<VoiceProcessResponse> {
    const formData = new FormData()
    formData.append('audio', audioFile, 'recording.webm')
    
    if (options.sessionId) {
      formData.append('session_id', options.sessionId.toString())
    }
    if (options.language) {
      formData.append('language', options.language)
    }
    formData.append('auto_respond', (options.autoRespond !== false).toString())

    const { data } = await api.post('/api/voice/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return data
  },

  /**
   * Convert blob to base64 for display/playback
   */
  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  },

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  },

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg']
  },

  /**
   * Check if browser supports media recording
   */
  isRecordingSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }
}