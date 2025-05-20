export type Query<I extends Array<any>, R> = (...args: I) => R
export type Queries = Record<string, Query<any, any>>

export function query<Q extends Queries>(): Q {
    return new Proxy(builder(), QueryProxy) as unknown as Q
}

const QueryProxy = {}

export type QueryBuilder<T> = {}

export function builder<T>() {
    return {} as unknown as QueryBuilder<T>
}
