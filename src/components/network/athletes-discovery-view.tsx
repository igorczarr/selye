"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { followUser, unfollowUser } from "@/actions/network";
import { Search, UserPlus, UserCheck, Flame, MapPin, ArrowLeft } from "lucide-react";

interface Athlete {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  sports: { code: string; namePt: string; icon: string | null }[];
  weeklyStreak: number;
  isFollowing: boolean;
}

interface AthletesDiscoveryViewProps {
  initialAthletes: Athlete[];
  sports: { code: string; namePt: string }[];
}

export function AthletesDiscoveryView({
  initialAthletes,
  sports,
}: AthletesDiscoveryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("all");
  const [athletes, setAthletes] = useState(initialAthletes);
  const [isPending, startTransition] = useTransition();

  const handleToggleFollow = (athleteId: string, currentlyFollowing: boolean) => {
    // Atualização otimista
    setAthletes((prev) =>
      prev.map((a) => (a.id === athleteId ? { ...a, isFollowing: !currentlyFollowing } : a))
    );

    startTransition(async () => {
      if (currentlyFollowing) {
        await unfollowUser(athleteId);
      } else {
        await followUser(athleteId);
      }
    });
  };

  const filtered = athletes.filter((a) => {
    const matchesQuery =
      !searchQuery ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.bio && a.bio.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSport =
      selectedSport === "all" || a.sports.some((s) => s.code === selectedSport);

    return matchesQuery && matchesSport;
  });

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/comunidade"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-grafite mb-2"
          >
            <ArrowLeft size={13} />
            <span>Voltar ao Mural</span>
          </Link>
          <span className="t-label block">Rede Esportiva (§11.1 e §11.4)</span>
          <h1 className="t-h1 mt-1">Descoberta de Atletas</h1>
          <p className="text-muted text-xs mt-1">
            Encontre atletas com as mesmas modalidades, valores de constância e objetivos de treino.
          </p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="rounded-lg border border-line bg-surface p-4 flex flex-col sm:flex-row gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-3 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, @usuario ou modalidade..."
            className="w-full h-10 pl-9 pr-3 rounded-md border border-line bg-background text-xs focus:outline-none focus:ring-1 focus:ring-profundo"
          />
        </div>

        <select
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          className="h-10 px-3 rounded-md border border-line bg-background text-xs font-medium"
        >
          <option value="all">Todas as Modalidades</option>
          {sports.map((s) => (
            <option key={s.code} value={s.code}>
              {s.namePt}
            </option>
          ))}
        </select>
      </div>

      {/* Grid de Atletas */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted text-sm border border-line rounded-lg bg-surface p-6">
          Nenhum atleta encontrado para os critérios pesquisados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((athlete) => (
            <div
              key={athlete.id}
              className="rounded-lg border border-line bg-surface p-5 flex flex-col justify-between gap-4 shadow-xs hover:border-profundo/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Link
                    href={`/atleta/${athlete.username}`}
                    className="w-12 h-12 rounded-full bg-grafite text-osso flex items-center justify-center font-bold text-base shadow-xs shrink-0 hover:opacity-90 transition-opacity"
                  >
                    {athlete.name?.[0] || "A"}
                  </Link>
                  <div>
                    <Link
                      href={`/atleta/${athlete.username}`}
                      className="font-semibold text-sm hover:underline text-grafite"
                    >
                      {athlete.name}
                    </Link>
                    <p className="t-data text-xs text-muted">@{athlete.username}</p>
                    {athlete.location && (
                      <div className="flex items-center gap-1 text-[11px] text-muted mt-0.5">
                        <MapPin size={11} />
                        <span>{athlete.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Badge de Streak Semanal */}
                {athlete.weeklyStreak > 0 && (
                  <div
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-osso border border-line shrink-0"
                    title="Semanas consecutivas cumprindo a meta"
                  >
                    <Flame size={12} className="text-amber-600" />
                    <span className="t-data text-xs font-bold text-grafite">
                      {athlete.weeklyStreak} sem
                    </span>
                  </div>
                )}
              </div>

              {/* Bio */}
              {athlete.bio && (
                <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                  {athlete.bio}
                </p>
              )}

              {/* Modalidades & Ação */}
              <div className="flex items-center justify-between pt-3 border-t border-line/60">
                <div className="flex flex-wrap gap-1">
                  {athlete.sports.map((s) => (
                    <span
                      key={s.code}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-osso text-profundo border border-line/60"
                    >
                      {s.namePt}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => handleToggleFollow(athlete.id, athlete.isFollowing)}
                  disabled={isPending}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    athlete.isFollowing
                      ? "border border-line bg-osso/60 text-grafite hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                      : "bg-grafite text-osso hover:bg-noite shadow-xs"
                  }`}
                >
                  {athlete.isFollowing ? (
                    <>
                      <UserCheck size={13} className="text-profundo" />
                      <span>Seguindo</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={13} />
                      <span>Seguir</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}