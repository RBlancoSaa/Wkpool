"use client";

import { useState } from "react";
import { savePrediction } from "@/app/actions";
import { isLocked, lockTime, type Match, type Team, type PoolTier } from "@/lib/types";

type Props = {
  match: Match;
  home?: Team;
  away?: Team;
  poolId: string;
  tier: PoolTier;
  prediction?: { home_score: number; away_score: number; scorer_team_id: string | null; points: number };
};

export default function MatchCard({ match, home, away, poolId, tier, prediction }: Props) {
  const locked = isLocked(match);
  const finished = match.status === "finished";
  const [saved, setSaved] = useState(false);

  const kickoff = new Date(match.kickoff).toLocaleString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{match.stage}</span>
        <span>{kickoff}</span>
      </div>

      <form
        action={async (fd) => {
          await savePrediction(fd);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }}
        className="mt-3"
      >
        <input type="hidden" name="pool_id" value={poolId} />
        <input type="hidden" name="match_id" value={match.id} />
        <input type="hidden" name="tier" value={tier} />

        <div className="flex items-center justify-between gap-2">
          <TeamSide team={home} align="left" />
          <div className="flex items-center gap-1">
            <input
              className="input w-14 text-center"
              type="number"
              min={0}
              name="home_score"
              defaultValue={prediction?.home_score ?? ""}
              disabled={locked}
              required
            />
            <span className="font-bold text-slate-400">-</span>
            <input
              className="input w-14 text-center"
              type="number"
              min={0}
              name="away_score"
              defaultValue={prediction?.away_score ?? ""}
              disabled={locked}
              required
            />
          </div>
          <TeamSide team={away} align="right" />
        </div>

        <div className="mt-3">
          <label className="label text-xs">Wie scoort als eerste?</label>
          <select
            className="input"
            name="scorer_team_id"
            defaultValue={prediction?.scorer_team_id ?? ""}
            disabled={locked}
          >
            <option value="">— geen keuze —</option>
            {home && <option value={home.id}>{home.flag_emoji} {home.name}</option>}
            {away && <option value={away.id}>{away.flag_emoji} {away.name}</option>}
          </select>
        </div>

        {finished && (
          <p className="mt-3 rounded-lg bg-slate-100 p-2 text-center text-sm">
            Uitslag: <strong>{match.home_score} - {match.away_score}</strong>
            {prediction && (
              <span className="ml-2 font-semibold text-pitch">
                +{prediction.points} pt
              </span>
            )}
          </p>
        )}

        {!finished && (
          <div className="mt-3 flex items-center justify-between">
            {locked ? (
              <span className="badge bg-red-100 text-red-700">🔒 Gesloten</span>
            ) : (
              <span className="text-xs text-slate-500">
                Sluit: {lockTime(match).toLocaleString("nl-NL", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <button className="btn-primary" type="submit" disabled={locked}>
              {saved ? "✓ Opgeslagen" : "Opslaan"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

function TeamSide({ team, align }: { team?: Team; align: "left" | "right" }) {
  return (
    <div className={`flex-1 ${align === "right" ? "text-right" : "text-left"}`}>
      <span className="text-2xl">{team?.flag_emoji}</span>
      <div className="text-sm font-semibold">{team?.code ?? team?.name ?? "?"}</div>
    </div>
  );
}
