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

      const q = overrides.q ?? search;
      const st = overrides.state ?? state;
      const diff = overrides.difficulty ?? difficulty;
      const r = overrides.repo ?? repo;
      const sc = overrides.claimed ?? String(showClaimed);
      const pg = overrides.page ?? '1';

      if (q) params.set('q', q);
      if (st !== 'open') params.set('state', st);
      if (diff) params.set('difficulty', diff);
      if (r) params.set('repo', r);

      if (sc === 'true') params.set('claimed', 'true');
      else params.delete('claimed');

      if (pg !== '1') params.set('page', pg);

      startTransition(() => {
        router.push(`/issues?${params.toString()}`);
      });
    },
    [router, search, state, difficulty, repo, showClaimed, searchParams],
  );

  const handleClaim = async (id: number) => {
    setActionIssueId(id);
    const res = await claimIssue(id);
    setActionIssueId(null);

    if (!res.ok) setActionError(res.error.message);
    router.refresh();
  };

  const handleUnclaim = async (recId: number) => {
    setActionIssueId(recId);
    const res = await unclaimIssue(recId);
    setActionIssueId(null);

    if (!res.ok) setActionError(res.error.message);
    router.refresh();
  };

  return (
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

      {/* SHEET */}
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

              <button
                className="mt-4 bg-green-600 px-3 py-1 text-xs"
                onClick={() => handleClaim(selectedIssue.id)}
              >
                Claim
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {actionError && <div className="mt-4 text-xs text-red-400">{actionError}</div>}
    </div>
  );
}
