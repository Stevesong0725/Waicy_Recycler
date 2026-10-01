import type { Region } from '../shared/regions.js'

const RULES = `너는 한국의 생활폐기물 분리배출을 알려주는 도우미야. 사용자는 사진, 말, 글로 버릴 물건을 알려줘.

## 답하는 방법
1. 물건을 파악한 뒤, 재질이 다른 부위가 있으면 부위별로 나눠서 안내해. (예: 린스통 → 용기 / 펌프, 우산 → 비닐·천 / 살 / 손잡이)
2. 배출 방법은 [전국 기준] 자료를 근거로 해. 자료에 없는 품목은 4대 원칙(비우기·헹구기·분리하기·섞지 않기)으로 판단하고 needsCheck를 true로 해.
3. 배출 요일·시간·장소, 종량제 봉투, 대형폐기물 신고 방법, 수거함 위치 같은 지역 정보는 [지역 기준] 자료에 적힌 내용만 말해.
   자료에 없거나 "미확인"이면 절대 지어내지 말고, regionNotes에 해당 구청 누리집이나 120다산콜센터(서울)에서 확인하라고 안내해.
4. 사진이 흐리거나 물건을 특정할 수 없으면 추측하지 말고 kind를 "clarify"로 해서 summary에 되물어봐. (예: "뚜껑이 플라스틱인가요, 금속인가요?")
5. 분리배출과 상관없는 말이면 kind를 "chat"으로 하고 summary에 짧게 답한 뒤 분리배출 질문으로 안내해.
6. 사용자의 메시지 앞의 [선택 지역: ○○] 은 그 질문을 할 때 선택돼 있던 지역이야. 지역이 바뀌었으면 가장 최근 지역 기준으로 답해.

## 출력 규칙
- 초등학생도 이해할 수 있는 쉬운 해요체로, 짧고 구체적으로 써.
- summary: 한두 문장 핵심 요약 (kind가 clarify/chat이면 그 질문이나 답).
- parts[].bin: "플라스틱", "일반쓰레기(종량제 봉투)"처럼 실제 버리는 곳.
- sources: 실제로 근거로 쓴 자료 제목만 (예: "전국 분리배출 가이드라인", "강남구 생활폐기물 배출 안내").
- kind가 guide가 아니면 parts, regionNotes, cautions, sources는 빈 배열로 둬.`

/** 전국 기준을 앞에 두어 지역이 바뀌어도 앞부분 프롬프트 캐시가 재사용되도록 함 */
export function buildInstructions(national: string, region: Region, regionDoc: string | null): string {
  const regionSection = regionDoc
    ? `# [지역 기준: ${region.name}]\n${regionDoc}`
    : `# [지역 기준: ${region.name}]\n이 지역의 자료는 아직 준비되지 않았어. 지역 정보는 해당 구청에서 확인하라고 안내해.`

  return `${RULES}\n\n# [전국 기준]\n${national}\n\n${regionSection}`
}

export const ANSWER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'item', 'summary', 'parts', 'regionNotes', 'cautions', 'sources', 'needsCheck'],
  properties: {
    kind: { type: 'string', enum: ['guide', 'clarify', 'chat'] },
    item: { type: ['string', 'null'], description: '파악한 물건 이름' },
    summary: { type: 'string' },
    parts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'material', 'bin', 'steps'],
        properties: {
          name: { type: 'string' },
          material: { type: 'string' },
          bin: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    regionNotes: { type: 'array', items: { type: 'string' } },
    cautions: { type: 'array', items: { type: 'string' } },
    sources: { type: 'array', items: { type: 'string' } },
    needsCheck: { type: 'boolean' },
  },
} as const
