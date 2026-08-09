import type { FreelancerSortBy } from "../_lib/api";

export type SearchFilterValues = {
	minTestScore: number | undefined;
	minRating: number | undefined;
	sortBy: FreelancerSortBy;
};

type SearchFiltersProps = {
	values: SearchFilterValues;
	onChange: (values: SearchFilterValues) => void;
};

const SORT_OPTIONS: Array<{ value: FreelancerSortBy; label: string }> = [
	{ value: "relevance", label: "Most Relevant" },
	{ value: "rating", label: "Highest Rated" },
	{ value: "test_score", label: "Highest Expertise Score" },
	{ value: "newest", label: "Newest" }
];

export function SearchFilters({ values, onChange }: SearchFiltersProps) {
	return (
		<div className="mt-4 flex flex-wrap items-center gap-3">
			<select
				value={values.sortBy}
				onChange={(e) => onChange({ ...values, sortBy: e.target.value as FreelancerSortBy })}
				className="rounded-md border border-border-strong bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
			>
				{SORT_OPTIONS.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>

			<select
				value={values.minRating ?? ""}
				onChange={(e) => onChange({ ...values, minRating: e.target.value ? Number(e.target.value) : undefined })}
				className="rounded-md border border-border-strong bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
			>
				<option value="">Any Rating</option>
				<option value="4">4+ Stars</option>
				<option value="3">3+ Stars</option>
				<option value="2">2+ Stars</option>
			</select>

			<select
				value={values.minTestScore ?? ""}
				onChange={(e) => onChange({ ...values, minTestScore: e.target.value ? Number(e.target.value) : undefined })}
				className="rounded-md border border-border-strong bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
			>
				<option value="">Any Expertise Score</option>
				<option value="80">80+ Score</option>
				<option value="60">60+ Score</option>
				<option value="40">40+ Score</option>
			</select>
		</div>
	);
}
