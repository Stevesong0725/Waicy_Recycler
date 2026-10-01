import OpenAI from 'openai'

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

export function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status)
}

/**
 * APP_ACCESS_CODE 가 설정돼 있으면 같은 코드를 보낸 요청만 허용.
 * 배포 URL이 알려져도 남이 내 API 키로 요금을 쓰지 못하게 막는 용도.
 */
export function checkAccess(request: Request): Response | null {
  const code = process.env.APP_ACCESS_CODE
  if (code && request.headers.get('x-access-code') !== code) {
    return errorResponse('접근 코드가 올바르지 않아요. 설정에서 접근 코드를 입력해 주세요.', 401)
  }
  return null
}

let client: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new MissingKeyError()
  }
  client ??= new OpenAI()
  return client
}

export class MissingKeyError extends Error {
  constructor() {
    super('OPENAI_API_KEY 가 설정되지 않았어요. .env.local (로컬) 또는 Vercel 환경변수에 추가해 주세요.')
  }
}

export function toErrorResponse(err: unknown): Response {
  if (err instanceof MissingKeyError) return errorResponse(err.message, 500)
  if (err instanceof OpenAI.RateLimitError) {
    return errorResponse('요청이 많아 잠시 후 다시 시도해 주세요.', 429)
  }
  if (err instanceof OpenAI.AuthenticationError) {
    return errorResponse('OpenAI API 키가 올바르지 않아요.', 500)
  }
  if (err instanceof OpenAI.APIError) {
    console.error('[openai]', err.status, err.message)
    return errorResponse('AI 서버 응답에 문제가 있어요. 잠시 후 다시 시도해 주세요.', 502)
  }
  console.error(err)
  return errorResponse('알 수 없는 오류가 발생했어요.', 500)
}
