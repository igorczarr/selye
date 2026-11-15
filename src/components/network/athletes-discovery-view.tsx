"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { followUser, unfollowUser } from "@/actions/network";
import {
  Search,
  UserPlus,
  UserCheck,
  Flame,
  MapPin,
  ArrowLeft,
  Users,
} from "lucide-react";

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

  const handleToggleFollow = (
    athleteId: string,
    currentlyFollowing: boolean
  ) => {
    setAthletes((prev) =>
      prev.map((a) =>
        a.id === athleteId ? { ...a, isFollowing: !currentlyFollowing } : a
      )
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
      selectedSport === "all" ||
      a.sports.some((s) => s.code === selectedSport);

    return matchesQuery && matchesSport;
  });

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full fade-up">
      {/* Cabeçalho */}
      <div>
        <Link
          href="/comunidade"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Voltar ao Mural</span>
        </Link>
        <span className="t-label block">Rede Esportiva</span>
        <h1 className="t-h1 mt-1">Descoberta de Atletas</h1>
        <p className="text-muted text-sm mt-1">
          Encontre praticantes das mesmas modalidades e acompanhe rotinas de consistência.
        </p>
      </div>

      {/* Barra de Busca e Filtro de Modalidade */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, @usuario ou bio..."
            aria-label="Buscar atletas"
            className="input h-10 pl-9 text-xs"
          />
        </div>

        <select
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          aria-label="Filtrar por modalidade esportiva"
          className="input h-10 sm:w-56 text-xs"
        >
          <option value="all">Todas as Modalidades</option>
          {sports.map((s) => (
            <option key={s.code} value={s.code}>
              {s.namePt}
            </option>
          ))}
        </select>
      </div>

      {/* Grade de Atletas */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center gap-2">
          <Users size={26} className="text-muted/60" />
          <p className="font-semibold text-sm text-foreground">
            Nenhum atleta corresponde aos critérios de busca
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedSport("all");
            }}
            className="btn btn-ghost h-9 px-3 text-xs mt-1"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((athlete) => (
            <article
              key={athlete.id}
              className="card card-interactive p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Link
                    href={`/atleta/${athlete.username}`}
                    className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center font-semibold text-base shrink-0 hover:opacity-90 transition-opacity"
                  >
                    {athlete.name?.[0] || "A"}
                  </Link>
                  <div>
                    <Link
                      href={`/atleta/${athlete.username}`}
                      className="font-semibold text-sm text-foreground hover:underline"
                    >
                      {athlete.name}
                    </Link>
                    <p className="t-data text-xs text-muted">
                      @{athlete.username}
                    </p>
                    {athlete.location && (
                      <div className="flex items-center gap-1 text-xs text-muted mt-1">
                        <MapPin size={12} />
                        <span>{athlete.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {athlete.weeklyStreak > 0 && (
                  <div
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-lima/25 text-foreground shrink-0"
                    title="Semanas consecutivas cumprindo a meta"
                  >
                    <Flame size={12} className="text-accent-text" />
                    <span className="t-data text-xs font-semibold">
                      {athlete.weeklyStreak} sem
                    </span>
                  </div>
                )}
              </div>

              {athlete.bio && (
                <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                  {athlete.bio}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-line">
                <div className="flex flex-wrap gap-1.5">
                  {athlete.sports.map((s) => (
                    <span key={s.code} className="chip">
                      {s.namePt}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleToggleFollow(athlete.id, athlete.isFollowing)
                  }
                  disabled={isPending}
                  className={`btn h-9 px-3.5 text-xs shrink-0 ${
                    athlete.isFollowing ? "btn-ghost" : "btn-dark"
                  }`}
                >
                  {athlete.isFollowing ? (
                    <>
                      <UserCheck size={14} className="text-accent-text" />
                      <span>Seguindo</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>Seguir</span>
                    </>
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
