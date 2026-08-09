"use client";

import { FormEvent, useState } from "react";
import { searchFreelancers, type FreelancerSearchResult, type FreelancerSortBy } from "../_lib/api";
import { FreelancerCard } from "./FreelancerCard";
import { SearchFilters, type SearchFilterValues } from "./SearchFilters";

export function ConsultantSearch() {
	const [searchQuery, setSearchQuery] = useState("");
	const [filters, setFilters] = useState<SearchFilterValues>({
		minTestScore: undefined,
		minRating: undefined,
		sortBy: "relevance"
	});
	const [searchResults, setSearchResults] = useState<FreelancerSearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [hasSearched, setHasSearched] = useState(false);

	async function runSearch(query: string, currentFilters: SearchFilterValues) {
		setIsSearching(true);
		setSearchError(null);
		setHasSearched(true);
		try {
			const results = await searchFreelancers({
				query: query || undefined,
				minTestScore: currentFilters.minTestScore,
				minRating: currentFilters.minRating,
				sortBy: currentFilters.sortBy
			});
			setSearchResults(results);
		} catch (err: any) {
			setSearchError(String(err?.message || "Failed to search freelancers"));
			setSearchResults([]);
		} finally {
			setIsSearching(false);
		}
	}

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!searchQuery.trim() && !filters.minTestScore && !filters.minRating) return;
		runSearch(searchQuery, filters);
	}

	function handleFiltersChange(next: SearchFilterValues) {
		setFilters(next);
		if (hasSearched) {
			runSearch(searchQuery, next);
		}
	}

	return (
		<div className="mt-8">
			<h2 className="text-xl font-semibold tracking-tight text-text-primary">Find Consultants</h2>
			<p className="mt-1 text-sm text-text-body">Search for consultants by name, skill, or area of expertise.</p>

			<form onSubmit={handleSubmit} className="mt-6">
				<div className="flex gap-3">
					<div className="relative flex-1">
						<svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search by name, skill, or expertise..."
							className="w-full rounded-lg border border-border-strong bg-base pl-12 pr-4 py-3.5 text-base text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
						/>
					</div>
					<button
						type="submit"
						disabled={isSearching}
						className="rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-on-accent hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
					>
						{isSearching ? "Searching..." : "Search"}
					</button>
				</div>
			</form>

			<SearchFilters values={filters} onChange={handleFiltersChange} />

			{searchError && <p className="mt-4 text-sm text-accent">{searchError}</p>}

			{hasSearched && !isSearching && searchResults.length === 0 && !searchError && (
				<div className="mt-8 rounded-lg border border-border bg-bg-soft p-8 text-center">
					<p className="text-sm text-text-body">No consultants found. Try different search terms or filters.</p>
				</div>
			)}

			{searchResults.length > 0 && (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{searchResults.map((freelancer) => (
						<FreelancerCard key={freelancer.id} freelancer={freelancer} showFavoriteButton />
					))}
				</div>
			)}
		</div>
	);
}
