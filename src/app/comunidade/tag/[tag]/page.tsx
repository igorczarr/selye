import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { CommunityFeed } from "@/components/community/community-feed";
import { getCommunityHubData } from "@/actions/community";
import { normalizeHashtag } from "@/core/social/text-parser";

export const instant = false;

async function TagFeedLoader({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const cleanTag = normalizeHashtag(decodeURIComponent(tag));
  const hub = await getCommunityHubData({ filter: "explore", tag: cleanTag });

  return (
    <CommunityFeed
      posts={hub.posts}
      activeTab="explore"
      activeTag={cleanTag}
      trendingTags={hub.trendingTags}
      userTeams={hub.userTeams}
      recentWorkouts={hub.recentWorkouts}
      activeChallenges={hub.activeChallenges}
    />
  );
}

export default function ComunidadeTagPage(props: {
  params: Promise<{ tag: string }>;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="selye-container py-6 flex-1">
        <div className="mb-6">
          <span className="t-label">Tópicos da Comunidade</span>
          <h1 className="t-h1 mt-1">Explorar por Hashtag</h1>
        </div>

        <Suspense
          fallback={
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-busy="true">
              <div className="lg:col-span-8 space-y-4">
                <div className="skeleton h-20 w-full" />
                <div className="skeleton h-48 w-full" />
              </div>
              <div className="lg:col-span-4 space-y-4">
                <div className="skeleton h-40 w-full" />
              </div>
            </div>
          }
        >
          <TagFeedLoader params={props.params} />
        </Suspense>
      </main>
    </div>
  );
}
