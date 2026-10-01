import type { TranscribeResponse } from '../shared/types.js'
import { checkAccess, errorResponse, getOpenAI, json, toErrorResponse } from '../server/http.js'

// 브라우저 음성 인식이 안 되는 환경(예: 아이폰 홈 화면 앱)용 대체 경로
const MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe'
const MAX_BYTES = 4 * 1024 * 1024

export async function POST(request: Request): Promise<Response> {
  const denied = checkAccess(request)
  if (denied) return denied

  let audio: FormDataEntryValue | null
  try {
    audio = (await request.formData()).get('audio')
  } catch {
    return errorResponse('요청 형식이 올바르지 않아요.', 400)
  }
  if (!(audio instanceof File) || audio.size === 0) return errorResponse('녹음 파일이 없어요.', 400)
  if (audio.size > MAX_BYTES) return errorResponse('녹음이 너무 길어요.', 413)

  try {
    const result = await getOpenAI().audio.transcriptions.create({
      file: audio,
      model: MODEL,
      language: 'ko',
    })
    return json({ text: result.text.trim() } satisfies TranscribeResponse)
  } catch (err) {
    return toErrorResponse(err)
  }
}
