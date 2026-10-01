import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribe } from '../lib/api'

/**
 * 음성 입력
 * 1순위: 브라우저 내장 음성 인식 (안드로이드 크롬, 아이폰 사파리) — 무료, 실시간
 * 2순위: 녹음 → 서버(OpenAI)에서 받아쓰기 — 브라우저 인식이 막힌 환경(아이폰 홈 화면 앱 등)용
 */

interface RecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => RecognitionLike

const Recognition: RecognitionCtor | undefined =
  (window as unknown as { SpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition

const canRecord = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
const MAX_RECORD_MS = 15_000

type Mode = 'browser' | 'recorder' | 'none'
export type SpeechStatus = 'idle' | 'listening' | 'transcribing'

export function useSpeech(onFinal: (text: string) => void) {
  const [mode, setMode] = useState<Mode>(Recognition ? 'browser' : canRecord ? 'recorder' : 'none')
  const [status, setStatus] = useState<SpeechStatus>('idle')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<RecognitionLike | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  const startBrowser = useCallback(() => {
    const rec = new Recognition!()
    rec.lang = 'ko-KR'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''

    rec.onresult = (e) => {
      let text = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        if (result.isFinal) finalText += result[0].transcript
        else text += result[0].transcript
      }
      setInterim(finalText + text)
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setError('마이크 권한을 허용해 주세요.')
      } else if (e.error === 'service-not-allowed' || e.error === 'network' || e.error === 'language-not-supported') {
        // 이 환경에서는 브라우저 인식이 안 됨 → 녹음 방식으로 전환
        if (canRecord) {
          setMode('recorder')
          setError('이 기기에서는 녹음 방식으로 바꿨어요. 마이크를 다시 눌러 주세요.')
        } else {
          setMode('none')
          setError('이 기기에서는 음성 입력을 쓸 수 없어요.')
        }
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setError('음성 인식 중 문제가 생겼어요.')
      }
    }
    rec.onend = () => {
      recognitionRef.current = null
      setStatus('idle')
      setInterim('')
      if (finalText.trim()) onFinalRef.current(finalText.trim())
    }

    recognitionRef.current = rec
    rec.start()
    setStatus('listening')
  }, [])

  const startRecorder = useCallback(async () => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('마이크 권한을 허용해 주세요.')
      return
    }
    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []
    const timer = setTimeout(() => recorder.state === 'recording' && recorder.stop(), MAX_RECORD_MS)

    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    recorder.onstop = async () => {
      clearTimeout(timer)
      stream.getTracks().forEach((t) => t.stop())
      recorderRef.current = null
      const blob = new Blob(chunks, { type: recorder.mimeType })
      if (blob.size === 0) return setStatus('idle')
      setStatus('transcribing')
      try {
        const text = await transcribe(blob)
        if (text) onFinalRef.current(text)
      } catch (err) {
        setError(err instanceof Error ? err.message : '받아쓰기에 실패했어요.')
      } finally {
        setStatus('idle')
      }
    }

    recorderRef.current = recorder
    recorder.start()
    setStatus('listening')
  }, [])

  /** 마이크 버튼: 듣는 중이면 멈추고, 아니면 시작 */
  const toggle = useCallback(() => {
    setError(null)
    if (status === 'listening') {
      recognitionRef.current?.stop()
      recorderRef.current?.stop()
      return
    }
    if (status !== 'idle') return
    if (mode === 'browser') startBrowser()
    else if (mode === 'recorder') void startRecorder()
  }, [mode, status, startBrowser, startRecorder])

  useEffect(
    () => () => {
      recognitionRef.current?.abort()
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    },
    [],
  )

  return { supported: mode !== 'none', status, interim, error, toggle }
}
