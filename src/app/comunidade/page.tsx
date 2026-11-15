import { Suspense } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navigation/navbar";
import { CommunityFeed } from "@/components/community/community-feed";
import { getCommunityFeed } from "@/actions/community";
import { Users, UserPlus, Trophy } from "lucide-react";

export const instant = false;

async function FeedLoader({ tab }: { tab: "explore" | "teams" | "following" }) {
  const posts = await getCommunityFeed(tab);
  return <CommunityFeed posts={posts} activeTab={tab} />;
}

function CommunitySkeleton() {
  return (
    <div
      className="flex flex-col gap-6 max-w-2xl mx-auto w-full"
      aria-busy="true"
      aria-label="Carregando mural esportivo"
    >
      <div className="skeleton h-12 w-full" />
      <div className="skeleton h-32 w-full" />
      <div className="skeleton h-52 w-full" />
      <div className="skeleton h-52 w-full" />
    </div>
  );
}

export default async function ComunidadePage(props: {
  searchParams: Promise<{ tab?: "explore" | "teams" | "following" }>;
}) {
  const searchParams = await props.searchParams;
  const currentTab = searchParams.tab || "explore";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20 md:pb-0">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <span className="t-label">Rede Esportiva</span>
            <h1 className="t-h1 mt-1">Mural da Comunidade</h1>
            <p className="text-muted text-sm mt-1">
              Acompanhe sessões concluídas, aprendizados técnicos e a constância de outros atletas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href="/comunidade/atletas"
              className="btn btn-ghost h-10 px-3.5 text-xs"
            >
              <UserPlus size={14} />
              <span>Atletas</span>
            </Link>
            <Link
              href="/comunidade/desafios"
              className="btn btn-ghost h-10 px-3.5 text-xs"
            >
              <Trophy size={14} />
              <span>Desafios</span>
            </Link>
            <Link href="/equipes" className="btn btn-dark h-10 px-3.5 text-xs">
              <Users size={14} />
              <span>Equipes</span>
            </Link>
          </div>
        </div>

        <Suspense fallback={<CommunitySkeleton />}>
          <FeedLoader tab={currentTab} />
        </Suspense>
      </main>
    </div>
  );
}
