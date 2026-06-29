"use client";

import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Minus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SerpSnapshotItem } from "@/lib/dataforseo";
import type { Tables } from "@/lib/db-types";
import { cn } from "@/lib/utils";
import React, { useState } from "react";

interface KeywordTableProps {
  keywords: Tables<"keywords">[];
  rankings: Tables<"rankings">[];
}

interface KeywordRow {
  keyword: Tables<"keywords">;
  current: Tables<"rankings"> | null;
  previous: Tables<"rankings"> | null;
  change: number | null;
  snapshot: SerpSnapshotItem[];
}

function prepareRows(keywords: Tables<"keywords">[], rankings: Tables<"rankings">[]): KeywordRow[] {
  const rankingsByKeyword: Record<string, Tables<"rankings">[]> = {};

  for (const ranking of rankings) {
    if (!rankingsByKeyword[ranking.keyword_id]) {
      rankingsByKeyword[ranking.keyword_id] = [];
    }
    rankingsByKeyword[ranking.keyword_id].push(ranking);
  }

  for (const key of Object.keys(rankingsByKeyword)) {
    rankingsByKeyword[key].sort(
      (a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime()
    );
  }

  return keywords.map((keyword) => {
    const list = rankingsByKeyword[keyword.id] ?? [];
    const current = list[0] ?? null;
    const previous = list[1] ?? null;

    let change: number | null = null;
    if (current?.rank_absolute != null && previous?.rank_absolute != null) {
      change = previous.rank_absolute - current.rank_absolute;
    }

    const snapshot: SerpSnapshotItem[] = Array.isArray(current?.serp_snapshot)
      ? (current.serp_snapshot as unknown as SerpSnapshotItem[])
      : [];

    return { keyword, current, previous, change, snapshot };
  });
}

export function KeywordTable({ keywords, rankings }: KeywordTableProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const rows = prepareRows(keywords, rankings).filter((row) =>
    row.keyword.keyword.toLowerCase().includes(query.toLowerCase())
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter keywords..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead className="text-right">Rank</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead>Ranking URL</TableHead>
                <TableHead className="text-right">Last checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((row) => {
                  const isExpanded = expanded.has(row.keyword.id);
                  return (
                    <React.Fragment key={row.keyword.id}>
                      <TableRow
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          isExpanded && "bg-muted/50"
                        )}
                        onClick={() => toggleExpand(row.keyword.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            {row.keyword.keyword}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {row.current?.rank_absolute ? (
                            <RankBadge rank={row.current.rank_absolute} />
                          ) : (
                            <span className="text-muted-foreground">
                              Not in top 100
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <ChangeIndicator change={row.change} />
                        </TableCell>
                        <TableCell className="text-right">
                          {row.current?.search_volume ?? "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {row.current?.url ? (
                            <a
                              href={row.current.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {row.current.url}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.current
                            ? new Date(row.current.checked_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="p-0">
                            <SnapshotPanel snapshot={row.snapshot} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No keywords found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  let variant: "default" | "secondary" | "outline" | "destructive" = "default";
  if (rank > 10) variant = "outline";
  if (rank > 30) variant = "destructive";
  if (rank <= 3) variant = "secondary";

  return <Badge variant={variant}>{rank}</Badge>;
}

function ChangeIndicator({ change }: { change: number | null }) {
  if (change == null) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (change === 0) {
    return <Minus className="ml-auto h-4 w-4 text-muted-foreground" />;
  }

  const isPositive = change > 0;
  const Icon = isPositive ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        "ml-auto flex items-center justify-end gap-1 text-sm font-medium",
        isPositive ? "text-emerald-600" : "text-red-600"
      )}
    >
      <Icon className="h-4 w-4" />
      {Math.abs(change)}
    </span>
  );
}

function SnapshotPanel({ snapshot }: { snapshot: SerpSnapshotItem[] }) {
  if (snapshot.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        No SERP snapshot available. Run a rank check to load the top 100 results.
      </div>
    );
  }

  return (
    <div className="bg-muted/40 px-4 py-4">
      <h4 className="mb-3 text-sm font-semibold text-muted-foreground">
        Top 10 SERP results (snapshot)
      </h4>
      <div className="space-y-2">
        {snapshot.map((item) => (
          <div
            key={item.rank_absolute}
            className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
              {item.rank_absolute}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {item.type === "local_pack" ? "Local Pack" : "Organic"}
                </span>
                {item.domain && (
                  <span className="text-xs text-muted-foreground">
                    {item.domain}
                  </span>
                )}
              </div>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-primary hover:underline"
                  title={item.url}
                >
                  {item.title ?? item.url}
                </a>
              ) : (
                <span className="block truncate text-muted-foreground">
                  {item.title ?? "No URL"}
                </span>
              )}
              {item.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
