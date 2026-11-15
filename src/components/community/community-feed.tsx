"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPost, reactToPost, addComment } from "@/actions/community";
import { blockUser, reportContent } from "@/actions/network";
import {
  MessageSquare,
  Flame,
  ThumbsUp,
  Dumbbell,
  Send,
  Share2,
  MoreHorizontal,
  Flag,
  UserX,
  CornerDownRight,
  X,
  CheckCircle2,
  Check,
} from "lucide-react";

interface CommunityFeedProps {
  posts: any[];
  activeTab?: "explore" | "teams" | "following";
}

const MODALITY_LABELS: Record<string, string> = {
  strength: "Musculação",
  calisthenics: "Calistenia",
  functional: "Funcional",
  running: "Corrida",
};

export function CommunityFeed({
  posts: initialPosts,
  activeTab = "explore",
}: CommunityFeedProps) {
  const router = useRouter();
  const [composerText, setComposerText] = useState("");
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null
  );
  const [replyingToComment, setReplyingToComment] = useState<{
    id: string;
    authorName: string;
    postId: string;
  } | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Moderação (Denúncia e Bloqueio sem alert/confirm nativo)
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: "post" | "comment" | "user";
    id: string;
    authorName: string;
    authorId: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState(
    "Spam ou publicidade indevida"
  );
  const [reportSuccess, setReportSuccess] = useState(false);

  const [blockTarget, setBlockTarget] = useState<{
    authorId: string;
    authorUsername: string;
  } | null>(null);

  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleTabChange = (newTab: string) => {
    router.push(`/comunidade?tab=${newTab}`);
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim()) return;

    startTransition(async () => {
      await createPost({
        contentText: composerText.trim(),
        postType: "general_post",
        visibility: "public",
      });
      setComposerText("");
    });
  };

  const handleReaction = (postId: string, reactionType: string) => {
    startTransition(async () => {
      await reactToPost(postId, reactionType);
    });
  };

  const handleAddComment = (postId: string) => {
    const text = commentInput[postId];
    if (!text || !text.trim()) return;

    const parentId =
      replyingToComment && replyingToComment.postId === postId
        ? replyingToComment.id
        : undefined;

    startTransition(async () => {
      await addComment(postId, text.trim(), parentId);
      setCommentInput((prev) => ({ ...prev, [postId]: "" }));
      setReplyingToComment(null);
    });
  };

  const confirmBlockAuthor = () => {
    if (!blockTarget) return;
    startTransition(async () => {
      await blockUser(blockTarget.authorId);
      setBlockTarget(null);
      setActiveMenuPostId(null);
    });
  };

  const handleShare = async (postId: string, authorUsername: string) => {
    const url = `${window.location.origin}/atleta/${authorUsername}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Selye · Registro Esportivo",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopiedPostId(postId);
        setTimeout(() => setCopiedPostId(null), 2000);
      }
    } catch {
      // Usuário cancelou compartilhamento
    }
  };

  const handleSendReport = () => {
    if (!reportTarget) return;

    startTransition(async () => {
      await reportContent({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        reason: reportReason,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setReportModalOpen(false);
        setReportTarget(null);
      }, 1600);
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full fade-up">
      {/* Navegação por Abas */}
      <div
        role="tablist"
        aria-label="Filtrar publicações do mural"
        className="flex bg-surface border border-line rounded-xl p-1 gap-1"
      >
        {[
          { id: "explore", label: "Explorar Mural" },
          { id: "teams", label: "Minhas Equipes" },
          { id: "following", label: "Seguindo" },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 h-10 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                active
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Compositor de Publicação */}
      <form onSubmit={handleCreatePost} className="card p-5 flex flex-col gap-3">
        <label htmlFor="community-composer" className="sr-only">
          Escrever publicação na comunidade
        </label>
        <textarea
          id="community-composer"
          rows={2}
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          placeholder="Compartilhe um aprendizado técnico, marco de consistência ou reflexão de treino..."
          className="input h-auto py-3 text-sm resize-y"
        />
        <div className="flex justify-between items-center pt-1">
          <span className="t-aux text-muted">
            Ambiente de apoio técnico · Sem vaidade
          </span>
          <button
            type="submit"
            disabled={isPending || !composerText.trim()}
            className="btn btn-primary h-10 px-4 text-xs"
          >
            <Send size={14} />
            <span>Publicar</span>
          </button>
        </div>
      </form>

      {/* Lista de Publicações */}
      {initialPosts.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center gap-2">
          <p className="font-semibold text-foreground text-sm">
            Nenhuma publicação encontrada nesta aba
          </p>
          <p className="text-muted text-xs max-w-sm">
            Conecte-se com outros atletas ou compartilhe sua primeira nota de treino acima.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {initialPosts.map((post) => (
            <article key={post.id} className="card p-5 sm:p-6 flex flex-col gap-4 relative">
              {/* Cabeçalho do Post */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/atleta/${post.authorUsername}`}
                    className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-semibold text-sm hover:opacity-90 transition-opacity shrink-0"
                  >
                    {post.authorName?.[0] || "A"}
                  </Link>
                  <div>
                    <Link
                      href={`/atleta/${post.authorUsername}`}
                      className="font-semibold text-sm text-foreground hover:underline"
                    >
                      {post.authorName}
                    </Link>
                    <p className="t-data text-xs text-muted">
                      @{post.authorUsername} ·{" "}
                      {new Date(post.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {post.postType === "workout_report" && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-lima text-grafite font-semibold">
                      PÓS-TREINO
                    </span>
                  )}

                  {/* Menu de Moderação */}
                  <div className="relative">
                    <button
                      type="button"
                      aria-label="Mais opções da publicação"
                      onClick={() =>
                        setActiveMenuPostId(
                          activeMenuPostId === post.id ? null : post.id
                        )
                      }
                      className="btn btn-ghost h-9 w-9 p-0"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {activeMenuPostId === post.id && (
                      <div className="absolute right-0 mt-1 w-48 rounded-xl border border-line bg-surface shadow-lg py-1.5 z-20 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setReportTarget({
                              type: "post",
                              id: post.id,
                              authorName: post.authorName,
                              authorId: post.userId,
                            });
                            setReportModalOpen(true);
                            setActiveMenuPostId(null);
                          }}
                          className="w-full text-left px-3.5 py-2 flex items-center gap-2 hover:bg-foreground/5 text-foreground cursor-pointer"
                        >
                          <Flag size={14} className="text-accent-text" />
                          <span>Denunciar publicação</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBlockTarget({
                              authorId: post.userId,
                              authorUsername: post.authorUsername,
                            });
                            setActiveMenuPostId(null);
                          }}
                          className="w-full text-left px-3.5 py-2 flex items-center gap-2 hover:bg-foreground/5 text-muted hover:text-foreground cursor-pointer border-t border-line"
                        >
                          <UserX size={14} />
                          <span>Bloquear @{post.authorUsername}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Texto da Publicação */}
              {post.contentText && (
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                  {post.contentText}
                </p>
              )}

              {/* Relatório Pós-Treino Integrado */}
              {post.workoutReport && (
                <div className="rounded-xl border border-line bg-foreground/[0.02] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="t-label !text-accent-text">
                      SELYE TRAINING REPORT
                    </span>
                    <span className="t-aux text-muted">
                      {MODALITY_LABELS[post.workoutReport.modality] ||
                        post.workoutReport.modality}
                    </span>
                  </div>

                  <h3 className="t-h3 text-foreground">
                    {post.workoutReport.title}
                  </h3>

                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="p-2.5 rounded-lg bg-surface border border-line text-center">
                      <span className="t-label block">Duração</span>
                      <p className="t-data text-sm font-semibold text-foreground mt-0.5">
                        {post.workoutReport.durationMinutes
                          ? `${post.workoutReport.durationMinutes} min`
                          : "45 min"}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface border border-line text-center">
                      <span className="t-label block">Esforço</span>
                      <p className="t-data text-sm font-semibold text-foreground mt-0.5">
                        RPE {post.workoutReport.rpe || 8}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface border border-line text-center">
                      <span className="t-label block">Status</span>
                      <p className="t-data text-sm font-semibold text-accent-text mt-0.5">
                        Concluído
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Barra de Reações e Comentários */}
              <div className="flex items-center justify-between pt-3 border-t border-line text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-pressed={post.userReaction === "like"}
                    onClick={() => handleReaction(post.id, "like")}
                    className={`h-9 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                      post.userReaction === "like"
                        ? "bg-lima text-grafite font-semibold"
                        : "bg-foreground/[0.04] text-muted hover:text-foreground"
                    }`}
                    title="Apoiar"
                  >
                    <ThumbsUp size={14} />
                    <span>{post.reactions?.length || 0}</span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={post.userReaction === "muscle"}
                    onClick={() => handleReaction(post.id, "muscle")}
                    className={`h-9 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                      post.userReaction === "muscle"
                        ? "bg-lima text-grafite font-semibold"
                        : "bg-foreground/[0.04] text-muted hover:text-foreground"
                    }`}
                    title="Força técnica"
                  >
                    <Dumbbell size={14} />
                  </button>

                  <button
                    type="button"
                    aria-pressed={post.userReaction === "fire"}
                    onClick={() => handleReaction(post.id, "fire")}
                    className={`h-9 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                      post.userReaction === "fire"
                        ? "bg-lima text-grafite font-semibold"
                        : "bg-foreground/[0.04] text-muted hover:text-foreground"
                    }`}
                    title="Constância"
                  >
                    <Flame size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveCommentPostId(
                        activeCommentPostId === post.id ? null : post.id
                      )
                    }
                    className="h-9 px-3 rounded-lg bg-foreground/[0.04] text-muted hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>{post.comments?.length || 0}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleShare(post.id, post.authorUsername)}
                  className="btn btn-ghost h-9 px-3 text-xs"
                >
                  {copiedPostId === post.id ? (
                    <>
                      <Check size={13} className="text-accent-text" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={13} />
                      <span>Compartilhar</span>
                    </>
                  )}
                </button>
              </div>

              {/* Comentários Aninhados */}
              {activeCommentPostId === post.id && (
                <div className="border-t border-line pt-3 flex flex-col gap-3">
                  {replyingToComment && replyingToComment.postId === post.id && (
                    <div className="flex items-center justify-between bg-foreground/5 px-3 py-1.5 rounded-lg text-xs text-accent-text">
                      <span className="flex items-center gap-1.5">
                        <CornerDownRight size={13} />
                        <span>
                          Respondendo a{" "}
                          <strong className="text-foreground">
                            {replyingToComment.authorName}
                          </strong>
                        </span>
                      </span>
                      <button
                        type="button"
                        aria-label="Cancelar resposta"
                        onClick={() => setReplyingToComment(null)}
                        className="text-muted hover:text-foreground cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentInput[post.id] || ""}
                      onChange={(e) =>
                        setCommentInput((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      placeholder={
                        replyingToComment && replyingToComment.postId === post.id
                          ? `Responder a ${replyingToComment.authorName}...`
                          : "Escreva um comentário construtivo..."
                      }
                      className="input h-10 text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddComment(post.id)}
                      className="btn btn-dark h-10 px-4 text-xs shrink-0"
                    >
                      Enviar
                    </button>
                  </div>

                  {post.comments && post.comments.length > 0 && (
                    <div className="flex flex-col gap-2 mt-1">
                      {post.comments.map((c: any) => {
                        const isReply = Boolean(c.parentCommentId);
                        return (
                          <div
                            key={c.id}
                            className={`text-xs p-3 rounded-lg border border-line/60 bg-foreground/[0.02] ${
                              isReply ? "ml-5 border-l-2 border-l-profundo" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Link
                                href={`/atleta/${c.authorUsername}`}
                                className="font-semibold text-foreground hover:underline"
                              >
                                {c.authorName}
                              </Link>
                              <button
                                type="button"
                                onClick={() =>
                                  setReplyingToComment({
                                    id: c.id,
                                    authorName: c.authorName,
                                    postId: post.id,
                                  })
                                }
                                className="text-xs text-muted hover:text-foreground flex items-center gap-1 cursor-pointer font-mono"
                              >
                                <CornerDownRight size={11} />
                                <span>Responder</span>
                              </button>
                            </div>
                            <p className="text-foreground/90 leading-relaxed">
                              {c.contentText}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Modal de Confirmação de Bloqueio (substitui confirm() nativo) */}
      {blockTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-noite/70 backdrop-blur-xs p-4"
        >
          <div className="card max-w-md w-full p-6 flex flex-col gap-4 shadow-xl fade-up">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-foreground">
                <UserX size={18} className="text-accent-text" />
                <h3 className="t-h3">Bloquear @{blockTarget.authorUsername}?</h3>
              </div>
              <button
                type="button"
                aria-label="Fechar confirmação"
                onClick={() => setBlockTarget(null)}
                className="btn btn-ghost h-8 w-8 p-0"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              As publicações e interações deste atleta deixarão de aparecer no seu mural esportivo imediatamente.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlockTarget(null)}
                className="btn btn-ghost h-10 px-4 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={confirmBlockAuthor}
                className="btn btn-dark h-10 px-4 text-xs"
              >
                {isPending ? "Bloqueando..." : "Confirmar Bloqueio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Denúncia */}
      {reportModalOpen && reportTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-noite/70 backdrop-blur-xs p-4"
        >
          <div className="card max-w-md w-full p-6 shadow-xl flex flex-col gap-4 fade-up">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-foreground">
                <Flag size={18} className="text-accent-text" />
                <h3 className="t-h3">Denunciar à Moderação</h3>
              </div>
              <button
                type="button"
                aria-label="Fechar denúncia"
                onClick={() => setReportModalOpen(false)}
                className="btn btn-ghost h-8 w-8 p-0"
              >
                <X size={16} />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 size={36} className="text-accent-text" />
                <h4 className="font-semibold text-sm text-foreground">
                  Denúncia Registrada
                </h4>
                <p className="text-xs text-muted">
                  Nossa equipe revisará esta ocorrência conforme as diretrizes da comunidade.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted">
                  Selecione o motivo da denúncia para o conteúdo de{" "}
                  <strong className="text-foreground">
                    {reportTarget.authorName}
                  </strong>
                  :
                </p>

                <div className="flex flex-col gap-2">
                  {[
                    "Spam ou publicidade indevida",
                    "Conteúdo tóxico ou desrespeito esportivo",
                    "Assédio ou discriminação",
                    "Informação física ou de saúde enganosa",
                    "Outro motivo",
                  ].map((reason) => (
                    <label
                      key={reason}
                      className="flex items-center gap-2.5 text-xs p-3 rounded-lg border border-line bg-foreground/[0.02] cursor-pointer hover:bg-foreground/[0.05]"
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        checked={reportReason === reason}
                        onChange={() => setReportReason(reason)}
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="btn btn-ghost h-10 px-4 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendReport}
                    disabled={isPending}
                    className="btn btn-primary h-10 px-4 text-xs"
                  >
                    Confirmar Denúncia
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
