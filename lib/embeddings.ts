const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-3'
export const EMBED_DIMENSIONS = 1024

const CHUNK_SIZE = 1500   // ~300 mots par chunk
const CHUNK_OVERLAP = 150 // chevauchement pour ne pas couper le contexte

/** Découpe un texte long en chunks avec chevauchement */
export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= CHUNK_SIZE) return [cleaned]

  const chunks: string[] = []
  let start = 0
  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length)
    const chunk = cleaned.slice(start, end).trim()
    if (chunk.length > 80) chunks.push(chunk)
    if (end === cleaned.length) break
    start = end - CHUNK_OVERLAP
  }
  return chunks
}

/** Génère les embeddings via Voyage AI (batch) */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) throw new Error('VOYAGE_API_KEY manquant')

  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: VOYAGE_MODEL, input: texts }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voyage AI error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.data
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
    .map((d: { embedding: number[] }) => d.embedding)
}

/** Embed + store tous les chunks d'une source dans Supabase */
export async function embedAndStoreSource(
  supabase: Awaited<ReturnType<typeof import('./supabase-server').createServerSupabase>>,
  sourceId: string,
  projetId: string,
  userId: string,
  text: string
): Promise<number> {
  const chunks = chunkText(text)
  if (chunks.length === 0) return 0

  // Supprimer les anciens chunks de cette source
  await supabase.from('source_chunks').delete().eq('source_id', sourceId)

  // Embedder par lots de 8
  const BATCH = 8
  const allEmbeddings: number[][] = []
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    const embeddings = await embedTexts(batch)
    allEmbeddings.push(...embeddings)
  }

  // Insérer en base
  const rows = chunks.map((content, i) => ({
    source_id: sourceId,
    projet_id: projetId,
    user_id: userId,
    content,
    embedding: JSON.stringify(allEmbeddings[i]),
    chunk_index: i,
  }))

  await supabase.from('source_chunks').insert(rows)
  return chunks.length
}
