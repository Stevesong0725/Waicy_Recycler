import type { ApiError, AskRequest, AskResponse, TranscribeResponse } from '../../shared/types'
import { load } from './storage'

export const ACCESS_CODE_KEY = 'accessCode'

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers)
  const code = load(ACCESS_CODE_KEY)
  if (code) headers.set('x-access-code', code)

  let res: Response
  try {
    res = await fetch(path, { ...init, headers })
  } catch {
    throw new Error('인터넷 연결을 확인해 주세요.')
  }
  const data = (await res.json().catch(() => null)) as T | ApiError | null
  if (!res.ok || !data) {
    throw new Error((data as ApiError | null)?.error ?? `요청에 실패했어요. (${res.status})`)
  }
  return data as T
}

export function ask(body: AskRequest): Promise<AskResponse> {
  return request('/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function transcribe(audio: Blob): Promise<string> {
  const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm'
  const form = new FormData()
  form.append('audio', audio, `speech.${ext}`)
  const { text } = await request<TranscribeResponse>('/api/transcribe', { method: 'POST', body: form })
  return text
}
