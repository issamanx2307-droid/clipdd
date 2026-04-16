import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

const SECRET = process.env.REVALIDATE_SECRET || 'clipdd-revalidate-2025'

export async function POST(request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const slug = searchParams.get('slug')

  if (secret !== SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  revalidatePath('/articles')
  if (slug) revalidatePath(`/articles/${slug}`)

  return NextResponse.json({ revalidated: true, slug: slug || 'all' })
}
