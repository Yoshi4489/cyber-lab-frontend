"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  LayoutGrid,
  List,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lab } from "./data";
import type { LiveLab } from "./live";
import { LabCard } from "./lab-card";
import { useSavedLabs } from "@/features/bookmarks/use-saved-labs";
import styles from "./catalog.module.css";

export function Catalog({
  labs,
  savedOnly = false,
  categories,
}: {
  labs: (Lab | LiveLab)[];
  categories: string[];
  savedOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All labs");
  const [difficulty, setDifficulty] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [view, setView] = useState("grid");
  const { saved } = useSavedLabs();
  const available = savedOnly
    ? labs.filter((lab) => saved.includes(lab.slug))
    : labs;
  const filtered = available
    .filter(
      (lab) =>
        (category === "All labs" || lab.category === category) &&
        (difficulty === "all" || lab.difficulty === difficulty) &&
        `${lab.title} ${lab.description} ${lab.tags.join(" ")} ${lab.category}`
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
    )
    .sort((a, b) =>
      sort === "points" ? b.points - a.points : a.title.localeCompare(b.title),
    );
  const hasFilters =
    query !== "" || category !== "All labs" || difficulty !== "all";
  function clearFilters() {
    setQuery("");
    setCategory("All labs");
    setDifficulty("all");
  }

  return (
    <section
      className={styles.catalog}
      id="lab-catalog"
      aria-label={savedOnly ? "Saved labs" : "Lab catalog"}
    >
      <div className={styles.heading}>
        <div>
          <h2>
            {savedOnly ? "Your collection" : "Explore the labs"}
            <span>{available.length}</span>
          </h2>
          <p>
            {savedOnly
              ? "A little inspiration for your next session."
              : "Browse the published challenge catalog."}
          </p>
        </div>
        {!savedOnly && (
          <Link href="/saved" className={styles.link}>
            <Bookmark size={15} />
            Saved labs
            <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
      <div className={styles.filters}>
        <label className={styles.search}>
          <Search size={18} />
          <span className="sr-only">Search labs</span>
          <input
            aria-label="Search labs"
            placeholder="Search labs, skills, or keywords…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X size={16} />
            </Button>
          )}
        </label>
        <label className={styles.select}>
          <SlidersHorizontal size={16} />
          <span className="sr-only">Difficulty</span>
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="all">All difficulties</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </label>
      </div>
      <div className={styles.controls}>
        <div
          className={styles.categories}
          role="group"
          aria-label="Lab category"
        >
          {categories.map((item) => (
            <button
              key={item}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className={styles.views} role="group" aria-label="Catalog layout">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <LayoutGrid size={17} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List size={18} />
          </Button>
        </div>
      </div>
      <div className={styles.results}>
        <p aria-live="polite">
          Showing <strong>{filtered.length}</strong>{" "}
          {filtered.length === 1 ? "lab" : "labs"}{" "}
          {hasFilters && (
            <button onClick={clearFilters}>
              Clear filters <X size={12} />
            </button>
          )}
        </p>
        <label>
          Sort by:{" "}
          <select
            aria-label="Sort labs"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recommended">Title</option>
            <option value="points">Highest points</option>
          </select>
        </label>
      </div>
      {filtered.length ? (
        <div className={styles.grid} data-layout={view} data-testid="lab-grid">
          {filtered.map((lab) => (
            <LabCard key={lab.slug} lab={lab} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          {savedOnly && available.length === 0 ? (
            <>
              <Bookmark size={32} />
              <h3>Keep your next challenge close.</h3>
              <p>
                Save a lab using its bookmark button. Your collection stays in
                this browser.
              </p>
              <Button asChild>
                <Link href="/labs">
                  Explore labs <ArrowUpRight size={16} />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <SearchX size={32} />
              <h3>No labs found</h3>
              <p>
                Try a different keyword or give your filters a little more room.
              </p>
              <Button variant="secondary" onClick={clearFilters}>
                Reset filters
              </Button>
            </>
          )}
        </div>
      )}
      <p className={styles.disclaimer}>
        Published catalog · availability and scores are provided by the backend.
      </p>
    </section>
  );
}
