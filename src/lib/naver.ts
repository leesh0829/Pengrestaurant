let loaderPromise: Promise<void> | null = null

export function loadNaverMapScript(clientId: string) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('브라우저 환경에서만 네이버 지도를 로드할 수 있습니다.'))
  }

  if ((window as Window & { naver?: unknown }).naver) {
    return Promise.resolve()
  }

  if (loaderPromise) {
    return loaderPromise
  }

  loaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-naver-map]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('네이버 지도 스크립트를 불러오지 못했습니다.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`
    script.async = true
    script.defer = true
    script.dataset.naverMap = 'true'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error('네이버 지도 스크립트를 불러오지 못했습니다.')),
      { once: true },
    )
    document.head.appendChild(script)
  })

  return loaderPromise
}
