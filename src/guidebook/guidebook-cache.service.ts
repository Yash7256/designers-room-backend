import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

export interface CachedJson<T> {
  value: T;
  json: string;
  etag: string;
}

export interface CachedContent {
  content: string;
  contentType: string;
  sizeBytes: number;
  etag: string;
}

const DEFAULT_TTL_SECONDS = 60;

@Injectable()
export class GuidebookCacheService {
  private readonly ttlMs: number;
  private readonly lists = new Map<string, { entry: CachedJson<unknown>; expiresAt: number }>();
  private readonly details = new Map<string, { entry: CachedJson<unknown>; expiresAt: number }>();
  private readonly contents = new Map<string, { entry: CachedContent; expiresAt: number }>();
  private readonly listFlights = new Map<string, Promise<CachedJson<unknown>>>();
  private readonly detailFlights = new Map<string, Promise<CachedJson<unknown>>>();
  private readonly contentFlights = new Map<string, Promise<CachedContent>>();
  private generation = 0;

  constructor(config: ConfigService) {
    this.ttlMs = config.get<number>('GUIDEBOOK_CACHE_TTL_SECONDS', DEFAULT_TTL_SECONDS) * 1000;
  }

  getList<T>(key: string, load: () => Promise<T>): Promise<CachedJson<T>> {
    return this.getJson(this.lists, this.listFlights, key, load, 50);
  }

  getDetail<T>(key: string, load: () => Promise<T>): Promise<CachedJson<T>> {
    return this.getJson(this.details, this.detailFlights, key, load, 100);
  }

  getContent(key: string, load: () => Promise<CachedContent>): Promise<CachedContent> {
    if (this.ttlMs <= 0) return load();
    const cached = this.contents.get(key);
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.entry);
    if (cached) this.contents.delete(key);
    const flight = this.contentFlights.get(key);
    if (flight) return flight;
    const generation = this.generation;
    const promise = load().then((entry) => {
      if (generation === this.generation) this.store(this.contents, key, entry, 500);
      return entry;
    }).finally(() => this.contentFlights.delete(key));
    this.contentFlights.set(key, promise);
    return promise;
  }

  invalidateAll(): void {
    this.generation += 1;
    this.lists.clear();
    this.details.clear();
    this.contents.clear();
  }

  private getJson<T>(
    cache: Map<string, { entry: CachedJson<unknown>; expiresAt: number }>,
    flights: Map<string, Promise<CachedJson<unknown>>>,
    key: string,
    load: () => Promise<T>,
    maxEntries: number,
  ): Promise<CachedJson<T>> {
    if (this.ttlMs <= 0) return load().then((value) => this.makeJson(value));
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.entry as CachedJson<T>);
    if (cached) cache.delete(key);
    const flight = flights.get(key);
    if (flight) return flight as Promise<CachedJson<T>>;
    const generation = this.generation;
    const promise = load().then((value) => {
      const entry = this.makeJson(value);
      if (generation === this.generation) this.store(cache, key, entry, maxEntries);
      return entry;
    }).finally(() => flights.delete(key));
    flights.set(key, promise);
    return promise;
  }

  private makeJson<T>(value: T): CachedJson<T> {
    const json = JSON.stringify(value);
    return { value, json, etag: `"${createHash('sha1').update(json).digest('hex')}"` };
  }

  private store<T>(
    cache: Map<string, { entry: T; expiresAt: number }>,
    key: string,
    entry: T,
    maxEntries: number,
  ): void {
    if (!cache.has(key) && cache.size >= maxEntries) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, { entry, expiresAt: Date.now() + this.ttlMs });
  }
}
