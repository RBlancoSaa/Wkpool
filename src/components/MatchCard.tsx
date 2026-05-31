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
  const hasPrediction = prediction != null;

  const kickoff = new Date(match.kickoff).toLocaleString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md ${
        hasPrediction && !finished
          ? "border-pitch/40 ring-1 ring-pitch/20"
          : "border-slate-200"
      }`}
    >
      {/* status-strip aan de zijkant */}
      <span
        className={`absolute inset-y-0 left-0 w-1 ${
          finished ? "bg-slate-300" : locked ? "bg-red-400" : hasPrediction ? "bg-pitch" : "bg-amber-300"
        }`}
      />

      <div className="flex items-center justify-between pl-1 text-[11px] text-slate-400">
        <span>{kickoff}</span>
        {finished ? (
          <span className="font-medium text-slate-400">Afgelopen</span>
        ) : locked ? (
          <span className="font-medium text-red-500">🔒 Gesloten</span>
        ) : hasPrediction ? (
          <span className="font-medium text-pitch">✓ Ingevuld</span>
        ) : (
          <span className="font-medium text-amber-500">Nog open</span>
        )}
      </div>

      <form
        action={async (fd) => {
          await savePrediction(fd);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }}
        className="mt-2 pl-1"
      >
        <input type="hidden" name="pool_id" value={poolId} />
        <input type="hidden" name="match_id" value={match.id} />
        <input type="hidden" name="tier" value={tier} />

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <TeamSide team={home} align="left" />
          <div className="flex items-center gap-1">
            <input
              className="score-input"
              type="number"
              min={0}
              name="home_score"
              defaultValue={prediction?.home_score ?? ""}
              disabled={locked}
              required
              aria-label={`Doelpunten ${home?.name ?? "thuis"}`}
            />
            <span className="text-slate-300">:</span>
            <input
              className="score-input"
              type="number"
              min={0}
              name="away_score"
              defaultValue={prediction?.away_score ?? ""}
              disabled={locked}
              required
              aria-label={`Doelpunten ${away?.name ?? "uit"}`}
            />
          </div>
          <TeamSide team={away} align="right" />
        </div>

        {!locked && (
          <div className="mt-2 flex items-center gap-2">
            <span className="shrink-0 text-[11px] text-slate-400">⚽ 1e goal</span>
            <select
              className="input h-8 py-0 text-xs"
              name="scorer_team_id"
              defaultValue={prediction?.scorer_team_id ?? ""}
            >
              <option value="">— geen keuze —</option>
              {home && <option value={home.id}>{home.flag_emoji} {home.name}</option>}
              {away && <option value={away.id}>{away.flag_emoji} {away.name}</option>}
            </select>
          </div>
        )}

        {finished ? (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-sm">
            <span className="text-slate-500">
              Uitslag <strong className="text-slate-800">{match.home_score}–{match.away_score}</strong>
            </span>
            {prediction && (
              <span className="badge bg-pitch/10 font-semibold text-pitch">
                +{prediction.points} pt
              </span>
            )}
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {locked
                ? "Inleg gesloten"
                : `Sluit ${lockTime(match).toLocaleString("nl-NL", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
            </span>
            {!locked && (
              <button
                className={`btn h-8 px-3 text-xs ${saved ? "bg-pitch text-white" : "btn-primary"}`}
                type="submit"
              >
                {saved ? "✓ Opgeslagen" : "Opslaan"}
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

function TeamSide({ team, align }: { team?: Team; align: "left" | "right" }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 ${
        align === "right" ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      <span className="text-2xl leading-none">{team?.flag_emoji ?? "🏳️"}</span>
      <span className="truncate text-sm font-semibold text-slate-800">
        {team?.code ?? team?.name ?? "?"}
      </span>
    </div>
  );
}
