import Link from "next/link";
import { Search, TrendingUp, Users, Package, Flame, Sparkles } from "lucide-react";
import { AdBanner } from "@/components/ads/AdBanner";
import { TrendingCards } from "@/components/home/TrendingCards";
import { CommunityStats } from "@/components/home/CommunityStats";
import { HowItWorks } from "@/components/home/HowItWorks";
import { LatestSets } from "@/components/home/LatestSets";
import dynamic from 'next/dynamic';

const CardCarousel = dynamic(
  () => import('@/components/three/CardCarousel').then(mod => mod.CardCarousel),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="relative container mx-auto px-4 py-12">
      {/* 3D Background */}
      <CardCarousel />
      {/* Top Banner Ad */}
      <div className="mb-8">
        <AdBanner slot="home-top-banner" format="horizontal" />
      </div>

      {/* Hero Section */}
      <div className="text-center mb-16 relative py-20">
        {/* Floating cards provide the background animation */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-clip-text text-transparent animate-gradient">
          One Piece TCG Trader
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
          Track, trade, and manage your One Piece Trading Card Game collection with stunning 3D visuals
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/cards"
            className="bg-gradient-to-r from-red-600 to-orange-500 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all text-lg"
          >
            Browse Cards
          </Link>
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all text-lg"
          >
            My Dashboard
          </Link>
        </div>
      </div>

      {/* Trending Cards Section */}
      <section className="mb-20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Flame className="w-8 h-8 text-red-600" />
            <h2 className="text-3xl font-bold">Trending Cards</h2>
          </div>
          <Link 
            href="/cards" 
            className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-2"
          >
            View All
            <TrendingUp className="w-4 h-4" />
          </Link>
        </div>
        <TrendingCards />
      </section>

      {/* Community Stats */}
      <section className="mb-20">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Join Our Community</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Thousands of collectors trust us with their One Piece TCG journey
          </p>
        </div>
        <CommunityStats />
      </section>

      {/* Latest Sets */}
      <section className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <Sparkles className="w-8 h-8 text-red-600" />
          <h2 className="text-3xl font-bold">Latest Card Sets</h2>
        </div>
        <LatestSets />
      </section>

      {/* How It Works */}
      <section className="mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">How It Works</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Get started in three simple steps
          </p>
        </div>
        <HowItWorks />
      </section>

      {/* Features Grid */}
      <section className="mb-20">
        <h2 className="text-3xl font-bold mb-8 text-center">Why Choose Us</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Search className="w-8 h-8" />}
            title="Advanced Search"
            description="Find any card with powerful filters by set, rarity, color, and more"
          />
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8" />}
            title="Live Pricing"
            description="Track real-time market prices and historical trends for every card"
          />
          <FeatureCard
            icon={<Package className="w-8 h-8" />}
            title="Collection Manager"
            description="Organize your collection and wishlist with detailed tracking"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Trade Marketplace"
            description="Connect with other collectors and trade cards safely"
          />
        </div>
      </section>

      {/* Bottom Banner Ad */}
      <div className="mt-12">
        <AdBanner slot="home-bottom-banner" format="horizontal" />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 card-hover overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 animate-shimmer" />
      
      <div className="relative z-10">
        <div className="text-red-600 mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2 group-hover:text-red-600 transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
      </div>
      
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-600/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
}
