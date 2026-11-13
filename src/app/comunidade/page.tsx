import { Suspense } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navigation/navbar";
import { CommunityFeed } from "@/components/community/community-feed";
import { getCommunityFeed } from "@/actions/community";
import { Users, Shield, Plus } from "lucide-react";

export const instant = false;

async function FeedLoader() {
  const posts = await getCommunityFeed("explore");
  return <CommunityFeed posts={posts} />;
}

export default function ComunidadePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 md:pb-0">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Banner Superior da Comunidade */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="t-label">Comunidade & Conexão (§11 e §12)</span>
            <h1 className="t-h1 mt-1">Mural Esportivo</h1>
            <p className="text-muted text-sm mt-1">
              Acompanhe treinos de amigos, publicações de equipes e o ritual do PÓS.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/equipes"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md border border-line bg-surface text-grafite text-xs font-semibold hover:bg-osso transition-colors shadow-xs"
            >
              <Users size={15} />
              <span>Ver Equipes</span>
            </Link>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="py-20 text-center text-muted font-mono text-sm animate-pulse">
              Carregando publicações esportivas...
            </div>
          }
        >
          <FeedLoader />
        </Suspense>
      </main>
    </div>
  );
}
