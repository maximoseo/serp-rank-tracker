"use client";

import { ArrowDown, ArrowUp, Minus, Search } from "lucide-react";

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
import type { Tables } from "@/lib/db-types";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface KeywordTableProps {
  keywords: Tables<"keywords">[];
  rankings: Tables<"rankings">[];
}

interface KeywordRow {
  keyword: Tables<"keywords">;
  current: Tables<"rankings"> | null;
  previous: Tables<"rankings"> | null;
  change: number | null;
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

    return { keyword, current, previous, change };
  });
}

export function KeywordTable({ keywords, rankings }: KeywordTableProps) {
  const [query, setQuery] = useState("");
  const rows = prepareRows(keywords, rankings).filter((row) =>
    row.keyword.keyword.toLowerCase().includes(query.toLowerCase())
  );

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
                rows.map((row) => (
                  <TableRow key={row.keyword.id}>
                    <TableCell className="font-medium">
                      {row.keyword.keyword}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.current?.rank_absolute ? (
                        <RankBadge rank={row.current.rank_absolute} />
                      ) : (
                        <span className="text-muted-foreground">-</span>
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
                ))
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
