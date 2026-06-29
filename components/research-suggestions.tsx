"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import type { ResearchKeyword } from "@/lib/dataforseo";

interface ResearchSuggestionsProps {
  projectId: string;
}

export function ResearchSuggestions({ projectId }: ResearchSuggestionsProps) {
  const router = useRouter();
  const [seed, setSeed] = useState("");
  const [suggestions, setSuggestions] = useState<ResearchKeyword[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!seed.trim()) return;

    setIsLoading(true);
    const response = await fetch("/api/dataforseo/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, keyword: seed }),
    });

    const result = (await response.json()) as {
      suggestions?: ResearchKeyword[];
      error?: string;
    };

    if (!response.ok) {
      toast.error(result.error || "Failed to fetch suggestions");
    } else {
      setSuggestions(result.suggestions ?? []);
      setSelected(new Set());
    }

    setIsLoading(false);
  }

  function toggleSelection(keyword: string) {
    const next = new Set(selected);
    if (next.has(keyword)) {
      next.delete(keyword);
    } else {
      next.add(keyword);
    }
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === suggestions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(suggestions.map((s) => s.keyword)));
    }
  }

  async function handleAddSelected() {
    if (selected.size === 0) return;

    setIsAdding(true);
    const keywordsToAdd = suggestions
      .filter((s) => selected.has(s.keyword))
      .map((s) => ({
        keyword: s.keyword,
        location_code: s.location_code,
        language_code: s.language_code,
      }));

    const response = await fetch("/api/dataforseo/check-keyword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, keywords: keywordsToAdd }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(result.error || "Failed to add keywords");
    } else {
      toast.success(`Added ${selected.size} keywords to project`);
      setSelected(new Set());
      router.refresh();
    }

    setIsAdding(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="seed-keyword" className="sr-only">
            Seed keyword
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="seed-keyword"
              placeholder="Enter a seed keyword to find related keywords..."
              className="pl-9"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              required
            />
          </div>
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Searching..." : "Find keywords"}
        </Button>
      </form>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {suggestions.length} suggestions found
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selected.size === suggestions.length ? "Deselect all" : "Select all"}
              </Button>
              <Button
                size="sm"
                onClick={handleAddSelected}
                disabled={isAdding || selected.size === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                {isAdding ? "Adding..." : `Add ${selected.size} selected`}
              </Button>
            </div>
          </div>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          selected.size === suggestions.length && suggestions.length > 0
                        }
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Search volume</TableHead>
                    <TableHead className="text-right">CPC</TableHead>
                    <TableHead className="text-right">Competition</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map((suggestion) => (
                    <TableRow key={suggestion.keyword}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(suggestion.keyword)}
                          onCheckedChange={() => toggleSelection(suggestion.keyword)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {suggestion.keyword}
                      </TableCell>
                      <TableCell className="text-right">
                        {suggestion.search_volume ? (
                          <Badge variant="secondary">
                            {suggestion.search_volume.toLocaleString()}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {suggestion.cpc ? `$${suggestion.cpc.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {suggestion.competition != null
                          ? `${(suggestion.competition * 100).toFixed(0)}%`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {suggestions.length === 0 && !isLoading && (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Search for a seed keyword to discover related keywords to track.
        </div>
      )}
    </div>
  );
}
