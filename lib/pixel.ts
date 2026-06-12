export const PIXEL_ID = '1868643184092680'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function fbq(...args: any[]): void
}

export function pixelEvent(event: string, params?: Record<string, unknown>) {
  try {
    if (typeof fbq === 'function') fbq('track', event, params)
  } catch { /* pixel not loaded */ }
}
