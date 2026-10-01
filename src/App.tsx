import { useEffect, useRef, useState } from 'react'
import { NATIONAL_ID, REGIONS, findRegion } from '../shared/regions'
import type { Answer, ChatTurn } from '../shared/types'
import { AnswerCard } from './components/AnswerCard'
import { Composer } from './components/Composer'
import { ACCESS_CODE_KEY, ask } from './lib/api'
import { load, save } from './lib/storage'

type ChatItem =
  | { type: 'user'; id: number; text: string; image?: string; regionId: string }
  | { type: 'bot'; id: number; answer: Answer; regionId: string; regionHasData: boolean }
  | { type: 'notice'; id: number; text: string; retry?: { text: string; image?: string } }
  | { type: 'error'; id: number; text: string }

const REGION_KEY = 'regionId'
const EXAMPLES = ['린스통 어떻게 버려요?', '아이스팩은요?', '깨진 유리컵', '치킨 뼈는 음식물인가요?']
// 오래된 사진은 다시 보내지 않아 요청 크기·비용을 줄임
const IMAGES_TO_KEEP = 2

let nextId = 1

/** 마지막 글자에 받침이 있는지 (으로/로 선택용). ㄹ 받침은 '로'를 쓰므로 제외 */
function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return false
  const jong = code % 28
  return jong !== 0 && jong !== 8
}

function toTurns(items: ChatItem[]): ChatTurn[] {
  let imagesLeft = IMAGES_TO_KEEP
  const turns: ChatTurn[] = []
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    if (item.type === 'user') {
      const keepImage = item.image && imagesLeft-- > 0
      turns.unshift({
        role: 'user',
        text: item.image && !keepImage ? `${item.text} (이전에 보낸 사진)` : item.text,
        image: keepImage ? item.image : undefined,
        regionId: item.regionId,
      })
    } else if (item.type === 'bot') {
      turns.unshift({ role: 'assistant', text: JSON.stringify(item.answer) })
    }
  }
  return turns
}

export default function App() {
  const [regionId, setRegionId] = useState(() => {
    const saved = load(REGION_KEY)
    return saved && findRegion(saved) ? saved : NATIONAL_ID
  })
  const [items, setItems] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [accessCode, setAccessCode] = useState(() => load(ACCESS_CODE_KEY) ?? '')
  const bottomRef = useRef<HTMLDivElement>(null)

  const region = findRegion(regionId)!

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items, loading])

  function changeRegion(id: string) {
    const next = findRegion(id)
    if (!next || id === regionId) return
    setRegionId(id)
    save(REGION_KEY, id)

    // 대화 중에 바꿨다면 안내 + 직전 질문을 새 지역 기준으로 다시 물어볼 수 있게
    const lastUser = [...items].reverse().find((i) => i.type === 'user')
    if (lastUser) {
      setItems((prev) => [
        ...prev,
        {
          type: 'notice',
          id: nextId++,
          text: `📍 지역을 ${next.name}${hasBatchim(next.name) ? '으로' : '로'} 바꿨어요. 이제부터 ${next.name} 기준으로 안내해요.`,
          retry: { text: lastUser.text, image: lastUser.image },
        },
      ])
    }
  }

  async function send(text: string, image?: string) {
    const userItem: ChatItem = { type: 'user', id: nextId++, text, image, regionId }
    const history = [...items, userItem]
    setItems(history)
    setLoading(true)
    try {
      const { answer, regionHasData } = await ask({ regionId, turns: toTurns(history) })
      setItems((prev) => [...prev, { type: 'bot', id: nextId++, answer, regionId, regionHasData }])
    } catch (err) {
      const text = err instanceof Error ? err.message : '문제가 생겼어요.'
      setItems((prev) => [...prev, { type: 'error', id: nextId++, text }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>♻️ 분리수거 AI</h1>
        <label className="region-chip">
          <span aria-hidden>📍</span>
          <select value={regionId} onChange={(e) => changeRegion(e.target.value)} aria-label="지역 선택">
            <option value={NATIONAL_ID}>전국 공통</option>
            <optgroup label="서울특별시">
              {REGIONS.filter((r) => r.id !== NATIONAL_ID).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </optgroup>
          </select>
        </label>
        <button className="icon-btn" onClick={() => setShowSettings((v) => !v)} aria-label="설정">⚙️</button>
      </header>

      {showSettings && (
        <div className="settings">
          <label>
            접근 코드
            <input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="서버에 APP_ACCESS_CODE를 설정했다면 입력"
            />
          </label>
          <button
            className="btn"
            onClick={() => {
              save(ACCESS_CODE_KEY, accessCode.trim())
              setShowSettings(false)
            }}
          >
            저장
          </button>
        </div>
      )}

      <main className="chat">
        {items.length === 0 && (
          <div className="welcome">
            <p className="welcome__title">무엇을 버리시나요?</p>
            <p className="welcome__desc">
              사진을 찍거나 🎤 로 말해 보세요.
              <br />
              <strong>{region.name}</strong> 기준으로 부위별 배출 방법을 알려드려요.
            </p>
            <div className="examples">
              {EXAMPLES.map((ex) => (
                <button key={ex} className="example" onClick={() => send(ex)} disabled={loading}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {items.map((item) => {
          switch (item.type) {
            case 'user':
              return (
                <div key={item.id} className="bubble bubble--user">
                  {item.image && <img src={item.image} alt="보낸 사진" />}
                  {item.text && <span>{item.text}</span>}
                </div>
              )
            case 'bot': {
              const r = findRegion(item.regionId)!
              return (
                <AnswerCard
                  key={item.id}
                  answer={item.answer}
                  regionName={r.name}
                  regionHasData={item.regionHasData}
                  isNational={r.id === NATIONAL_ID}
                />
              )
            }
            case 'notice':
              return (
                <div key={item.id} className="notice">
                  <span>{item.text}</span>
                  {item.retry && (
                    <button className="btn btn--small" disabled={loading} onClick={() => send(item.retry!.text, item.retry!.image)}>
                      직전 질문 다시 물어보기
                    </button>
                  )}
                </div>
              )
            case 'error':
              return <div key={item.id} className="bubble bubble--error">{item.text}</div>
          }
        })}

        {loading && <div className="bubble bubble--bot typing">자료를 찾아보는 중…</div>}
        <div ref={bottomRef} />
      </main>

      <Composer disabled={loading} onSend={send} />
    </div>
  )
}
