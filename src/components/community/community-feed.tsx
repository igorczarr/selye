"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPost,
  reactToPost,
  addComment,
  type CommunityFilter,
} from "@/actions/community";
import { blockUser, reportContent } from "@/actions/network";
import { tokenizeSocialText, type TrendingTag } from "@/core/social/text-parser";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  Flame,
  ThumbsUp,
  MessageSquare,
  Share2,
  Send,
  MoreHorizontal,
  Flag,
  UserX,
  Users,
  Compass,
  UserCheck,
  Dumbbell,
  Sparkles,
  Check,
  X,
  Hash,
  MessagesSquare,
  Image as ImageIcon,
  Trophy,
  CornerDownRight,
  UserPlus,
  Clock,
} from "lucide-react";

interface CommunityFeedProps {
  posts: any[];
  activeTab: CommunityFilter;
  activeTag?: string;
  trendingTags: TrendingTag[];
  userTeams: { teamId: string; teamName: string; teamSlug: string }[];
  recentWorkouts: {
    id: string;
    title: string;
    modalityCode: string;
    dateLabel: string;
    rpe: number;
  }[];
  activeChallenges: {
    id: string;
    title: string;
    challengeType: string;
    targetValue: string | null;
    endDate: string;
    participantsCount: number;
  }[];
}

const STARTER_TAGS = [
  "treino",
  "forca",
  "voleidepraia",
  "pr",
  "consistencia",
  "recuperacao",
];

function SocialText({ text }: { text: string }) {
  const tokens = tokenizeSocialText(text);
  return (
    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
      {tokens.map((tok, i) => {
        if (tok.type === "hashtag") {
          return (
            <Link
              key={i}
              href={`/comunidade/tag/${encodeURIComponent(tok.tag)}`}
              className="text-accent-text font-mono font-semibold hover:underline"
            >
              {tok.value}
            </Link>
          );
        }
        if (tok.type === "mention") {
          return (
            <Link
              key={i}
              href={`/atleta/${encodeURIComponent(tok.username)}`}
              className="text-foreground font-semibold underline decoration-lima decoration-2 underline-offset-2 hover:text-accent-text"
            >
              {tok.value}
            </Link>
          );
        }
        return <span key={i}>{tok.value}</span>;
      })}
    </p>
  );
}

export function CommunityFeed({
  posts,
  activeTab,
  activeTag,
  trendingTags,
  userTeams,
  recentWorkouts,
  activeChallenges,
}: CommunityFeedProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Composer state
  const [composerMode, setComposerMode] = useState<"post" | "thread">(
    activeTab === "threads" ? "thread" : "post"
  );
  const [content, setContent] = useState(activeTag ? `#${activeTag} ` : "");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [visibility, setVisibility] = useState<"public" | "followers" | "team_only">("public");
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);

  // Comments & nested replies state
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<
    Record<string, { commentId: string; authorName: string } | null>
  >({});

  // Moderation & share state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    postId: string;
    authorName: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [blockTarget, setBlockTarget] = useState<{
    userId: string;
    authorName: string;
  } | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const appendTag = (tag: string) => {
    setContent((prev) => {
      const trimmed = prev.trimEnd();
      if (trimmed.toLowerCase().includes(`#${tag}`)) return prev;
      return trimmed ? `${trimmed} #${tag} ` : `#${tag} `;
    });
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedSessionId && !photoUrl.trim()) return;

    startTransition(async () => {
      await createPost({
        contentText: content.trim(),
        postType:
          composerMode === "thread"
            ? "group_thread"
            : selectedSessionId
              ? "workout_report"
              : "general_post",
        sessionId: selectedSessionId || undefined,
        teamId: selectedTeamId || undefined,
        visibility: selectedTeamId ? "team_only" : visibility,
        mediaUrls: photoUrl.trim() ? [photoUrl.trim()] : [],
      });
      setContent(activeTag ? `#${activeTag} ` : "");
      setSelectedSessionId("");
      setPhotoUrl("");
      setShowPhotoInput(false);
      setShowWorkoutPicker(false);
      setStatusBanner(
        composerMode === "thread"
          ? "Fio de discussão publicado com sucesso."
          : "Publicação registrada na comunidade."
      );
      router.refresh();
    });
  };

  const handleReact = (postId: string, type: string) => {
    startTransition(async () => {
      await reactToPost(postId, type);
      router.refresh();
    });
  };

  const handleComment = (postId: string) => {
    const text = (commentInputs[postId] || "").trim();
    if (!text) return;
    const parentId = replyingTo[postId]?.commentId;

    startTransition(async () => {
      await addComment(postId, text, parentId);
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      setReplyingTo((prev) => ({ ...prev, [postId]: null }));
      setOpenComments((prev) => ({ ...prev, [postId]: true }));
      router.refresh();
    });
  };

  const handleShare = async (post: any) => {
    const shareText = `${post.authorName} no Selye: "${
      post.contentText || post.workoutReport?.title || "Treino registrado"
    }"`;
    const shareUrl =
      typeof window !== "undefined" ? `${window.location.origin}/comunidade` : "";

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Selye Comunidade", text: shareText, url: shareUrl });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText} — ${shareUrl}`);
        setCopiedPostId(post.id);
        setTimeout(() => setCopiedPostId(null), 2200);
      }
    } catch {
      // cancelado pelo usuário
    }
  };

  const handleConfirmBlock = () => {
    if (!blockTarget) return;
    startTransition(async () => {
      await blockUser(blockTarget.userId);
      setStatusBanner(`${blockTarget.authorName} foi bloqueado(a) com segurança.`);
      setBlockTarget(null);
      router.refresh();
    });
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget || reportReason.trim().length < 5) return;
    startTransition(async () => {
      await reportContent({
        targetType: "post",
        targetId: reportTarget.postId,
        reason: reportReason.trim(),
      });
      setReportTarget(null);
      setReportReason("");
      setStatusBanner("Denúncia registrada para moderação.");
    });
  };

  const displayTrending: TrendingTag[] =
    trendingTags.length > 0
      ? trendingTags
      : STARTER_TAGS.map((tag) => ({ tag, count: 0 }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start fade-up">
      {/* ================= RAIL ESQUERDA DESKTOP (NAVEGAÇÃO, EQUIPES E REDE) ================= */}
      <aside className="hidden xl:flex xl:col-span-3 flex-col gap-4 sticky top-20">
        <section className="card p-3 flex flex-col gap-1">
          <span className="t-label px-2.5 pt-1 pb-1.5 block">Feed</span>
          {(
            [
              { id: "explore", label: "Explorar", icon: Compass },
              { id: "following", label: "Seguindo", icon: UserCheck },
              { id: "teams", label: "Equipes", icon: Users },
              { id: "threads", label: "Fios & Threads", icon: MessagesSquare },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id && !activeTag;
            return (
              <Link
                key={tab.id}
                href={`/comunidade?tab=${tab.id}`}
                className={`h-9 px-3 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-colors ${
                  active
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </section>

        <section className="card p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="t-label">Minhas Equipes</span>
            <Link
              href="/equipes"
              className="t-aux text-accent-text hover:underline"
            >
              Gerenciar
            </Link>
          </div>
          {userTeams.length === 0 ? (
            <p className="text-xs text-muted">
              Entre ou crie uma equipe para abrir fios de discussão em grupo.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {userTeams.map((t) => (
                <Link
                  key={t.teamId}
                  href="/comunidade?tab=teams"
                  className="px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-foreground/5 flex items-center gap-2 transition-colors"
                >
                  <Users size={13} className="text-accent-text shrink-0" />
                  <span className="truncate">{t.teamName}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card p-3 flex flex-col gap-1.5">
          <Link
            href="/comunidade/atletas"
            className="btn btn-ghost h-9 w-full justify-start text-xs"
          >
            <UserPlus size={14} className="text-accent-text" />
            <span>Descobrir Atletas</span>
          </Link>
          <Link
            href="/comunidade/desafios"
            className="btn btn-ghost h-9 w-full justify-start text-xs"
          >
            <Trophy size={14} className="text-accent-text" />
            <span>Ranking & Desafios</span>
          </Link>
        </section>
      </aside>

      {/* ================= COLUNA CENTRAL (COMPOSER + FEED EM LARGURA IDEAL DE LEITURA) ================= */}
      <div className="lg:col-span-8 xl:col-span-6 flex flex-col gap-5 min-w-0">
        {/* Banner de status */}
        {statusBanner && (
          <div
            role="status"
            className="rounded-xl border border-profundo bg-lima/20 px-4 py-3 flex items-center justify-between gap-3 text-xs text-foreground"
          >
            <span className="font-medium">{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              aria-label="Fechar aviso"
              className="text-muted hover:text-foreground cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Filtro ativo de Hashtag */}
        {activeTag && (
          <div className="card p-4 flex items-center justify-between gap-3 bg-lima/10 border-lima/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-lima text-grafite flex items-center justify-center shrink-0">
                <Hash size={17} />
              </div>
              <div className="min-w-0">
                <span className="t-label !text-accent-text">Tópico filtrado</span>
                <p className="font-semibold text-base text-foreground truncate">
                  #{activeTag} · {posts.length}{" "}
                  {posts.length === 1 ? "publicação" : "publicações"}
                </p>
              </div>
            </div>
            <Link href="/comunidade" className="btn btn-ghost h-9 px-3 text-xs shrink-0">
              <X size={14} />
              <span>Limpar</span>
            </Link>
          </div>
        )}

        {/* Abas do Feed (abaixo de xl; em telas largas fica na rail esquerda fixa) */}
        <div
          role="tablist"
          aria-label="Filtros do mural esportivo"
          className="card p-1.5 flex xl:hidden items-center gap-1 overflow-x-auto no-scrollbar"
        >
          {(
            [
              { id: "explore", label: "Explorar", icon: Compass },
              { id: "following", label: "Seguindo", icon: UserCheck },
              { id: "teams", label: "Equipes", icon: Users },
              { id: "threads", label: "Fios", icon: MessagesSquare },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id && !activeTag;
            return (
              <Link
                key={tab.id}
                href={`/comunidade?tab=${tab.id}`}
                role="tab"
                aria-selected={active}
                className={`flex-1 min-w-[92px] h-9 px-3 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Composer Rico (Publicação / Relatório de Treino / Fio em Grupo) */}
        <form onSubmit={handlePublish} className="card p-4 sm:p-5 flex flex-col gap-3.5">
          {/* Seletor de formato: Post vs Fio (Thread) */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setComposerMode("post")}
                className={`h-8 px-3 rounded-full text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  composerMode === "post"
                    ? "bg-foreground text-background"
                    : "bg-foreground/5 text-muted hover:text-foreground"
                }`}
              >
                Publicação
              </button>
              <button
                type="button"
                onClick={() => setComposerMode("thread")}
                className={`h-8 px-3 rounded-full text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  composerMode === "thread"
                    ? "bg-lima text-grafite"
                    : "bg-foreground/5 text-muted hover:text-foreground"
                }`}
              >
                <MessagesSquare size={12} />
                <span>Fio / Thread</span>
              </button>
            </div>

            {/* Público / Equipe */}
            <select
              value={selectedTeamId || visibility}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "public" || val === "followers") {
                  setSelectedTeamId("");
                  setVisibility(val);
                } else {
                  setSelectedTeamId(val);
                  setVisibility("team_only");
                }
              }}
              aria-label="Escolher público ou grupo"
              className="h-8 px-2.5 rounded-lg border border-line bg-background text-xs font-mono text-foreground"
            >
              <option value="public">Público</option>
              <option value="followers">Seguidores</option>
              {userTeams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  Grupo: {t.teamName}
                </option>
              ))}
            </select>
          </div>

          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              composerMode === "thread"
                ? "Abra uma discussão técnica com seu grupo... use #hashtags e @menções (ex: #voleidepraia #pliometria)"
                : "Compartilhe seu treino, recorde ou aprendizado... use #hashtags e @atletas"
            }
            aria-label="Escrever publicação ou fio na comunidade"
            className="input h-auto py-2.5 text-sm resize-none"
          />

          {/* Chips rápidos de #hashtag */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {STARTER_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => appendTag(tag)}
                className="px-2.5 py-1 rounded-full border border-line text-[11px] font-mono text-muted hover:text-foreground hover:border-mineral shrink-0 cursor-pointer transition-colors"
              >
                +#{tag}
              </button>
            ))}
          </div>

          {/* Anexar Treino Concluído (estilo Gymrats) */}
          {showWorkoutPicker && (
            <div className="p-3 rounded-xl border border-line bg-foreground/[0.02] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="t-label">Anexar Relatório de Treino</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSessionId("");
                    setShowWorkoutPicker(false);
                  }}
                  className="text-muted hover:text-foreground cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
              {recentWorkouts.length === 0 ? (
                <p className="text-xs text-muted">
                  Conclua uma sessão na página inicial para anexar o cartão de treino aqui.
                </p>
              ) : (
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="input h-9 text-xs"
                >
                  <option value="">Selecionar sessão concluída...</option>
                  {recentWorkouts.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title} · {w.dateLabel} (RPE {w.rpe}/10)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Anexar Foto (URL) */}
          {showPhotoInput && (
            <div className="p-3 rounded-xl border border-line bg-foreground/[0.02] flex items-center gap-2">
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="Cole a URL de uma imagem (https://...)"
                aria-label="URL da foto da publicação"
                className="input h-9 text-xs flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  setPhotoUrl("");
                  setShowPhotoInput(false);
                }}
                aria-label="Remover foto"
                className="text-muted hover:text-foreground cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Barra inferior do composer */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowWorkoutPicker((v) => !v)}
                className={`h-9 px-2.5 rounded-lg text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  selectedSessionId || showWorkoutPicker
                    ? "bg-lima/25 text-foreground font-semibold"
                    : "text-muted hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                <Dumbbell size={14} />
                <span className="hidden sm:inline">Anexar treino</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPhotoInput((v) => !v)}
                className={`h-9 px-2.5 rounded-lg text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  photoUrl || showPhotoInput
                    ? "bg-lima/25 text-foreground font-semibold"
                    : "text-muted hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                <ImageIcon size={14} />
                <span className="hidden sm:inline">Foto</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={
                isPending ||
                (!content.trim() && !selectedSessionId && !photoUrl.trim())
              }
              className="btn btn-primary h-9 px-4 text-xs"
            >
              <Send size={13} />
              <span>
                {isPending
                  ? "Publicando..."
                  : composerMode === "thread"
                    ? "Abrir Fio"
                    : "Publicar"}
              </span>
            </button>
          </div>
        </form>

        {/* Lista de Publicações & Fios */}
        {posts.length === 0 ? (
          <div className="card p-10 text-center flex flex-col items-center gap-2">
            <MessagesSquare size={26} className="text-muted/60" />
            <h2 className="t-h3">
              {activeTag
                ? `Nenhuma publicação com #${activeTag} ainda`
                : activeTab === "threads"
                  ? "Nenhum fio de discussão aberto ainda"
                  : "Nenhuma publicação nesta aba"}
            </h2>
            <p className="text-xs text-muted max-w-sm">
              Seja o primeiro a compartilhar um treino concluído, abrir um fio técnico ou usar uma #hashtag acima.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post) => {
              const isThread =
                post.postType === "group_thread" ||
                post.postType === "team_announcement";
              const commentsList: any[] = post.comments || [];
              const rootComments = commentsList.filter(
                (c) => !c.parentCommentId
              );
              const repliesByParent = new Map<string, any[]>();
              for (const c of commentsList) {
                if (c.parentCommentId) {
                  const arr = repliesByParent.get(c.parentCommentId) || [];
                  arr.push(c);
                  repliesByParent.set(c.parentCommentId, arr);
                }
              }

              const commentsOpen = Boolean(openComments[post.id]) || isThread;
              const reactionCount = post.reactions?.length ?? post.likesCount ?? 0;

              return (
                <article
                  key={post.id}
                  className={`card p-5 flex flex-col gap-3.5 ${
                    isThread ? "border-l-4 border-l-lima" : ""
                  }`}
                >
                  {/* Cabeçalho do Post */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Link
                        href={`/atleta/${encodeURIComponent(post.authorUsername)}`}
                        className="w-10 h-10 rounded-full bg-noite text-lima font-mono font-semibold text-sm flex items-center justify-center shrink-0 border border-line"
                      >
                        {(post.authorName || "A").charAt(0).toUpperCase()}
                      </Link>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/atleta/${encodeURIComponent(post.authorUsername)}`}
                            className="font-semibold text-sm text-foreground hover:underline truncate"
                          >
                            {post.authorName}
                          </Link>
                          <span className="t-aux text-muted">
                            @{post.authorUsername}
                          </span>
                          {isThread && (
                            <span className="px-2 py-0.5 rounded-full bg-lima/25 text-foreground text-[10px] font-mono font-semibold">
                              Fio de Grupo
                            </span>
                          )}
                          {post.teamName && (
                            <span className="chip text-[10px]">{post.teamName}</span>
                          )}
                        </div>
                        <span className="t-aux text-muted">
                          {new Date(post.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Menu de Moderação */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        aria-label="Mais opções"
                        onClick={() =>
                          setOpenMenuId(openMenuId === post.id ? null : post.id)
                        }
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenuId === post.id && (
                        <div className="absolute right-0 mt-1 w-48 rounded-xl border border-line bg-surface shadow-lg p-1 z-30 flex flex-col">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setReportTarget({
                                postId: post.id,
                                authorName: post.authorName,
                              });
                            }}
                            className="px-3 py-2 rounded-lg text-xs text-left flex items-center gap-2 text-foreground hover:bg-foreground/5 cursor-pointer"
                          >
                            <Flag size={13} className="text-muted" />
                            <span>Denunciar conteúdo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setBlockTarget({
                                userId: post.userId,
                                authorName: post.authorName,
                              });
                            }}
                            className="px-3 py-2 rounded-lg text-xs text-left flex items-center gap-2 text-foreground hover:bg-foreground/5 cursor-pointer"
                          >
                            <UserX size={13} className="text-muted" />
                            <span>Bloquear atleta</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Corpo do texto com #hashtags e @menções clicáveis */}
                  {post.contentText && <SocialText text={post.contentText} />}

                  {/* Galeria de fotos (quando houver mediaUrls) */}
                  {Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 rounded-xl overflow-hidden border border-line">
                      {post.mediaUrls.map((url: string, idx: number) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={url}
                          alt={`Foto da publicação de ${post.authorName}`}
                          loading="lazy"
                          className="w-full max-h-96 object-cover bg-foreground/5"
                        />
                      ))}
                    </div>
                  )}

                  {/* Cartão de Relatório de Treino (estilo Gymrats) */}
                  {post.workoutReport && (
                    <div className="rounded-xl bg-gradient-to-br from-noite to-grafite text-osso p-4 flex flex-col gap-3 border border-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <span className="t-label !text-lima">
                          TREINO CONCLUÍDO NO SELYE
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-mono text-osso">
                          Esforço {post.workoutReport.rpe || 8}/10
                        </span>
                      </div>
                      <h3 className="font-semibold text-base text-osso">
                        {post.workoutReport.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-nevoa">
                        {post.workoutReport.durationMinutes && (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={13} className="text-lima" />
                            {post.workoutReport.durationMinutes} min
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <Dumbbell size={13} className="text-lima" />
                          {post.workoutReport.modality}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Barra de Reações, Comentários e Compartilhamento */}
                  <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {(
                        [
                          { id: "like", label: "Curtir", icon: ThumbsUp },
                          { id: "fire", label: "Fogo", icon: Flame },
                          { id: "muscle", label: "Força", icon: Dumbbell },
                          { id: "applause", label: "Aplauso", icon: Sparkles },
                        ] as const
                      ).map((r) => {
                        const Icon = r.icon;
                        const active = post.userReaction === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleReact(post.id, r.id)}
                            aria-pressed={active}
                            title={r.label}
                            className={`h-8 px-2.5 rounded-full text-xs font-mono inline-flex items-center gap-1 transition-colors cursor-pointer ${
                              active
                                ? "bg-lima text-grafite font-semibold"
                                : "text-muted hover:text-foreground hover:bg-foreground/5"
                            }`}
                          >
                            <Icon size={13} />
                            {active && <span className="hidden sm:inline">{r.label}</span>}
                          </button>
                        );
                      })}
                      {reactionCount > 0 && (
                        <span className="t-data text-xs text-muted ml-1">
                          {reactionCount}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenComments((prev) => ({
                            ...prev,
                            [post.id]: !commentsOpen,
                          }))
                        }
                        className="h-8 px-2.5 rounded-lg text-xs font-mono text-muted hover:text-foreground hover:bg-foreground/5 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        <span>{commentsList.length}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShare(post)}
                        className="h-8 px-2.5 rounded-lg text-xs font-mono text-muted hover:text-foreground hover:bg-foreground/5 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedPostId === post.id ? (
                          <>
                            <Check size={13} className="text-accent-text" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Share2 size={13} />
                            <span className="hidden sm:inline">Compartilhar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Fio de Comentários e Respostas Aninhadas (2 níveis) */}
                  {commentsOpen && (
                    <div className="pt-3 border-t border-line/70 flex flex-col gap-3">
                      {rootComments.length > 0 && (
                        <div className="flex flex-col gap-2.5">
                          {rootComments.map((c) => {
                            const children = repliesByParent.get(c.id) || [];
                            return (
                              <div key={c.id} className="flex flex-col gap-2">
                                <div className="rounded-xl bg-foreground/[0.03] border border-line/60 px-3.5 py-2.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <Link
                                      href={`/atleta/${encodeURIComponent(c.authorUsername)}`}
                                      className="text-xs font-semibold text-foreground hover:underline"
                                    >
                                      {c.authorName}
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReplyingTo((prev) => ({
                                          ...prev,
                                          [post.id]: {
                                            commentId: c.id,
                                            authorName: c.authorName,
                                          },
                                        }))
                                      }
                                      className="text-[11px] font-mono text-accent-text hover:underline cursor-pointer"
                                    >
                                      Responder
                                    </button>
                                  </div>
                                  <div className="mt-1">
                                    <SocialText text={c.contentText} />
                                  </div>
                                </div>

                                {/* Respostas filhas no fio (nível 2 com trilho vertical) */}
                                {children.length > 0 && (
                                  <div className="ml-4 pl-3 border-l-2 border-line flex flex-col gap-2">
                                    {children.map((reply) => (
                                      <div
                                        key={reply.id}
                                        className="rounded-lg bg-surface border border-line/60 px-3 py-2"
                                      >
                                        <div className="flex items-center gap-1.5 text-xs">
                                          <CornerDownRight
                                            size={12}
                                            className="text-muted shrink-0"
                                          />
                                          <Link
                                            href={`/atleta/${encodeURIComponent(reply.authorUsername)}`}
                                            className="font-semibold text-foreground hover:underline"
                                          >
                                            {reply.authorName}
                                          </Link>
                                        </div>
                                        <div className="mt-1">
                                          <SocialText text={reply.contentText} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Caixa de resposta ao post ou a um comentário específico */}
                      <div className="flex flex-col gap-1.5">
                        {replyingTo[post.id] && (
                          <div className="flex items-center justify-between text-[11px] font-mono text-accent-text px-1">
                            <span>
                              Respondendo a {replyingTo[post.id]?.authorName}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setReplyingTo((prev) => ({
                                  ...prev,
                                  [post.id]: null,
                                }))
                              }
                              className="text-muted hover:text-foreground cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ""}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleComment(post.id);
                              }
                            }}
                            placeholder={
                              replyingTo[post.id]
                                ? "Escreva sua resposta no fio..."
                                : "Adicione um comentário ou #hashtag..."
                            }
                            className="input h-9 text-xs flex-1"
                          />
                          <button
                            type="button"
                            disabled={
                              isPending || !(commentInputs[post.id] || "").trim()
                            }
                            onClick={() => handleComment(post.id)}
                            aria-label="Enviar comentário"
                            className="btn btn-dark h-9 w-9 p-0 shrink-0"
                          >
                            <Send size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= RAIL DIREITA (EM ALTA #HASHTAGS + DESAFIOS GYMRATS) ================= */}
      <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 lg:sticky lg:top-20">
        {/* Em Alta (#Hashtags) */}
        <section className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="t-label">Em Alta · 7 dias</span>
            <Hash size={14} className="text-accent-text" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {displayTrending.map((t) => (
              <Link
                key={t.tag}
                href={`/comunidade/tag/${encodeURIComponent(t.tag)}`}
                className={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors ${
                  activeTag === t.tag
                    ? "bg-lima text-grafite font-semibold"
                    : "bg-foreground/6 text-foreground hover:bg-foreground/12"
                }`}
              >
                #{t.tag}
                {t.count > 0 && (
                  <span className="ml-1 opacity-70">{t.count}</span>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* Desafios Ativos (Estilo Gymrats) */}
        <section className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="t-label">Desafios Ativos</span>
            <Link
              href="/comunidade/desafios"
              className="t-aux text-accent-text hover:underline"
            >
              Ver todos
            </Link>
          </div>
          {activeChallenges.length === 0 ? (
            <p className="text-xs text-muted">
              Explore os desafios coletivos para manter a constância em grupo.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activeChallenges.map((c) => (
                <Link
                  key={c.id}
                  href="/comunidade/desafios"
                  className="p-3 rounded-xl border border-line bg-foreground/[0.02] hover:border-mineral transition-colors flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {c.title}
                    </p>
                    <p className="t-aux text-muted mt-0.5">
                      {c.participantsCount}{" "}
                      {c.participantsCount === 1 ? "atleta" : "atletas"} · até{" "}
                      {c.endDate}
                    </p>
                  </div>
                  <Trophy size={14} className="text-accent-text shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Atalhos da Rede (visíveis abaixo de xl, já presentes na rail esquerda no desktop largo) */}
        <section className="card p-4 flex flex-col gap-2 xl:hidden">
          <Link
            href="/comunidade/atletas"
            className="btn btn-ghost h-9 w-full justify-start text-xs"
          >
            <UserPlus size={14} className="text-accent-text" />
            <span>Descobrir Atletas</span>
          </Link>
          <Link
            href="/equipes"
            className="btn btn-ghost h-9 w-full justify-start text-xs"
          >
            <Users size={14} className="text-accent-text" />
            <span>Equipes & Subgrupos</span>
          </Link>
        </section>
      </aside>

      {/* Modal Customizado de Bloqueio via ModalPortal */}
      <ModalPortal
        open={Boolean(blockTarget)}
        onClose={() => setBlockTarget(null)}
        ariaLabel="Confirmar bloqueio de perfil"
        maxWidthClass="max-w-sm"
      >
        <div className="card p-6 w-full bg-surface border border-line shadow-2xl flex flex-col gap-4">
          <h3 className="t-h3">Bloquear {blockTarget?.authorName}?</h3>
          <p className="text-xs text-muted leading-relaxed">
            Você deixará de ver publicações e interações deste perfil imediatamente.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBlockTarget(null)}
              className="btn btn-ghost h-9 px-3 text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleConfirmBlock}
              className="btn btn-dark h-9 px-4 text-xs"
            >
              Confirmar Bloqueio
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Modal Customizado de Denúncia via ModalPortal */}
      <ModalPortal
        open={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        ariaLabel="Denunciar publicação"
        maxWidthClass="max-w-sm"
      >
        <form
          onSubmit={handleReportSubmit}
          className="card p-6 w-full bg-surface border border-line shadow-2xl flex flex-col gap-4"
        >
          <h3 className="t-h3">Denunciar publicação</h3>
          <textarea
            rows={3}
            required
            minLength={5}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Descreva o motivo da denúncia (mín. 5 caracteres)..."
            className="input h-auto py-2 text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReportTarget(null)}
              className="btn btn-ghost h-9 px-3 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || reportReason.trim().length < 5}
              className="btn btn-primary h-9 px-4 text-xs"
            >
              Enviar Denúncia
            </button>
          </div>
        </form>
      </ModalPortal>
    </div>
  );
}
