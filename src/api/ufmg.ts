import { logger } from '../utils/logger'

export interface TeamProbabilities {
  champion: number | null
  libertadores: number | null
  sulamericana: number | null
  relegation: number | null
}

const ENDPOINTS = {
  champion: 'https://www.mat.ufmg.br/futebol/campeao_seriea/',
  libertadores: 'https://www.mat.ufmg.br/futebol/classificacao-para-libertadores_seriea/',
  sulamericana: 'https://www.mat.ufmg.br/futebol/classificacao-para-sulamericana_seriea/',
  relegation: 'https://www.mat.ufmg.br/futebol/rebaixamento_seriea/',
}

const HTML_ENTITIES: Record<string, string> = {
  Agrave:'À',agrave:'à',Aacute:'Á',aacute:'á',Acirc:'Â',acirc:'â',
  Atilde:'Ã',atilde:'ã',Auml:'Ä',auml:'ä',
  Egrave:'È',egrave:'è',Eacute:'É',eacute:'é',Ecirc:'Ê',ecirc:'ê',
  Euml:'Ë',euml:'ë',
  Iacute:'Í',iacute:'í',
  Oacute:'Ó',oacute:'ó',Ocirc:'Ô',ocirc:'ô',Otilde:'Õ',otilde:'õ',
  Uacute:'Ú',uacute:'ú',
  Ccedil:'Ç',ccedil:'ç',
  amp:'&',nbsp:' ',
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&([a-zA-Z]+);/g, (m, name) => HTML_ENTITIES[name] ?? m)
}

function normalize(s: string): string {
  return decodeEntities(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

function extractProbability(html: string, teamName: string): number | null {
  const target = normalize(teamName)
  const rows = html.split(/<tr[^>]*>/i)
  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gis)]
    if (cells.length < 3) continue
    const name = cells[1][1].replace(/<[^>]+>/g, '').trim()
    if (normalize(name).includes(target)) {
      const prob = parseFloat(cells[2][1].replace(/<[^>]+>/g, '').trim())
      if (!isNaN(prob)) return prob
    }
  }
  return null
}

// UFMG's server blocks GitHub Actions (Azure) IPs at the firewall level.
// When running in CI, route requests through a proxy via UFMG_PROXY env var.
// Default proxy for GitHub Actions: allorigins.win
const PROXY = process.env.UFMG_PROXY
  ?? (process.env.GITHUB_ACTIONS === 'true' ? 'https://api.allorigins.win/raw?url=' : '')

function proxyUrl(url: string): string {
  return PROXY ? `${PROXY}${encodeURIComponent(url)}` : url
}

export async function fetchTeamProbabilities(teamName: string): Promise<TeamProbabilities> {
  if (PROXY) logger.info({ proxy: PROXY }, 'Using proxy for UFMG requests')
  const entries = await Promise.all(
    Object.entries(ENDPOINTS).map(async ([key, url]) => {
      try {
        const res = await fetch(proxyUrl(url), {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; trico-poll/1.0)' },
        })
        if (!res.ok) {
          logger.warn({ key, url, status: res.status }, 'UFMG endpoint returned non-OK status')
          return [key, null] as const
        }
        const html = await res.text()
        const prob = extractProbability(html, teamName)
        logger.info({ key, prob }, 'Parsed probability')
        return [key, prob] as const
      } catch (err) {
        logger.warn({ key, url, err }, 'Failed to fetch UFMG endpoint')
        return [key, null] as const
      }
    })
  )
  return Object.fromEntries(entries) as TeamProbabilities
}
