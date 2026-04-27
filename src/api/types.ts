export interface ForzaTeam {
  id: number
  name: string
  short_name?: string
  abbreviation?: string
}

export interface ForzaMatch {
  id: number
  status: 'before' | 'live' | 'after'
  kickoff_at: string
  home_team: ForzaTeam
  away_team: ForzaTeam
  tournament: {
    id: number
    name: string
    slug: string
  }
}

export interface ForzaResponse {
  matches: ForzaMatch[]
}
