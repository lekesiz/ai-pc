import { useState, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'

interface UseVoiceRecorderOptions {
  onRecordingComplete: (audioBlob: Blob) => void
  maxDuration?: number // in seconds
}

export function useVoiceRecorder({ 
  onRecordingComplete, 
  maxDuration = 60 
}: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecordingComplete(audioBlob)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        
        setRecordingTime(0)
      }

      mediaRecorder.start()
      setIsRecording(true)

      // Start timer
      let seconds = 0
      timerRef.current = setInterval(() => {
        seconds++
        setRecordingTime(seconds)
        
        // Auto-stop at max duration
        if (seconds >= maxDuration) {
          stopRecording()
          toast.error(`Recording stopped at ${maxDuration} seconds limit`)
        }
      }, 1000)

    } catch (error) {
      console.error('Error accessing microphone:', error)
      toast.error('Could not access microphone')
    }
  }, [onRecordingComplete, maxDuration])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    toggleRecording
  }
}