export interface PaginationParams<Cursor = string | null> {
  limit: number;
  cursor?: Cursor | null;
}

export interface PaginatedResult<T, Cursor = string | null> {
  items: T[];
  nextCursor: Cursor | null;
}
