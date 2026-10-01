import type { EasyInputMessage, ResponseInputMessageContentList } from 'openai/resources/responses/responses'
import type { ReasoningEffort } from 'openai/resources/shared'
import { findRegion } from '../shared/regions.js'
import type { Answer, AskRequest, AskResponse, ChatTurn } from '../shared/types.js'
import { checkAccess, errorResponse, getOpenAI, json, toErrorResponse } from '../server/http.js'
import { nationalGuide, regionGuide } from '../server/knowledge.js'
import { ANSWER_SCHEMA, buildInstructions } from '../server/prompt.js'

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini'
const REASONING_EFFORT = (process.env.OPENAI_REASONING_EFFORT || 'low') as ReasoningEffort
const MAX_TURNS = 16
const MAX_IMAGE_CHARS = 3_000_000 // base64 약 2.2MB

export async function POST(request: Request): Promise<Response> {
  const denied = checkAccess(request)
  if (denied) return denied

  let body: AskRequest
  try {
    body = (await request.json()) as AskRequest
  } catch {
    return errorResponse('요청 형식이 올바르지 않아요.', 400)
  }

  const region = findRegion(body.regionId)
  if (!region) return errorResponse('알 수 없는 지역이에요.', 400)

  const turns = Array.isArray(body.turns) ? body.turns.slice(-MAX_TURNS) : []
  if (turns.length === 0 || turns[turns.length - 1].role !== 'user') {
    return errorResponse('질문이 비어 있어요.', 400)
  }
  for (const t of turns) {
    if (t.image && (!t.image.startsWith('data:image/') || t.image.length > MAX_IMAGE_CHARS)) {
      return errorResponse('사진 형식이나 크기가 올바르지 않아요.', 400)
    }
  }

  try {
    const regionDoc = regionGuide(region.id)
    const response = await getOpenAI().responses.create({
      model: MODEL,
      instructions: buildInstructions(nationalGuide(), region, regionDoc),
      input: turns.map(toInputMessage),
      text: {
        format: { type: 'json_schema', name: 'disposal_answer', schema: ANSWER_SCHEMA, strict: true },
      },
      reasoning: REASONING_EFFORT ? { effort: REASONING_EFFORT } : undefined,
      store: false,
    })

    if (response.status === 'incomplete' || !response.output_text) {
      return errorResponse('답변을 끝까지 만들지 못했어요. 다시 시도해 주세요.', 502)
    }

    const answer = JSON.parse(response.output_text) as Answer
    return json({ answer, regionHasData: regionDoc !== null } satisfies AskResponse)
  } catch (err) {
    return toErrorResponse(err)
  }
}

function toInputMessage(turn: ChatTurn): EasyInputMessage {
  if (turn.role === 'assistant') {
    return { role: 'assistant', content: turn.text }
  }
  const regionName = turn.regionId ? findRegion(turn.regionId)?.name : undefined
  const text = `${regionName ? `[선택 지역: ${regionName}] ` : ''}${turn.text || '(사진만 보냈어요) 이건 어떻게 버려요?'}`
  const content: ResponseInputMessageContentList = [{ type: 'input_text', text }]
  if (turn.image) content.push({ type: 'input_image', image_url: turn.image, detail: 'auto' })
  return { role: 'user', content }
}
