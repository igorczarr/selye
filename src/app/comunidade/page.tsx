import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { CommunityFeed } from "@/components/community/community-feed";
import {
  getCommunityHubData,
  type CommunityFilter,
} from "@/actions/community";

export const instant = false;

const VALID_FILTERS = new Set<CommunityFilter>([
  "explore",
  "following",
  "teams",
  "threads",
]);

async function FeedLoader({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolved = await searchParams;
  const rawTab = resolved.tab as CommunityFilter | undefined;
  const tab: CommunityFilter =
    rawTab && VALID_FILTERS.has(rawTab) ? rawTab : "explore";

  const hub = await getCommunityHubData({ filter: tab });

  return (
    <CommunityFeed
      posts={hub.posts}
      activeTab={tab}
      trendingTags={hub.trendingTags}
      userTeams={hub.userTeams}
      recentWorkouts={hub.recentWorkouts}
      activeChallenges={hub.activeChallenges}
    />
  );
}

function CommunitySkeleton() {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      aria-busy="true"
      aria-label="Carregando mural esportivo"
    >
      <div className="lg:col-span-8 flex flex-col gap-4">
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-36 w-full" />
        <div className="skeleton h-52 w-full" />
      </div>
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="skeleton h-36 w-full" />
        <div className="skeleton h-44 w-full" />
      </div>
    </div>
  );
}

export default function ComunidadePage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="selye-container py-6 flex-1">
        <div className="mb-6">
          <span className="t-label">Rede Esportiva</span>
          <h1 className="t-h1 mt-1">Comunidade</h1>
          <p className="text-muted text-sm mt-1">
            Check-ins de treino, fios de discussão por grupo, #hashtags e desafios coletivos.
          </p>
        </div>

        <Suspense fallback={<CommunitySkeleton />}>
          <FeedLoader searchParams={props.searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
