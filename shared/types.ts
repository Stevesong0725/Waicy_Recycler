// 클라이언트와 서버(api/)가 함께 쓰는 타입

export interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
  /** user 턴에만: 리사이즈된 JPEG data URL */
  image?: string
  /** user 턴에만: 질문할 당시 선택돼 있던 지역 */
  regionId?: string
}

export interface AskRequest {
  regionId: string
  turns: ChatTurn[]
}

export interface DisposalPart {
  name: string // 부위 (예: 펌프)
  material: string // 재질 (예: 플라스틱+금속 스프링)
  bin: string // 배출 위치 (예: 일반쓰레기)
  steps: string[]
}

export interface Answer {
  /** guide: 배출 안내 / clarify: 되묻기 / chat: 그 밖의 대화 */
  kind: 'guide' | 'clarify' | 'chat'
  item: string | null
  summary: string
  parts: DisposalPart[]
  regionNotes: string[]
  cautions: string[]
  sources: string[]
  needsCheck: boolean
}

export interface AskResponse {
  answer: Answer
  regionHasData: boolean
}

export interface TranscribeResponse {
  text: string
}

export interface ApiError {
  error: string
}
