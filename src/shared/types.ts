export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  /** Precomputed so clients never have to do ceil() arithmetic themselves. */
  totalPages: number;
}

export type SupportedLanguage = 'hi' | 'en' | 'bho' | 'mai' | 'ur';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export function paginate<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
