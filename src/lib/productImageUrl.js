const PUBLIC_OBJECT_PATH = '/storage/v1/object/public/'
const PUBLIC_RENDER_PATH = '/storage/v1/render/image/public/'

export function optimizedProductImageUrl(source, width) {
  if (!source || !Number.isFinite(width)) return source

  try {
    const url = new URL(source)
    if (!url.hostname.endsWith('.supabase.co') || !url.pathname.includes(PUBLIC_OBJECT_PATH)) return source

    url.pathname = url.pathname.replace(PUBLIC_OBJECT_PATH, PUBLIC_RENDER_PATH)
    url.search = ''
    url.searchParams.set('width', String(Math.round(width)))
    url.searchParams.set('quality', '75')
    url.searchParams.set('resize', 'contain')
    return url.toString()
  } catch {
    return source
  }
}
