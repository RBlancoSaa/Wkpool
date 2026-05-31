export type PoolTier = "fun" | "win";
export type MatchStatus = "scheduled" | "live" | "finished";

export type Pool = {
  id: string;
  tier: PoolTier;
  name: string;
  description: string;
  entry_fee_cents: number;
};

export type Team = {
  id: string;
  name: string;
  code: string | null;
  flag_emoji: string | null;
};

export type Match = {
  id: string;
  stage: string;
  group_name: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff: string;
  lock_minutes: number;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
};

export type Prediction = {
  id: string;
  user_id: string;
  pool_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  scorer_team_id: string | null;
  points: number;
};

export type Standing = {
  pool_id: string;
  user_id: string;
  full_name: string;
  total_points: number;
  match_points: number;
  bonus_points: number;
  predictions_made: number;
};

export function euro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

// Deadline = kickoff + lock_minutes
export function lockTime(match: Pick<Match, "kickoff" | "lock_minutes">): Date {
  return new Date(new Date(match.kickoff).getTime() + match.lock_minutes * 60_000);
}

export function isLocked(match: Pick<Match, "kickoff" | "lock_minutes">): boolean {
  return Date.now() >= lockTime(match).getTime();
}
