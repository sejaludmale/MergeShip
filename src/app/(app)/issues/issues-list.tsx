'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useTransition, useCallback } from 'react';
import { Search, ExternalLink, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';

import {
  claimIssue,
  unclaimIssue,
  type IssueWithStatus,
  type IssueFilter,
  type IssuesPageResult,
  type RepoOption,
} from '@/app/actions/issues';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const DIFFICULTY_LABEL: Record<string, string> = { E: 'L1', M: 'L2', H: 'L3' };

const DIFFICULTY_COLOR: Record<string, string> = {
  E: 'border-emerald-700 text-emerald-400',
  M: 'border-yellow-700 text-yellow-400',
  H: 'border-red-800 text-red-400',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/* ================= ISSUE CARD ================= */

function IssueCard({
  issue,
  onClaim,
  onUnclaim,
  actionPending,
  onOpen,
}: {
  issue: IssueWithStatus;
  onClaim: (id: number) => void;
  onUnclaim: (recId: number) => void;
  actionPending: boolean;
  onOpen: (issue: IssueWithStatus) => void;
}) {
  const isClaimed = issue.userRecStatus === 'claimed';
  const repoName = issue.repoFullName.split('/')[1] ?? issue.repoFullName;
  const org = issue.repoFullName.split('/')[0] ?? '';

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(issue.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="cursor-pointer border-b border-[#2d333b] py-6 last:border-0"
      onClick={() => onOpen(issue)}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="border border-zinc-700 px-2 py-0.5 text-[10px] uppercase text-zinc-400">
            {org}
          </span>

          <span className="text-[10px] uppercase tracking-widest text-zinc-500">/</span>

          <span className="border border-zinc-700 px-2 py-0.5 text-[10px] uppercase text-zinc-400">
            {repoName}
          </span>

          {issue.difficulty && (
            <span
              className={`border px-2 py-0.5 text-[10px] font-bold uppercase ${
                DIFFICULTY_COLOR[issue.difficulty] ?? 'border-zinc-700 text-zinc-400'
              }`}
            >
              {DIFFICULTY_LABEL[issue.difficulty] ?? issue.difficulty}
            </span>
          )}

          {isClaimed && (
            <span className="bg-purple-900/50 px-2 py-0.5 text-[10px] uppercase text-purple-300">
              CLAIMED
            </span>
          )}
        </div>

        <span className="text-[10px] uppercase tracking-widest text-zinc-600">
          {timeAgo(issue.fetchedAt)}
        </span>
      </div>

      <div className="mb-3 block font-serif text-xl leading-snug text-white">{issue.title}</div>

      <div className="flex flex-wrap items-center gap-3">
        {isClaimed ? (
          <>
            <span className="text-[10px] uppercase tracking-widest text-purple-400">
              YOUR ISSUE
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="flex items-center gap-1 border border-zinc-700 px-3 py-1.5 text-[10px] uppercase tracking-widest text-zinc-300"
            >
              {copied ? (
                <>
                  COPIED <Check className="h-3 w-3" />
                </>
              ) : (
                <>
                  COPY <Copy className="h-3 w-3" />
                </>
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                issue.userRecId && onUnclaim(issue.userRecId);
              }}
              disabled={actionPending || !issue.userRecId}
              className="border border-zinc-700 px-3 py-1.5 text-[10px] uppercase tracking-widest text-zinc-500"
            >
              UNCLAIM
            </button>
          </>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClaim(issue.id);
              }}
              disabled={actionPending}
              className="border border-zinc-600 px-4 py-1.5 text-[10px] uppercase tracking-widest text-zinc-300"
            >
              CLAIM ISSUE
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="text-[10px] uppercase tracking-widest text-zinc-500"
            >
              {copied ? 'COPIED' : 'COPY'}
            </button>
          </>
        )}

        {issue.xpReward && (
          <span className="ml-auto text-[10px] uppercase tracking-widest text-emerald-600">
            +{issue.xpReward} XP
          </span>
        )}
      </div>
    </div>
  );
}

/* ================= ISSUES LIST ================= */

export function IssuesList({
  initialData,
  initialFilters,
  repoOptions,
}: {
  initialData: IssuesPageResult;
  initialFilters: IssueFilter;
  repoOptions: RepoOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [actionIssueId, setActionIssueId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [selectedIssue, setSelectedIssue] = useState<IssueWithStatus | null>(null);

  const [search, setSearch] = useState(initialFilters.search ?? '');
  const [state, setState] = useState<'open' | 'closed'>(initialFilters.state ?? 'open');
  const [difficulty, setDifficulty] = useState(initialFilters.difficulty ?? '');
  const [repo, setRepo] = useState(initialFilters.repo ?? '');
  const [showClaimed, setShowClaimed] = useState(initialFilters.showClaimed ?? false);

  const navigate = useCallback(
    (overrides: any) => {
      const params = new URLSearchParams(searchParams.toString());

      if (overrides.q ?? search) params.set('q', overrides.q ?? search);
      if ((overrides.state ?? state) !== 'open') params.set('state', overrides.state ?? state);
      if (overrides.difficulty ?? difficulty)
        params.set('difficulty', overrides.difficulty ?? difficulty);
      if (overrides.repo ?? repo) params.set('repo', overrides.repo ?? repo);

      startTransition(() => {
        router.push(`/issues?${params.toString()}`);
      });
    },
    [router, search, state, difficulty, repo, searchParams],
  );

  const handleClaim = async (id: number) => {
    const res = await claimIssue(id);
    if (!res.ok) setActionError(res.error.message);
    router.refresh();
  };

  const handleUnclaim = async (recId: number) => {
    const res = await unclaimIssue(recId);
    if (!res.ok) setActionError(res.error.message);
    router.refresh();
  };

  const totalPages = Math.ceil(initialData.total / initialData.pageSize);
  const currentPage = initialData.page;

  return (
    <div>
      {/* LIST */}
      <div>
        {initialData.issues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            onClaim={handleClaim}
            onUnclaim={handleUnclaim}
            actionPending={actionIssueId === issue.id}
            onOpen={(issue) => setSelectedIssue(issue)}
          />
        ))}
      </div>

      {/* SHEET (RIGHT PANEL) */}
      <Sheet open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <SheetContent side="right" className="w-[420px]">
          {selectedIssue && (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle>{selectedIssue.title}</SheetTitle>
              </SheetHeader>

              <p className="text-sm text-zinc-400">
                {selectedIssue.body || 'No description available'}
              </p>

              <div className="text-xs text-zinc-500">Repo: {selectedIssue.repoFullName}</div>

              <a
                href={selectedIssue.url}
                target="_blank"
                className="text-xs text-blue-400 underline"
              >
                Open on GitHub
              </a>

              <div className="flex gap-2 pt-4">
                <button className="bg-green-600 px-3 py-1 text-xs">Claim</button>

                <button
                  onClick={() => setSelectedIssue(null)}
                  className="bg-zinc-700 px-3 py-1 text-xs"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ERROR */}
      {actionError && <div className="mt-4 text-xs text-red-400">{actionError}</div>}
    </div>
  );
}
