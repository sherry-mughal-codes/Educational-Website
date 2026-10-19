'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  initialQuery = '',
  placeholder = 'Search Class 9 & 10 notes, past papers, or topics...',
  className = '',
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`search-form ${className}`} role="search">
      <label htmlFor="search-input" className="sr-only">
        Search FBISE educational resources
      </label>
      <div className="search-input-wrapper">
        <svg
          className="search-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          id="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="search-input"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="search-clear-btn"
            title="Clear search query"
            aria-label="Clear search input"
          >
            ×
          </button>
        )}
        <button
          type="submit"
          className="search-submit-btn"
          title="Search resources"
          aria-label="Submit search"
        >
          Search
        </button>
      </div>
    </form>
  );
}
