const API_BASE_URL =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5001/api'
    : (import.meta.env.VITE_API_URL || 'http://localhost:5001/api');

import { useState, useEffect } from 'react';

interface SiteContent { [key: string]: string }

const STORAGE_KEY = 'rks_site_content_cache';

// Synchronously read persistent cache from localStorage (0ms lag on page refresh)
const getStoredContent = (): SiteContent => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// In-memory cache
let cachedContent: SiteContent = getStoredContent();
let fetchPromise: Promise<SiteContent> | null = null;

const saveStoredContent = (data: SiteContent) => {
  cachedContent = data;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }
};

const loadContent = (): Promise<SiteContent> => {
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch(`${API_BASE_URL}/site-content`)
    .then(r => r.json())
    .then(json => {
      if (json.success && json.content) {
        saveStoredContent(json.content);
      }
      fetchPromise = null;
      return cachedContent;
    })
    .catch(() => {
      fetchPromise = null;
      return cachedContent;
    });

  return fetchPromise;
};

/** Invalidate local & in-memory cache */
export const invalidateSiteContentCache = () => {
  cachedContent = {};
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
  fetchPromise = null;
};

/**
 * Hook to get a single site image URL.
 * Synchronously defaults to stored localStorage image on first frame -> ZERO FLICKER!
 */
export function useSiteImage(key: string, defaultUrl: string): string {
  const [url, setUrl] = useState<string>(() => {
    const stored = cachedContent[key];
    return stored || defaultUrl;
  });

  useEffect(() => {
    loadContent().then(content => {
      if (content[key]) {
        setUrl(content[key]);
      }
    });
  }, [key]);

  return url;
}

/**
 * Hook to get ALL site content at once (images + descriptions).
 * Synchronously defaults to stored localStorage content -> ZERO FLICKER!
 */
export function useSiteContent(): { content: SiteContent; loading: boolean } {
  const [content, setContent] = useState<SiteContent>(() => cachedContent);
  const [loading, setLoading] = useState<boolean>(() => Object.keys(cachedContent).length === 0);

  useEffect(() => {
    loadContent().then(data => {
      setContent(data);
      setLoading(false);
    });
  }, []);

  return { content, loading };
}
