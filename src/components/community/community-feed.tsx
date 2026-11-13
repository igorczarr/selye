"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createPost, reactToPost, addComment } from "@/actions/community";
import { blockUser, reportContent } from "@/actions/network";
import {
  MessageSquare,
  Flame,
  ThumbsUp,
  Send,
  Share2,
  MoreHorizontal,
  Flag,
  UserX,
  CornerDownRight,
  X,
  CheckCircle2,
} from "lucide-react";

interface CommunityFeedProps {
  posts: any[];
  activeTab?: "explore" | "teams" | "following";
}

export function CommunityFeed({
  posts: initialPosts,
  activeTab = "explore",
}: CommunityFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [composerText, setComposerText] = useState("");
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [replyingToComment, setReplyingToComment] = useState<{
    id: string;
    authorName: string;
    postId: string;
  } | null>(null);

  // Moderação
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: "post" | "comment" | "user";
    id: string;
    authorName: string;
    authorId: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState("Spam ou publicidade indevida");
  const [reportSuccess, setReportSuccess] = useState(false);

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
        contentText: composerText,
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
      await addComment(postId, text, parentId);
      setCommentInput((prev) => ({ ...prev, [postId]: "" }));
      setReplyingToComment(null);
    });
  };

  const handleBlockAuthor = (authorId: string, authorName: string) => {
    if (confirm(`Deseja realmente bloquear @${authorName}? O conteúdo deste usuário não será mais exibido no seu feed.`)) {
      startTransition(async () => {
        await blockUser(authorId);
        setActiveMenuPostId(null);
        setReportModalOpen(false);
      });
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
      }, 1800);
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      {/* Abas do Feed (§11.1) */}
      <div className="flex border-b border-line bg-surface rounded-t-lg p-1.5 gap-1 shadow-xs">
        {[
          { id: "explore", label: "Explorar Mural" },
          { id: "teams", label: "Minhas Equipes" },
          { id: "following", label: "Seguindo" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "bg-grafite text-osso shadow-xs"
                : "text-muted hover:text-grafite hover:bg-osso/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Caixa de Publicação de Comunidade */}
      <form
        onSubmit={handleCreatePost}
        className="rounded-lg border border-line bg-surface p-4 flex flex-col gap-3 shadow-xs"
      >
        <textarea
          rows={2}
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          placeholder="Compartilhe um aprendizado técnico, resultado ou mensagem de consistência..."
          className="w-full p-3 rounded-md border border-line bg-background text-sm focus:outline-none focus:ring-1 focus:ring-profundo"
        />
        <div className="flex justify-between items-center">
          <span className="t-aux text-muted">Apoio mútuo e sem espetáculo</span>
          <button
            type="submit"
            disabled={isPending || !composerText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-grafite text-osso font-semibold text-xs hover:bg-noite disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Send size={13} />
            <span>Publicar</span>
          </button>
        </div>
      </form>

      {/* Lista de Publicações */}
      {initialPosts.length === 0 ? (
        <div className="py-16 text-center text-muted text-sm border border-line rounded-lg bg-surface p-6">
          Nenhuma publicação encontrada nesta aba. Conecte-se com mais atletas ou compartilhe seu treino!
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {initialPosts.map((post) => (
            <article
              key={post.id}
              className="rounded-lg border border-line bg-surface p-5 flex flex-col gap-4 shadow-xs relative"
            >
              {/* Cabeçalho do Post */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/atleta/${post.authorUsername}`}
                    className="w-10 h-10 rounded-full bg-grafite text-osso flex items-center justify-center font-bold text-sm hover:opacity-90 transition-opacity"
                  >
                    {post.authorName?.[0] || "A"}
                  </Link>
                  <div>
                    <Link
                      href={`/atleta/${post.authorUsername}`}
                      className="font-semibold text-sm hover:underline text-grafite"
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
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-lima text-grafite font-bold">
                      PÓS-TREINO
                    </span>
                  )}

                  {/* Menu de Moderação / Opções */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuPostId(
                          activeMenuPostId === post.id ? null : post.id
                        )
                      }
                      className="p-1 rounded text-muted hover:text-grafite hover:bg-osso transition-colors cursor-pointer"
                      title="Opções"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {activeMenuPostId === post.id && (
                      <div className="absolute right-0 mt-1 w-48 rounded-md border border-line bg-surface shadow-md py-1 z-20 text-xs">
                        <button
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
                          className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-osso text-amber-700 cursor-pointer"
                        >
                          <Flag size={13} />
                          <span>Denunciar publicação</span>
                        </button>
                        <button
                          onClick={() =>
                            handleBlockAuthor(post.userId, post.authorUsername)
                          }
                          className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-osso text-red-600 cursor-pointer border-t border-line/50"
                        >
                          <UserX size={13} />
                          <span>Bloquear atleta</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Conteúdo em Texto */}
              {post.contentText && (
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                  {post.contentText}
                </p>
              )}

              {/* Card de Relatório de Treinamento (§11.3 & §12.2 O Ritual do PÓS) */}
              {post.workoutReport && (
                <div className="rounded-md border border-line bg-osso/30 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-line/60 pb-2">
                    <span className="t-label !text-profundo">SELYE TRAINING REPORT</span>
                    <span className="t-aux text-muted">
                      Modalidade: {post.workoutReport.modality}
                    </span>
                  </div>

                  <h4 className="t-h3">{post.workoutReport.title}</h4>

                  <div className="grid grid-cols-3 gap-2 py-1">
                    <div className="p-2 rounded bg-surface border border-line/70 text-center">
                      <span className="t-label !text-[9px]">Duração</span>
                      <p className="t-data text-base font-semibold">
                        {post.workoutReport.durationMinutes
                          ? `${post.workoutReport.durationMinutes} min`
                          : "48 min"}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-surface border border-line/70 text-center">
                      <span className="t-label !text-[9px]">Intensidade</span>
                      <p className="t-data text-base font-semibold">
                        RPE {post.workoutReport.rpe || 8}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-surface border border-line/70 text-center">
                      <span className="t-label !text-[9px]">Status</span>
                      <p className="t-data text-base font-semibold text-profundo">
                        Concluído
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Barra de Interação e Reações (§11.2) */}
              <div className="flex items-center justify-between pt-2 border-t border-line text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleReaction(post.id, "like")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      post.userReaction === "like"
                        ? "bg-profundo/10 text-profundo font-bold border border-profundo/30"
                        : "hover:bg-osso text-muted hover:text-grafite"
                    }`}
                  >
                    <ThumbsUp size={14} />
                    <span>{post.reactions?.length || 0}</span>
                  </button>

                  <button
                    onClick={() => handleReaction(post.id, "muscle")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      post.userReaction === "muscle"
                        ? "bg-amber-100/50 border border-amber-300"
                        : "hover:bg-osso"
                    }`}
                    title="Músculo"
                  >
                    <span>💪</span>
                  </button>

                  <button
                    onClick={() => handleReaction(post.id, "fire")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      post.userReaction === "fire"
                        ? "bg-amber-100/50 border border-amber-300"
                        : "hover:bg-osso text-muted hover:text-grafite"
                    }`}
                    title="Fogo"
                  >
                    <Flame size={14} className="text-amber-600" />
                  </button>

                  <button
                    onClick={() =>
                      setActiveCommentPostId(
                        activeCommentPostId === post.id ? null : post.id
                      )
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-osso transition-colors text-muted hover:text-grafite cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>{post.comments?.length || 0}</span>
                  </button>
                </div>

                <button className="flex items-center gap-1 text-muted hover:text-grafite cursor-pointer">
                  <Share2 size={13} />
                  <span>Compartilhar</span>
                </button>
              </div>

              {/* Seção de Comentários Aninhados (§11.2) */}
              {activeCommentPostId === post.id && (
                <div className="border-t border-line pt-3 flex flex-col gap-3">
                  {/* Indicador de Resposta Aninhada */}
                  {replyingToComment && replyingToComment.postId === post.id && (
                    <div className="flex items-center justify-between bg-osso/50 px-2.5 py-1 rounded text-[11px] text-profundo">
                      <span className="flex items-center gap-1">
                        <CornerDownRight size={12} />
                        Respondendo a <strong>{replyingToComment.authorName}</strong>
                      </span>
                      <button
                        onClick={() => setReplyingToComment(null)}
                        className="text-muted hover:text-grafite"
                      >
                        <X size={12} />
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
                          : "Deixe um incentivo técnico ou comentário..."
                      }
                      className="flex-1 h-9 px-3 rounded border border-line bg-background text-xs focus:outline-none focus:ring-1 focus:ring-profundo"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      className="h-9 px-3 rounded bg-grafite text-osso font-semibold text-xs hover:bg-noite cursor-pointer"
                    >
                      Enviar
                    </button>
                  </div>

                  {post.comments && post.comments.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2">
                      {post.comments.map((c: any) => {
                        const isReply = !!c.parentCommentId;
                        return (
                          <div
                            key={c.id}
                            className={`text-xs p-2.5 rounded ${
                              isReply
                                ? "bg-osso/20 ml-5 border-l-2 border-profundo/50"
                                : "bg-osso/30"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Link
                                href={`/atleta/${c.authorUsername}`}
                                className="font-semibold text-grafite hover:underline"
                              >
                                {c.authorName}
                              </Link>
                              <button
                                onClick={() =>
                                  setReplyingToComment({
                                    id: c.id,
                                    authorName: c.authorName,
                                    postId: post.id,
                                  })
                                }
                                className="text-[10px] text-muted hover:text-profundo flex items-center gap-1 cursor-pointer"
                              >
                                <CornerDownRight size={10} />
                                <span>Responder</span>
                              </button>
                            </div>
                            <span className="text-foreground">{c.contentText}</span>
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

      {/* Modal de Moderação e Denúncia (§11.5) */}
      {reportModalOpen && reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface border border-line rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-amber-700">
                <Flag size={18} />
                <h3 className="font-semibold text-sm">Denunciar à Moderação</h3>
              </div>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-muted hover:text-grafite"
              >
                <X size={16} />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 size={36} className="text-profundo" />
                <h4 className="font-semibold text-sm">Denúncia Recebida</h4>
                <p className="text-xs text-muted">
                  Nossa equipe de moderação avaliará a denúncia em conformidade com as diretrizes da comunidade SELYE.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted">
                  Você está denunciando o conteúdo de <strong>{reportTarget.authorName}</strong>. Selecione o motivo:
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
                      className="flex items-center gap-2 text-xs p-2 rounded border border-line/60 bg-osso/20 cursor-pointer hover:bg-osso/50"
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
                    onClick={() => setReportModalOpen(false)}
                    className="px-3 py-1.5 rounded text-xs text-muted hover:text-grafite"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendReport}
                    disabled={isPending}
                    className="px-4 py-2 rounded bg-amber-700 text-white font-semibold text-xs hover:bg-amber-800 cursor-pointer"
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