"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddKeywordModalProps {
  projectId: string;
  children: React.ReactNode;
}

const LOCATION_OPTIONS = [
  { value: "2840", label: "United States" },
  { value: "2826", label: "United Kingdom" },
  { value: "2124", label: "Canada" },
  { value: "2036", label: "Australia" },
  { value: "2275", label: "Germany" },
  { value: "2250", label: "France" },
  { value: "2724", label: "Spain" },
  { value: "2380", label: "Italy" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
];

export function AddKeywordModal({ projectId, children }: AddKeywordModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rawKeywords, setRawKeywords] = useState("");
  const [locationCode, setLocationCode] = useState("2840");
  const [languageCode, setLanguageCode] = useState("en");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const keywords = rawKeywords
      .split("\n")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .map((k) => ({
        keyword: k,
        location_code: parseInt(locationCode, 10),
        language_code: languageCode,
      }));

    if (keywords.length === 0) {
      toast.error("Enter at least one keyword");
      return;
    }

    setIsLoading(true);

    const response = await fetch("/api/dataforseo/check-keyword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, keywords }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(result.error || "Failed to add keywords");
    } else {
      toast.success("Keywords added and checked");
      setRawKeywords("");
      setOpen(false);
      router.refresh();
    }

    setIsLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add keywords</DialogTitle>
            <DialogDescription>
              Enter one keyword per line. We will check current rankings immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="keywords">Keywords</Label>
              <textarea
                id="keywords"
                rows={6}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="rank tracking software&#10;serp tracker&#10;keyword rank checker"
                value={rawKeywords}
                onChange={(e) => setRawKeywords(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Location</Label>
                <Select
                  value={locationCode}
                  onValueChange={(value) => value && setLocationCode(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Language</Label>
                <Select
                  value={languageCode}
                  onValueChange={(value) => value && setLanguageCode(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add keywords"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
