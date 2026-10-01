import type { Answer } from '../../shared/types'

interface Props {
  answer: Answer
  regionName: string
  regionHasData: boolean
  isNational: boolean
}

function speak(answer: Answer) {
  if (!('speechSynthesis' in window)) return
  const lines = [
    answer.summary,
    ...answer.parts.map((p) => `${p.name}은 ${p.bin}. ${p.steps.join('. ')}`),
    ...answer.regionNotes,
    ...answer.cautions,
  ]
  speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(lines.join('. '))
  utter.lang = 'ko-KR'
  speechSynthesis.speak(utter)
}

export function AnswerCard({ answer, regionName, regionHasData, isNational }: Props) {
  if (answer.kind !== 'guide') {
    return <div className="bubble bubble--bot">{answer.summary}</div>
  }

  return (
    <article className="answer">
      <header className="answer__head">
        <h3>{answer.item ?? '분리배출 안내'}</h3>
        <button className="icon-btn" onClick={() => speak(answer)} aria-label="읽어주기">🔊</button>
      </header>
      <p className="answer__summary">{answer.summary}</p>

      {answer.parts.map((part) => (
        <section className="part" key={part.name}>
          <div className="part__head">
            <strong>{part.name}</strong>
            <span className="part__bin">{part.bin}</span>
          </div>
          <p className="part__material">{part.material}</p>
          <ol>
            {part.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </section>
      ))}

      {answer.regionNotes.length > 0 && (
        <section className="answer__block">
          <h4>📍 {regionName} 안내</h4>
          <ul>{answer.regionNotes.map((n) => <li key={n}>{n}</li>)}</ul>
        </section>
      )}
      {!isNational && !regionHasData && (
        <p className="answer__hint">{regionName} 자료가 아직 준비되지 않아 전국 기준으로 안내했어요.</p>
      )}

      {answer.cautions.length > 0 && (
        <section className="answer__block">
          <h4>⚠️ 주의</h4>
          <ul>{answer.cautions.map((c) => <li key={c}>{c}</li>)}</ul>
        </section>
      )}

      {answer.needsCheck && (
        <p className="answer__check">자료에 없는 품목이라 정확하지 않을 수 있어요. 구청에 한 번 확인해 보세요.</p>
      )}
      {answer.sources.length > 0 && <p className="answer__sources">출처: {answer.sources.join(' · ')}</p>}
    </article>
  )
}
