// localStorage는 사생활 보호 모드 등에서 막힐 수 있어 항상 try/catch
export function load(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 저장 실패해도 앱 동작에는 지장 없음
  }
}
