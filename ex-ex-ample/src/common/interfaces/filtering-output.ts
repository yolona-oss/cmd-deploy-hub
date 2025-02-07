export interface FilteringOutput<T> {
    documents: T[],
    totalPages: number,
    page: number
}
