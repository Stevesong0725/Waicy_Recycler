import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NATIONAL_ID } from '../shared/regions.js'

// Vercel에서는 vercel.json 의 includeFiles 로 knowledge/ 폴더가 함께 배포됩니다.
const ROOT = join(process.cwd(), 'knowledge')

const cache = new Map<string, string | null>()

function readDoc(relPath: string): string | null {
  if (!cache.has(relPath)) {
    try {
      cache.set(relPath, readFileSync(join(ROOT, relPath), 'utf8'))
    } catch {
      cache.set(relPath, null)
    }
  }
  return cache.get(relPath) ?? null
}

export function nationalGuide(): string {
  const doc = readDoc('national.md')
  if (!doc) throw new Error('knowledge/national.md 를 찾을 수 없어요.')
  return doc
}

/** 지역 자료가 없거나 "전국 공통"이면 null */
export function regionGuide(regionId: string): string | null {
  if (regionId === NATIONAL_ID) return null
  return readDoc(join('regions', `${regionId}.md`))
}
