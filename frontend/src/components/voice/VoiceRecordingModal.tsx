import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { 
  XMarkIcon, 
  MicrophoneIcon, 
  StopIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { voiceService } from '@/services/voiceService'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface VoiceRecordingModalProps {
  isOpen: boolean
  onClose: () => void
  onSendTranscription: (text: string) => void
  sessionId?: number
}

export default function VoiceRecordingModal({
  isOpen,
  onClose,
  onSendTranscription,
  sessionId
}: VoiceRecordingModalProps) {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcription, setTranscription] = useState('')
  
  const audioRef = useState<HTMLAudioElement | null>(null)[0]

  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording
  } = useVoiceRecorder({
    onRecordingComplete: (blob) => {
      setAudioBlob(blob)
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
    }
  })

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const handleReset = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setTranscription('')
    setIsPlaying(false)
    if (audioRef) {
      audioRef.pause()
    }
  }

  const handlePlayPause = () => {
    if (!audioRef || !audioUrl) return

    if (isPlaying) {
      audioRef.pause()
    } else {
      audioRef.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTranscribe = async () => {
    if (!audioBlob) return

    setIsProcessing(true)
    try {
      const result = await voiceService.transcribeAudio(audioBlob, {
        sessionId,
        language: 'en' // TODO: Make this configurable
      })
      
      setTranscription(result.transcription)
      toast.success(`Transcribed in ${result.duration.toFixed(1)}s`)
    } catch (error) {
      toast.error('Failed to transcribe audio')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSendTranscription = () => {
    if (transcription.trim()) {
      onSendTranscription(transcription)
      onClose()
      handleReset()
    }
  }

  const handleProcessAndSend = async () => {
    if (!audioBlob) return

    setIsProcessing(true)
    try {
      const result = await voiceService.processVoiceMessage(audioBlob, {
        sessionId,
        language: 'en',
        autoRespond: true
      })
      
      toast.success('Voice message processed')
      onClose()
      handleReset()
      
      // Reload messages will happen automatically through the chat store
    } catch (error) {
      toast.error('Failed to process voice message')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 sm:mx-0 sm:h-10 sm:w-10">
                    <MicrophoneIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                      Voice Recording
                    </Dialog.Title>
                    
                    <div className="mt-4">
                      {/* Recording controls */}
                      <div className="flex flex-col items-center space-y-4">
                        {/* Recording button */}
                        {!audioBlob && (
                          <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={clsx(
                              'relative p-8 rounded-full transition-all',
                              isRecording 
                                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                                : 'bg-primary-600 hover:bg-primary-700'
                            )}
                          >
                            {isRecording ? (
                              <StopIcon className="h-12 w-12 text-white" />
                            ) : (
                              <MicrophoneIcon className="h-12 w-12 text-white" />
                            )}
                            
                            {isRecording && (
                              <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping" />
                            )}
                          </button>
                        )}

                        {/* Recording time */}
                        {isRecording && (
                          <div className="text-2xl font-mono text-gray-900 dark:text-white">
                            {formatTime(recordingTime)}
                          </div>
                        )}

                        {/* Audio preview */}
                        {audioUrl && (
                          <div className="w-full space-y-4">
                            <audio
                              ref={(el) => audioRef[0] = el}
                              src={audioUrl}
                              className="w-full"
                              onEnded={() => setIsPlaying(false)}
                            />
                            
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={handlePlayPause}
                                className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                              >
                                {isPlaying ? (
                                  <PauseIcon className="h-5 w-5" />
                                ) : (
                                  <PlayIcon className="h-5 w-5" />
                                )}
                              </button>
                              
                              <button
                                onClick={handleReset}
                                className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-red-600"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Transcription */}
                        {transcription && (
                          <div className="w-full mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Transcription
                            </label>
                            <textarea
                              value={transcription}
                              onChange={(e) => setTranscription(e.target.value)}
                              rows={4}
                              className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  {audioBlob && !transcription && (
                    <>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleProcessAndSend}
                        className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 sm:ml-3 sm:w-auto"
                      >
                        {isProcessing ? 'Processing...' : 'Send Voice Message'}
                      </button>
                      
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleTranscribe}
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 sm:mt-0 sm:w-auto"
                      >
                        {isProcessing ? 'Transcribing...' : 'Transcribe First'}
                      </button>
                    </>
                  )}

                  {transcription && (
                    <button
                      type="button"
                      onClick={handleSendTranscription}
                      className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 sm:ml-3 sm:w-auto"
                    >
                      <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                      Send as Text
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}