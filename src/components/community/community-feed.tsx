"use client";

import { useState, useTransition } from "react";
import { createPost, reactToPost, addComment } from "@/actions/community";
import { MessageSquare, Flame, ThumbsUp, Dumbbell, Send, Share2 } from "lucide-react";

interface CommunityFeedProps {
  posts: any[];
}

export function CommunityFeed({ posts: initialPosts }: CommunityFeedProps) {
  const [activeTab, setActiveTab] = useState<"explore" | "teams" | "following">("explore");
  const [composerText, setComposerText] = useState("");
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

    startTransition(async () => {
      await addComment(postId, text);
      setCommentInput((prev) => ({ ...prev, [postId]: "" }));
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      {/* Abas do Feed (§11.1) */}
      <div className="flex border-b border-line bg-surface rounded-t-lg p-1.5 gap-1">
        {[
          { id: "explore", label: "Explorar" },
          { id: "teams", label: "Minhas Equipes" },
          { id: "following", label: "Seguindo" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "bg-grafite text-osso"
                : "text-muted hover:text-grafite hover:bg-osso/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Caixa de Publicação de Comunidade */}
      <form onSubmit={handleCreatePost} className="rounded-lg border border-line bg-surface p-4 flex flex-col gap-3 shadow-xs">
        <textarea
          rows={2}
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          placeholder="Compartilhe um aprendizado, resultado ou mensagem com a comunidade..."
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
          Nenhuma publicação no feed ainda. Seja o primeiro a compartilhar seu pós-treino!
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {initialPosts.map((post) => (
            <article
              key={post.id}
              className="rounded-lg border border-line bg-surface p-5 flex flex-col gap-4 shadow-xs"
            >
              {/* Cabeçalho do Post */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-grafite text-osso flex items-center justify-center font-bold text-sm">
                    {post.authorName?.[0] || "A"}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{post.authorName}</h4>
                    <p className="t-data text-xs text-muted">
                      @{post.authorUsername} · {new Date(post.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                {post.postType === "workout_report" && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-lima text-grafite font-bold">
                    PÓS-TREINO
                  </span>
                )}
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
                    <span className="t-aux text-muted">Modalidade: {post.workoutReport.modality}</span>
                  </div>

                  <h4 className="t-h3">{post.workoutReport.title}</h4>

                  <div className="grid grid-cols-3 gap-2 py-1">
                    <div className="p-2 rounded bg-surface border border-line/70 text-center">
                      <span className="t-label !text-[9px]">Duração</span>
                      <p className="t-data text-base font-semibold">
                        {post.workoutReport.durationMinutes ? `${post.workoutReport.durationMinutes} min` : "48 min"}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-surface border border-line/70 text-center">
                      <span className="t-label !text-[9px]">Intensidade</span>
                      <p className="t-data text-base font-semibold">RPE {post.workoutReport.rpe || 8}</p>
                    </div>
                    <div className="p-2 rounded bg-surface border border-line/70 text-center">
                      <span className="t-label !text-[9px]">Status</span>
                      <p className="t-data text-base font-semibold text-profundo">Concluído</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Barra de Interação e Reações (§11.2) */}
              <div className="flex items-center justify-between pt-2 border-t border-line text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleReaction(post.id, "like")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-osso transition-colors text-muted hover:text-grafite cursor-pointer"
                  >
                    <ThumbsUp size={14} />
                    <span>{post.reactions?.length || 0}</span>
                  </button>

                  <button
                    onClick={() => handleReaction(post.id, "muscle")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-osso transition-colors text-muted hover:text-grafite cursor-pointer"
                    title="Músculo"
                  >
                    <span>💪</span>
                  </button>

                  <button
                    onClick={() => handleReaction(post.id, "fire")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-osso transition-colors text-muted hover:text-grafite cursor-pointer"
                    title="Fogo"
                  >
                    <Flame size={14} className="text-amber-600" />
                  </button>

                  <button
                    onClick={() =>
                      setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)
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

              {/* Seção de Comentários */}
              {activeCommentPostId === post.id && (
                <div className="border-t border-line pt-3 flex flex-col gap-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentInput[post.id] || ""}
                      onChange={(e) =>
                        setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      placeholder="Deixe um incentivo ou comentário..."
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
                      {post.comments.map((c: any) => (
                        <div key={c.id} className="text-xs bg-osso/30 p-2.5 rounded">
                          <span className="font-semibold text-grafite">{c.authorName}: </span>
                          <span className="text-foreground">{c.contentText}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
