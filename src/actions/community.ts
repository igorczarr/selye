"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getOrCreateDemoUser } from "./workout";

export interface CreatePostInput {
  contentText?: string;
  postType?: string; // 'workout_report', 'general_post', 'team_announcement'
  sessionId?: string;
  teamId?: string;
  visibility?: string; // 'public', 'followers', 'team_only', 'private'
  mediaUrls?: string[];
}

/**
 * Cria uma publicação esportiva no Feed ou no Ritual do PÓS (§11 e §12)
 */
export async function createPost(input: CreatePostInput) {
  const user = await getOrCreateDemoUser();

  const [post] = await db
    .insert(schema.posts)
    .values({
      userId: user.id,
      teamId: input.teamId,
      sessionId: input.sessionId,
      postType: input.postType || (input.sessionId ? "workout_report" : "general_post"),
      contentText: input.contentText,
      mediaUrls: input.mediaUrls || [],
      visibility: input.visibility || "team_only",
    })
    .returning();

  revalidatePath("/comunidade");
  revalidatePath("/");
  return post;
}

/**
 * Adiciona reação a uma publicação (§11.2: curtir, aplauso, fogo, músculo)
 */
export async function reactToPost(postId: string, reactionType: string = "like") {
  const user = await getOrCreateDemoUser();

  // Verifica se já reagiu com esse tipo
  const [existing] = await db
    .select()
    .from(schema.reactions)
    .where(
      and(
        eq(schema.reactions.postId, postId),
        eq(schema.reactions.userId, user.id)
      )
    )
    .limit(1);

  if (existing) {
    if (existing.reactionType === reactionType) {
      // Remove reação (toggle)
      await db.delete(schema.reactions).where(eq(schema.reactions.id, existing.id));
      await db
        .update(schema.posts)
        .set({ likesCount: schema.posts.likesCount }) // decrement
        .where(eq(schema.posts.id, postId));
    } else {
      // Atualiza o tipo
      await db
        .update(schema.reactions)
        .set({ reactionType })
        .where(eq(schema.reactions.id, existing.id));
    }
  } else {
    await db.insert(schema.reactions).values({
      postId,
      userId: user.id,
      reactionType,
    });
  }

  revalidatePath("/comunidade");
}

/**
 * Adiciona comentário a uma publicação
 */
export async function addComment(postId: string, contentText: string, parentCommentId?: string) {
  const user = await getOrCreateDemoUser();

  const [comment] = await db
    .insert(schema.comments)
    .values({
      postId,
      userId: user.id,
      contentText,
      parentCommentId,
    })
    .returning();

  revalidatePath("/comunidade");
  return comment;
}

/**
 * Retorna o Feed com suporte a filtragem por tipo e dados de sessão vinculada
 */
export async function getCommunityFeed(filter: "following" | "teams" | "explore" = "explore") {
  const posts = await db
    .select({
      id: schema.posts.id,
      userId: schema.posts.userId,
      teamId: schema.posts.teamId,
      sessionId: schema.posts.sessionId,
      postType: schema.posts.postType,
      contentText: schema.posts.contentText,
      mediaUrls: schema.posts.mediaUrls,
      visibility: schema.posts.visibility,
      likesCount: schema.posts.likesCount,
      commentsCount: schema.posts.commentsCount,
      createdAt: schema.posts.createdAt,
      authorName: schema.users.name,
      authorUsername: schema.users.username,
      authorAvatar: schema.users.avatarUrl,
    })
    .from(schema.posts)
    .innerJoin(schema.users, eq(schema.posts.userId, schema.users.id))
    .orderBy(desc(schema.posts.createdAt))
    .limit(20);

  const enrichedPosts = await Promise.all(
    posts.map(async (p) => {
      // Reações
      const postReactions = await db
        .select()
        .from(schema.reactions)
        .where(eq(schema.reactions.postId, p.id));

      // Comentários
      const postComments = await db
        .select({
          id: schema.comments.id,
          contentText: schema.comments.contentText,
          createdAt: schema.comments.createdAt,
          authorName: schema.users.name,
          authorUsername: schema.users.username,
        })
        .from(schema.comments)
        .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
        .where(eq(schema.comments.postId, p.id))
        .orderBy(desc(schema.comments.createdAt))
        .limit(5);

      // Dados do treino se for relatório de treino (§11.3)
      let workoutReport = null;
      if (p.sessionId) {
        const [sess] = await db
          .select()
          .from(schema.workoutSessions)
          .where(eq(schema.workoutSessions.id, p.sessionId))
          .limit(1);

        if (sess) {
          const metrics = await db
            .select()
            .from(schema.sessionMetrics)
            .where(eq(schema.sessionMetrics.sessionId, sess.id));

          workoutReport = {
            title: sess.title,
            modality: sess.modalityCode,
            startedAt: sess.startedAt,
            finishedAt: sess.finishedAt,
            durationMinutes: sess.finishedAt
              ? Math.round((new Date(sess.finishedAt).getTime() - new Date(sess.startedAt).getTime()) / 60000)
              : null,
            rpe: sess.rpeSession,
            metrics,
          };
        }
      }

      return {
        ...p,
        reactions: postReactions,
        comments: postComments,
        workoutReport,
      };
    })
  );

  return enrichedPosts;
}
