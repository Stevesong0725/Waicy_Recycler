export interface Region {
  id: string
  name: string
}

export const NATIONAL_ID = 'national'

/** 선택 가능한 지역. 자료는 knowledge/regions/<id>.md 에 넣으면 자동으로 쓰입니다. */
export const REGIONS: Region[] = [
  { id: NATIONAL_ID, name: '전국 공통' },
  // 서울특별시 (가나다순)
  { id: 'gangnam', name: '강남구' },
  { id: 'gangdong', name: '강동구' },
  { id: 'gangbuk', name: '강북구' },
  { id: 'gangseo', name: '강서구' },
  { id: 'gwanak', name: '관악구' },
  { id: 'gwangjin', name: '광진구' },
  { id: 'guro', name: '구로구' },
  { id: 'geumcheon', name: '금천구' },
  { id: 'nowon', name: '노원구' },
  { id: 'dobong', name: '도봉구' },
  { id: 'dongdaemun', name: '동대문구' },
  { id: 'dongjak', name: '동작구' },
  { id: 'mapo', name: '마포구' },
  { id: 'seodaemun', name: '서대문구' },
  { id: 'seocho', name: '서초구' },
  { id: 'seongdong', name: '성동구' },
  { id: 'seongbuk', name: '성북구' },
  { id: 'songpa', name: '송파구' },
  { id: 'yangcheon', name: '양천구' },
  { id: 'yeongdeungpo', name: '영등포구' },
  { id: 'yongsan', name: '용산구' },
  { id: 'eunpyeong', name: '은평구' },
  { id: 'jongno', name: '종로구' },
  { id: 'jung', name: '중구' },
  { id: 'jungnang', name: '중랑구' },
]

export function findRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id)
}
