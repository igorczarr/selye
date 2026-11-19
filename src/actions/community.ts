"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { getOrCreateDemoUser } from "./workout";
import {
  extractHashtags,
  normalizeHashtag,
  computeTrendingHashtags,
  type TrendingTag,
} from "@/core/social/text-parser";

export type CommunityFilter = "explore" | "following" | "teams" | "threads";

export interface CreatePostInput {
  contentText?: string;
  postType?: "workout_report" | "general_post" | "team_announcement" | "group_thread";
  sessionId?: string;
  teamId?: string;
  visibility?: "public" | "followers" | "team_only" | "private";
  mediaUrls?: string[];
}

/**
 * Cria uma publicação esportiva, relatório pós-treino ou fio de discussão (thread) em grupo.
 */
export async function createPost(input: CreatePostInput) {
  const user = await getOrCreateDemoUser();

  const resolvedType =
    input.postType || (input.sessionId ? "workout_report" : "general_post");

  const [post] = await db
    .insert(schema.posts)
    .values({
      userId: user.id,
      teamId: input.teamId || null,
      sessionId: input.sessionId || null,
      postType: resolvedType,
      contentText: input.contentText?.trim() || "",
      mediaUrls: (input.mediaUrls || []).filter((u) => u.trim().length > 0),
      visibility: input.visibility || (input.teamId ? "team_only" : "public"),
    })
    .returning();

  revalidatePath("/comunidade");
  revalidatePath("/");
  return post;
}

/**
 * Adiciona, troca ou remove reação a uma publicação mantendo `likesCount` exato (corrige bug antigo).
 */
export async function reactToPost(postId: string, reactionType: string = "like") {
  const user = await getOrCreateDemoUser();

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
      await db
        .delete(schema.reactions)
        .where(eq(schema.reactions.id, existing.id));
    } else {
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

  // Recalcula contagem real de reações para evitar drift
  const remaining = await db
    .select({ id: schema.reactions.id })
    .from(schema.reactions)
    .where(eq(schema.reactions.postId, postId));

  await db
    .update(schema.posts)
    .set({ likesCount: remaining.length, updatedAt: new Date() })
    .where(eq(schema.posts.id, postId));

  revalidatePath("/comunidade");
}

/**
 * Adiciona comentário ou resposta aninhada (thread 2 níveis via `parentCommentId`) e atualiza `commentsCount`.
 */
export async function addComment(
  postId: string,
  contentText: string,
  parentCommentId?: string
) {
  const user = await getOrCreateDemoUser();
  const clean = contentText.trim();
  if (!clean) throw new Error("Escreva uma mensagem antes de comentar.");

  const [comment] = await db
    .insert(schema.comments)
    .values({
      postId,
      userId: user.id,
      contentText: clean,
      parentCommentId: parentCommentId || null,
    })
    .returning();

  const allComments = await db
    .select({ id: schema.comments.id })
    .from(schema.comments)
    .where(eq(schema.comments.postId, postId));

  await db
    .update(schema.posts)
    .set({ commentsCount: allComments.length, updatedAt: new Date() })
    .where(eq(schema.posts.id, postId));

  revalidatePath("/comunidade");
  return comment;
}

/**
 * Carrega o feed completo da Comunidade sem queries N+1 (agregação em lote com `inArray`),
 * incluindo hashtags em alta (7d), equipes do atleta, treinos recentes para anexo e desafios ativos.
 */
export async function getCommunityHubData(options?: {
  filter?: CommunityFilter;
  tag?: string;
}) {
  try {
    await connection();
  } catch {
    // fora de requisição HTTP
  }

  const filter: CommunityFilter = options?.filter || "explore";
  const normalizedTag = options?.tag ? normalizeHashtag(options.tag) : "";
  const currentUser = await getOrCreateDemoUser();

  // 1. Carregamento paralelo de bloqueios, relacionamentos, equipes, treinos recentes e desafios
  const [
    blockedRows,
    blockedByRows,
    followingRows,
    userTeamRows,
    recentWorkoutsRows,
    activeChallengesRows,
    rawPosts,
  ] = await Promise.all([
    db
      .select({ blockedId: schema.userBlocks.blockedUserId })
      .from(schema.userBlocks)
      .where(eq(schema.userBlocks.blockerUserId, currentUser.id)),
    db
      .select({ blockerId: schema.userBlocks.blockerUserId })
      .from(schema.userBlocks)
      .where(eq(schema.userBlocks.blockedUserId, currentUser.id)),
    db
      .select({ followingId: schema.follows.followingId })
      .from(schema.follows)
      .where(
        and(
          eq(schema.follows.followerId, currentUser.id),
          eq(schema.follows.status, "accepted")
        )
      ),
    db
      .select({
        teamId: schema.teamMemberships.teamId,
        teamName: schema.teams.name,
        teamSlug: schema.teams.slug,
      })
      .from(schema.teamMemberships)
      .innerJoin(schema.teams, eq(schema.teamMemberships.teamId, schema.teams.id))
      .where(
        and(
          eq(schema.teamMemberships.userId, currentUser.id),
          eq(schema.teamMemberships.status, "active")
        )
      ),
    db
      .select({
        id: schema.workoutSessions.id,
        title: schema.workoutSessions.title,
        modalityCode: schema.workoutSessions.modalityCode,
        startedAt: schema.workoutSessions.startedAt,
        finishedAt: schema.workoutSessions.finishedAt,
        rpeSession: schema.workoutSessions.rpeSession,
      })
      .from(schema.workoutSessions)
      .where(
        and(
          eq(schema.workoutSessions.userId, currentUser.id),
          eq(schema.workoutSessions.status, "completed")
        )
      )
      .orderBy(desc(schema.workoutSessions.finishedAt))
      .limit(8),
    db
      .select({
        id: schema.challenges.id,
        title: schema.challenges.title,
        challengeType: schema.challenges.challengeType,
        targetValue: schema.challenges.targetValue,
        endDate: schema.challenges.endDate,
      })
      .from(schema.challenges)
      .where(eq(schema.challenges.isActive, true))
      .orderBy(desc(schema.challenges.createdAt))
      .limit(3),
    db
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
      .limit(80),
  ]);

  const blockedUserIds = new Set<string>([
    ...blockedRows.map((r) => r.blockedId),
    ...blockedByRows.map((r) => r.blockerId),
  ]);

  const followingUserIds = new Set<string>(
    followingRows.map((r) => r.followingId)
  );
  followingUserIds.add(currentUser.id);

  const userTeamIds = new Set<string>(userTeamRows.map((r) => r.teamId));

  // Posts visíveis (sem usuários bloqueados)
  const nonBlockedPosts = rawPosts.filter((p) => !blockedUserIds.has(p.userId));

  // Trending hashtags dos últimos 7 dias sobre todos os posts visíveis
  const trendingTags: TrendingTag[] = computeTrendingHashtags(nonBlockedPosts, {
    windowDays: 7,
    limit: 8,
  });

  // Filtragem por aba e/ou hashtag
  let visiblePosts = nonBlockedPosts;
  if (filter === "following") {
    visiblePosts = visiblePosts.filter((p) => followingUserIds.has(p.userId));
  } else if (filter === "teams") {
    visiblePosts = visiblePosts.filter(
      (p) => p.teamId && userTeamIds.has(p.teamId)
    );
  } else if (filter === "threads") {
    visiblePosts = visiblePosts.filter(
      (p) =>
        p.postType === "group_thread" || p.postType === "team_announcement"
    );
  }

  if (normalizedTag) {
    visiblePosts = visiblePosts.filter((p) =>
      extractHashtags(p.contentText).includes(normalizedTag)
    );
  }

  const postIds = visiblePosts.map((p) => p.id);
  const sessionIds = Array.from(
    new Set(visiblePosts.map((p) => p.sessionId).filter(Boolean) as string[])
  );
  const teamIds = Array.from(
    new Set(visiblePosts.map((p) => p.teamId).filter(Boolean) as string[])
  );

  // 2. Consultas agregadas em lote (elimina N+1!)
  const [
    allReactions,
    allComments,
    linkedSessions,
    linkedMetrics,
    linkedTeams,
    challengeParticipantsRows,
  ] = await Promise.all([
    postIds.length > 0
      ? db
          .select()
          .from(schema.reactions)
          .where(inArray(schema.reactions.postId, postIds))
      : Promise.resolve([]),
    postIds.length > 0
      ? db
          .select({
            id: schema.comments.id,
            postId: schema.comments.postId,
            parentCommentId: schema.comments.parentCommentId,
            contentText: schema.comments.contentText,
            createdAt: schema.comments.createdAt,
            authorName: schema.users.name,
            authorUsername: schema.users.username,
            authorAvatar: schema.users.avatarUrl,
          })
          .from(schema.comments)
          .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
          .where(inArray(schema.comments.postId, postIds))
          .orderBy(schema.comments.createdAt)
      : Promise.resolve([]),
    sessionIds.length > 0
      ? db
          .select()
          .from(schema.workoutSessions)
          .where(inArray(schema.workoutSessions.id, sessionIds))
      : Promise.resolve([]),
    sessionIds.length > 0
      ? db
          .select()
          .from(schema.sessionMetrics)
          .where(inArray(schema.sessionMetrics.sessionId, sessionIds))
      : Promise.resolve([]),
    teamIds.length > 0
      ? db
          .select({
            id: schema.teams.id,
            name: schema.teams.name,
            slug: schema.teams.slug,
          })
          .from(schema.teams)
          .where(inArray(schema.teams.id, teamIds))
      : Promise.resolve([]),
    activeChallengesRows.length > 0
      ? db
          .select({ challengeId: schema.challengeParticipants.challengeId })
          .from(schema.challengeParticipants)
          .where(
            inArray(
              schema.challengeParticipants.challengeId,
              activeChallengesRows.map((c) => c.id)
            )
          )
      : Promise.resolve([]),
  ]);

  const reactionsByPost = new Map<string, typeof allReactions>();
  for (const r of allReactions) {
    const list = reactionsByPost.get(r.postId) || [];
    list.push(r);
    reactionsByPost.set(r.postId, list);
  }

  const commentsByPost = new Map<string, typeof allComments>();
  for (const c of allComments) {
    const list = commentsByPost.get(c.postId) || [];
    list.push(c);
    commentsByPost.set(c.postId, list);
  }

  const sessionsById = new Map(linkedSessions.map((s) => [s.id, s]));
  const metricsBySession = new Map<string, typeof linkedMetrics>();
  for (const m of linkedMetrics) {
    const list = metricsBySession.get(m.sessionId) || [];
    list.push(m);
    metricsBySession.set(m.sessionId, list);
  }
  const teamsById = new Map(linkedTeams.map((t) => [t.id, t]));

  const participantsCountByChallenge = new Map<string, number>();
  for (const cp of challengeParticipantsRows) {
    participantsCountByChallenge.set(
      cp.challengeId,
      (participantsCountByChallenge.get(cp.challengeId) || 0) + 1
    );
  }

  const enrichedPosts = visiblePosts.map((p) => {
    const postReactions = reactionsByPost.get(p.id) || [];
    const userReaction = postReactions.find((r) => r.userId === currentUser.id);
    const postComments = commentsByPost.get(p.id) || [];
    const team = p.teamId ? teamsById.get(p.teamId) || null : null;

    let workoutReport = null;
    if (p.sessionId) {
      const sess = sessionsById.get(p.sessionId);
      if (sess) {
        workoutReport = {
          title: sess.title,
          modality: sess.modalityCode,
          startedAt: sess.startedAt,
          finishedAt: sess.finishedAt,
          durationMinutes: sess.finishedAt
            ? Math.max(
                10,
                Math.round(
                  (new Date(sess.finishedAt).getTime() -
                    new Date(sess.startedAt).getTime()) /
                    60000
                )
              )
            : null,
          rpe: sess.rpeSession,
          metrics: metricsBySession.get(sess.id) || [],
        };
      }
    }

    return {
      ...p,
      teamName: team?.name || null,
      teamSlug: team?.slug || null,
      hashtags: extractHashtags(p.contentText),
      userReaction: userReaction?.reactionType || null,
      reactions: postReactions,
      comments: postComments,
      workoutReport,
    };
  });

  return {
    currentUserId: currentUser.id,
    posts: enrichedPosts,
    trendingTags,
    userTeams: userTeamRows,
    recentWorkouts: recentWorkoutsRows.map((w) => ({
      id: w.id,
      title: w.title,
      modalityCode: w.modalityCode,
      dateLabel: new Date(w.finishedAt || w.startedAt).toLocaleDateString(
        "pt-BR"
      ),
      rpe: w.rpeSession || 8,
    })),
    activeChallenges: activeChallengesRows.map((c) => ({
      ...c,
      participantsCount: participantsCountByChallenge.get(c.id) || 0,
    })),
  };
}

/** Compatibilidade com chamadas legadas */
export async function getCommunityFeed(
  filter: CommunityFilter = "explore"
) {
  const hub = await getCommunityHubData({ filter });
  return hub.posts;
}
