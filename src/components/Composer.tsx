import { useRef, useState } from 'react'
import { useSpeech } from '../hooks/useSpeech'
import { resizeImage } from '../lib/image'

interface Props {
  disabled: boolean
  onSend: (text: string, image?: string) => void
}

export function Composer({ disabled, onSend }: Props) {
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | undefined>()
  const fileInput = useRef<HTMLInputElement>(null)

  function submit(value = text) {
    if (disabled || (!value.trim() && !image)) return
    onSend(value.trim(), image)
    setText('')
    setImage(undefined)
  }

  // 말하기가 끝나면 바로 전송 (사진을 붙여뒀다면 함께)
  const speech = useSpeech((spoken) => submit(spoken))

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setImage(await resizeImage(file))
  }

  const listening = speech.status === 'listening'
  const placeholder = listening
    ? speech.interim || '듣고 있어요…'
    : speech.status === 'transcribing'
      ? '받아쓰는 중…'
      : image
        ? '사진에 대해 덧붙일 말 (선택)'
        : '무엇을 버리시나요?'

  return (
    <div className="composer">
      {speech.error && <p className="composer__error">{speech.error}</p>}
      {image && (
        <div className="composer__preview">
          <img src={image} alt="첨부한 사진" />
          <button onClick={() => setImage(undefined)} aria-label="사진 빼기">✕</button>
        </div>
      )}
      <form
        className="composer__row"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <button type="button" className="icon-btn" onClick={() => fileInput.current?.click()} aria-label="사진 첨부">
          📷
        </button>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleFile} />
        <input
          className="composer__input"
          value={listening ? '' : text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={listening}
          enterKeyHint="send"
        />
        {speech.supported && (
          <button
            type="button"
            className={`icon-btn mic ${listening ? 'mic--on' : ''}`}
            onClick={speech.toggle}
            disabled={disabled || speech.status === 'transcribing'}
            aria-label={listening ? '말하기 끝내기' : '말로 질문하기'}
          >
            🎤
          </button>
        )}
        <button type="submit" className="send-btn" disabled={disabled || (!text.trim() && !image)} aria-label="보내기">
          ➤
        </button>
      </form>
    </div>
  )
}
