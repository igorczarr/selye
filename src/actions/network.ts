"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and, or, ilike, ne, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getOrCreateDemoUser } from "./workout";
import { dispatchSmartNotification } from "./notifications";

/**
 * Descoberta de Atletas (§11.1 e §11.4 do briefing)
 * Sugere atletas com base em modalidades compartilhadas, busca textual e equipes.
 */
export async function getAthletesDiscovery(options?: {
  query?: string;
  sportCode?: string;
}) {
  const currentUser = await getOrCreateDemoUser();

  // Usuários bloqueados pelo usuário atual
  const blockedRows = await db
    .select({ blockedId: schema.userBlocks.blockedUserId })
    .from(schema.userBlocks)
    .where(eq(schema.userBlocks.blockerUserId, currentUser.id));

  const blockedUserIds = new Set(blockedRows.map((r) => r.blockedId));

  // Usuários que bloquearam o usuário atual
  const blockedByRows = await db
    .select({ blockerId: schema.userBlocks.blockerUserId })
    .from(schema.userBlocks)
    .where(eq(schema.userBlocks.blockedUserId, currentUser.id));

  for (const r of blockedByRows) {
    blockedUserIds.add(r.blockerId);
  }

  // Quem o usuário atual já segue
  const followingRows = await db
    .select({ followingId: schema.follows.followingId })
    .from(schema.follows)
    .where(
      and(
        eq(schema.follows.followerId, currentUser.id),
        eq(schema.follows.status, "accepted")
      )
    );

  const followingIds = new Set(followingRows.map((r) => r.followingId));

  // Busca todos os usuários excluindo a si mesmo
  const baseUsers = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      username: schema.users.username,
      avatarUrl: schema.users.avatarUrl,
      bio: schema.users.bio,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(ne(schema.users.id, currentUser.id))
    .orderBy(desc(schema.users.createdAt));

  // Filtrar usuários bloqueados
  const candidateUsers = baseUsers.filter((u) => !blockedUserIds.has(u.id));

  // Enriquecer com modalidades, streaks e status de follow
  const enriched = await Promise.all(
    candidateUsers.map(async (u) => {
      // Modalidades do atleta
      const athleteSports = await db
        .select({
          code: schema.sports.code,
          namePt: schema.sports.namePt,
          icon: schema.sports.icon,
        })
        .from(schema.userSports)
        .innerJoin(schema.sports, eq(schema.userSports.sportId, schema.sports.id))
        .where(eq(schema.userSports.userId, u.id));

      // Streak do atleta
      const [streak] = await db
        .select()
        .from(schema.streaks)
        .where(eq(schema.streaks.userId, u.id))
        .limit(1);

      // Localização do perfil
      const [profile] = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, u.id))
        .limit(1);

      return {
        ...u,
        location: profile?.timezone ? "Brasil" : null,
        sports: athleteSports,
        weeklyStreak: streak?.currentWeeklyStreak || 0,
        isFollowing: followingIds.has(u.id),
      };
    })
  );

  // Filtros aplicados em memória (para busca rápida e precisa)
  let results = enriched;

  if (options?.query && options.query.trim()) {
    const q = options.query.toLowerCase().trim();
    results = results.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q) ||
        (a.bio && a.bio.toLowerCase().includes(q))
    );
  }

  if (options?.sportCode && options.sportCode !== "all") {
    results = results.filter((a) =>
      a.sports.some((s) => s.code === options.sportCode)
    );
  }

  return results;
}

/**
 * Seguir um Atleta (§11.1)
 */
export async function followUser(targetUserId: string) {
  const currentUser = await getOrCreateDemoUser();

  if (currentUser.id === targetUserId) {
    throw new Error("Não é possível seguir a si mesmo.");
  }

  // Verifica se já segue
  const [existing] = await db
    .select()
    .from(schema.follows)
    .where(
      and(
        eq(schema.follows.followerId, currentUser.id),
        eq(schema.follows.followingId, targetUserId)
      )
    )
    .limit(1);

  if (!existing) {
    await db.insert(schema.follows).values({
      followerId: currentUser.id,
      followingId: targetUserId,
      status: "accepted",
    });

    await dispatchSmartNotification({
      recipientUserId: targetUserId,
      eventType: "new_follower",
      params: {
        actorName: currentUser.name,
        actorUsername: currentUser.username,
      },
    });
  }

  revalidatePath("/comunidade");
  revalidatePath("/comunidade/atletas");
  revalidatePath(`/atleta/${targetUserId}`);
}

/**
 * Deixar de Seguir um Atleta (§11.1)
 */
export async function unfollowUser(targetUserId: string) {
  const currentUser = await getOrCreateDemoUser();

  await db
    .delete(schema.follows)
    .where(
      and(
        eq(schema.follows.followerId, currentUser.id),
        eq(schema.follows.followingId, targetUserId)
      )
    );

  revalidatePath("/comunidade");
  revalidatePath("/comunidade/atletas");
  revalidatePath(`/atleta/${targetUserId}`);
}

/**
 * Bloquear Usuário (§11.5 - Proteção de Privacidade e Moderação)
 */
export async function blockUser(targetUserId: string) {
  const currentUser = await getOrCreateDemoUser();

  if (currentUser.id === targetUserId) {
    throw new Error("Não é possível bloquear a si mesmo.");
  }

  // Remove vínculo de follow se existir em ambas as direções
  await db
    .delete(schema.follows)
    .where(
      or(
        and(
          eq(schema.follows.followerId, currentUser.id),
          eq(schema.follows.followingId, targetUserId)
        ),
        and(
          eq(schema.follows.followerId, targetUserId),
          eq(schema.follows.followingId, currentUser.id)
        )
      )
    );

  // Insere bloqueio
  const [existingBlock] = await db
    .select()
    .from(schema.userBlocks)
    .where(
      and(
        eq(schema.userBlocks.blockerUserId, currentUser.id),
        eq(schema.userBlocks.blockedUserId, targetUserId)
      )
    )
    .limit(1);

  if (!existingBlock) {
    await db.insert(schema.userBlocks).values({
      blockerUserId: currentUser.id,
      blockedUserId: targetUserId,
    });
  }

  revalidatePath("/comunidade");
  revalidatePath("/comunidade/atletas");
}

/**
 * Denunciar Conteúdo ou Conduta Inapropriada (§11.5)
 */
export async function reportContent(input: {
  targetType: "post" | "comment" | "user";
  targetId: string;
  reason: string;
}) {
  const currentUser = await getOrCreateDemoUser();

  const [report] = await db
    .insert(schema.moderationReports)
    .values({
      reporterUserId: currentUser.id,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      status: "pending",
    })
    .returning();

  return report;
}

/**
 * Perfil Público de Atleta com Conquistas e Histórico PÓS (§11.1 e §12)
 */
export async function getAthleteProfile(username: string) {
  const currentUser = await getOrCreateDemoUser();

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);

  if (!user) {
    return null;
  }

  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, user.id))
    .limit(1);

  const [streak] = await db
    .select()
    .from(schema.streaks)
    .where(eq(schema.streaks.userId, user.id))
    .limit(1);

  // Modalidades do atleta
  const athleteSports = await db
    .select({
      id: schema.sports.id,
      code: schema.sports.code,
      namePt: schema.sports.namePt,
      icon: schema.sports.icon,
      experienceLevel: schema.userSports.experienceLevel,
    })
    .from(schema.userSports)
    .innerJoin(schema.sports, eq(schema.userSports.sportId, schema.sports.id))
    .where(eq(schema.userSports.userId, user.id));

  // Conquistas desbloqueadas
  const userAchs = await db
    .select({
      id: schema.achievements.id,
      code: schema.achievements.code,
      title: schema.achievements.title,
      description: schema.achievements.description,
      category: schema.achievements.category,
      icon: schema.achievements.icon,
      unlockedAt: schema.userAchievements.unlockedAt,
    })
    .from(schema.userAchievements)
    .innerJoin(
      schema.achievements,
      eq(schema.userAchievements.achievementId, schema.achievements.id)
    )
    .where(eq(schema.userAchievements.userId, user.id))
    .orderBy(desc(schema.userAchievements.unlockedAt));

  // Equipes que integra
  const teamsList = await db
    .select({
      id: schema.teams.id,
      name: schema.teams.name,
      slug: schema.teams.slug,
      role: schema.teamMemberships.role,
    })
    .from(schema.teamMemberships)
    .innerJoin(schema.teams, eq(schema.teamMemberships.teamId, schema.teams.id))
    .where(
      and(
        eq(schema.teamMemberships.userId, user.id),
        eq(schema.teamMemberships.status, "active")
      )
    );

  // Contagem de seguidores e seguindo
  const followersCount = await db
    .select()
    .from(schema.follows)
    .where(
      and(
        eq(schema.follows.followingId, user.id),
        eq(schema.follows.status, "accepted")
      )
    );

  const followingCount = await db
    .select()
    .from(schema.follows)
    .where(
      and(
        eq(schema.follows.followerId, user.id),
        eq(schema.follows.status, "accepted")
      )
    );

  // Status de follow pelo usuário autenticado
  const [followRecord] = await db
    .select()
    .from(schema.follows)
    .where(
      and(
        eq(schema.follows.followerId, currentUser.id),
        eq(schema.follows.followingId, user.id),
        eq(schema.follows.status, "accepted")
      )
    )
    .limit(1);

  // Publicações públicas ou de equipe do atleta
  const posts = await db
    .select({
      id: schema.posts.id,
      postType: schema.posts.postType,
      contentText: schema.posts.contentText,
      mediaUrls: schema.posts.mediaUrls,
      likesCount: schema.posts.likesCount,
      commentsCount: schema.posts.commentsCount,
      createdAt: schema.posts.createdAt,
      sessionId: schema.posts.sessionId,
    })
    .from(schema.posts)
    .where(eq(schema.posts.userId, user.id))
    .orderBy(desc(schema.posts.createdAt))
    .limit(10);

  return {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: profile?.timezone ? "Brasil" : null,
      createdAt: user.createdAt,
    },
    streak: {
      weekly: streak?.currentWeeklyStreak || 0,
      bestWeekly: streak?.bestWeeklyStreak || 0,
      daily: streak?.currentDailyStreak || 0,
    },
    sports: athleteSports,
    achievements: userAchs,
    teams: teamsList,
    stats: {
      followers: followersCount.length,
      following: followingCount.length,
      postsCount: posts.length,
    },
    isFollowing: !!followRecord,
    isSelf: currentUser.id === user.id,
    recentPosts: posts,
  };
}