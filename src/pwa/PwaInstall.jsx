import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const HEAD_TAGS = [
  { selector: 'link[rel="manifest"]', tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' } },
  { selector: 'link[rel="apple-touch-icon"]', tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' } },
  { selector: 'meta[name="apple-mobile-web-app-title"]', tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'AndesMarket' } },
  { selector: 'meta[name="apple-mobile-web-app-capable"]', tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' } },
  {
    selector: 'meta[name="apple-mobile-web-app-status-bar-style"]',
    tag: 'meta',
    attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
  },
]

export default function PwaInstall() {
  useRegisterSW({ immediate: true })

  useEffect(() => {
    for (const { selector, tag, attrs } of HEAD_TAGS) {
      if (document.head.querySelector(selector)) continue
      const el = document.createElement(tag)
      for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
      document.head.appendChild(el)
    }
  }, [])

  return null
}
