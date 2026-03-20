"use client";

import { useState, useCallback, useEffect } from "react";
import {
  submitArticle,
  upvote,
  downvote,
  removeUpvote,
  removeDownvote,
  getArticle,
  getArticles,
  getTopArticles,
  getArticleCount,
  hasVoted,
  CONTRACT_ADDRESS,
  Article,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ArticleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function UpvoteIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function DownvoteIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

function TextArea({
  label,
  ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <textarea
          {...props}
          rows={4}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none resize-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  color,
}: {
  name: string;
  params: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
    </div>
  );
}

// ── Article Card ─────────────────────────────────────────────

function ArticleCard({
  article,
  walletAddress,
  onUpvote,
  onDownvote,
  onRemoveUpvote,
  onRemoveDownvote,
}: {
  article: Article;
  walletAddress: string | null;
  onUpvote: () => void;
  onDownvote: () => void;
  onRemoveUpvote: () => void;
  onRemoveDownvote: () => void;
}) {
  const [voted, setVoted] = useState<[boolean, boolean]>([false, false]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      hasVoted(article.id, walletAddress).then(setVoted);
    }
  }, [article.id, walletAddress]);

  const handleVote = async (action: () => void) => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      await action();
      const newVoted = await hasVoted(article.id, walletAddress);
      setVoted(newVoted);
    } finally {
      setLoading(false);
    }
  };

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const score = article.upvotes - article.downvotes;
  const scoreColor = score > 0 ? "text-[#34d399]" : score < 0 ? "text-[#f87171]" : "text-white/40";

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.1] transition-all animate-fade-in-up">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Vote buttons */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => handleVote(voted[0] ? onRemoveUpvote : onUpvote)}
              disabled={loading || !walletAddress}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                voted[0] 
                  ? "text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/20" 
                  : "text-white/30 hover:text-[#34d399] hover:bg-[#34d399]/5"
              )}
              title={walletAddress ? (voted[0] ? "Remove upvote" : "Upvote") : "Connect wallet to vote"}
            >
              <UpvoteIcon filled={voted[0]} />
            </button>
            <span className={cn("text-sm font-bold font-mono", scoreColor)}>
              {score > 0 ? "+" : ""}{score}
            </span>
            <button
              onClick={() => handleVote(voted[1] ? onRemoveDownvote : onDownvote)}
              disabled={loading || !walletAddress}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                voted[1] 
                  ? "text-[#f87171] bg-[#f87171]/10 border border-[#f87171]/20" 
                  : "text-white/30 hover:text-[#f87171] hover:bg-[#f87171]/5"
              )}
              title={walletAddress ? (voted[1] ? "Remove downvote" : "Downvote") : "Connect wallet to vote"}
            >
              <DownvoteIcon filled={voted[1]} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white/90 mb-1 leading-tight">{article.title}</h3>
            <p className="text-sm text-white/50 line-clamp-2 mb-3">{article.content}</p>
            <div className="flex items-center gap-3 text-[10px] text-white/30">
              <span className="font-mono">{truncate(article.author)}</span>
              <span className="flex items-center gap-1">
                <ClockIcon />
                {formatTime(article.timestamp)}
              </span>
              <span>ID: {article.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

type Tab = "feed" | "top" | "submit";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Submit form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feed state
  const [articles, setArticles] = useState<Article[]>([]);
  const [articleCount, setArticleCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Load articles
  const loadArticles = useCallback(async (loadFn: (offset: number, limit: number) => Promise<Article[]>) => {
    setIsLoading(true);
    try {
      const data = await loadFn(page * pageSize, pageSize);
      if (page === 0) {
        setArticles(data);
      } else {
        setArticles(prev => [...prev, ...data]);
      }
      const count = await getArticleCount();
      setArticleCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load articles");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (activeTab === "feed") {
      loadArticles(getArticles);
    } else if (activeTab === "top") {
      loadArticles(getTopArticles);
    }
  }, [activeTab, page, loadArticles]);

  // Handle submit article
  const handleSubmit = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!title.trim() || !content.trim()) return setError("Fill in all fields");
    setError(null);
    setIsSubmitting(true);
    setTxStatus("Awaiting signature...");
    try {
      await submitArticle(walletAddress, title.trim(), content.trim());
      setTxStatus("Article published on-chain!");
      setTitle("");
      setContent("");
      setPage(0);
      setActiveTab("feed");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [walletAddress, title, content]);

  // Handle voting
  const handleVote = useCallback(async (
    articleId: number,
    action: "upvote" | "downvote" | "remove_upvote" | "remove_downvote",
    caller: string
  ) => {
    try {
      switch (action) {
        case "upvote":
          await upvote(caller, articleId);
          break;
        case "downvote":
          await downvote(caller, articleId);
          break;
        case "remove_upvote":
          await removeUpvote(caller, articleId);
          break;
        case "remove_downvote":
          await removeDownvote(caller, articleId);
          break;
      }
      // Refresh articles to show updated scores
      if (activeTab === "feed") {
        loadArticles(getArticles);
      } else {
        loadArticles(getTopArticles);
      }
    } catch (err) {
      // Silently fail for voting errors
      console.error("Vote failed:", err);
    }
  }, [activeTab, loadArticles]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "feed", label: "Latest", icon: <RefreshIcon />, color: "#4fc3f7" },
    { key: "top", label: "Top", icon: <TrendingIcon />, color: "#fbbf24" },
    { key: "submit", label: "Submit", icon: <ArticleIcon />, color: "#7c6cf0" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#fbbf24]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7c6cf0]">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">News Platform</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">
              {articleCount} articles
            </Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); setPage(0); setArticles([]); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Feed */}
            {activeTab === "feed" && (
              <div className="space-y-4">
                <MethodSignature name="get_articles" params="(offset: u32, limit: u32)" color="#4fc3f7" />
                
                {articles.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-white/30 text-sm">
                    No articles yet. Be the first to submit!
                  </div>
                )}

                {articles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    walletAddress={walletAddress}
                    onUpvote={() => walletAddress && handleVote(article.id, "upvote", walletAddress)}
                    onDownvote={() => walletAddress && handleVote(article.id, "downvote", walletAddress)}
                    onRemoveUpvote={() => walletAddress && handleVote(article.id, "remove_upvote", walletAddress)}
                    onRemoveDownvote={() => walletAddress && handleVote(article.id, "remove_downvote", walletAddress)}
                  />
                ))}

                {isLoading && (
                  <div className="flex justify-center py-4">
                    <SpinnerIcon />
                  </div>
                )}

                {articles.length > 0 && articles.length < articleCount && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={isLoading}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-3 text-sm text-white/40 hover:text-white/60 hover:border-white/[0.1] transition-all"
                  >
                    Load more
                  </button>
                )}
              </div>
            )}

            {/* Top Articles */}
            {activeTab === "top" && (
              <div className="space-y-4">
                <MethodSignature name="get_top_articles" params="(offset: u32, limit: u32)" color="#fbbf24" />
                
                {articles.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-white/30 text-sm">
                    No articles yet.
                  </div>
                )}

                {articles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    walletAddress={walletAddress}
                    onUpvote={() => walletAddress && handleVote(article.id, "upvote", walletAddress)}
                    onDownvote={() => walletAddress && handleVote(article.id, "downvote", walletAddress)}
                    onRemoveUpvote={() => walletAddress && handleVote(article.id, "remove_upvote", walletAddress)}
                    onRemoveDownvote={() => walletAddress && handleVote(article.id, "remove_downvote", walletAddress)}
                  />
                ))}

                {isLoading && (
                  <div className="flex justify-center py-4">
                    <SpinnerIcon />
                  </div>
                )}

                {articles.length > 0 && articles.length < articleCount && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={isLoading}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-3 text-sm text-white/40 hover:text-white/60 hover:border-white/[0.1] transition-all"
                  >
                    Load more
                  </button>
                )}
              </div>
            )}

            {/* Submit */}
            {activeTab === "submit" && (
              <div className="space-y-5">
                <MethodSignature name="submit_article" params="(title: String, content: String, author: Address)" color="#7c6cf0" />
                <Input 
                  label="Title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Breaking: Something happened..." 
                />
                <TextArea 
                  label="Content" 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  placeholder="Share the full story..." 
                />
                
                {walletAddress ? (
                  <ShimmerButton onClick={handleSubmit} disabled={isSubmitting} shimmerColor="#7c6cf0" className="w-full">
                    {isSubmitting ? <><SpinnerIcon /> Publishing...</> : <><ArticleIcon /> Publish Article</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to publish articles
                  </button>
                )}

                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                  <h4 className="text-xs font-medium text-white/50 mb-2">Permissionless by Design</h4>
                  <ul className="text-[11px] text-white/30 space-y-1">
                    <li>• Anyone can submit articles</li>
                    <li>• Anyone can upvote or downvote</li>
                    <li>• Votes can be changed at any time</li>
                    <li>• No admin or moderation control</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Decentralized News &middot; Soroban</p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
                <span className="font-mono text-[9px] text-white/15">Permissionless</span>
              </span>
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
