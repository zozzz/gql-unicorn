/* eslint-disable @typescript-eslint/no-empty-object-type */
/**
 * Concatenate strings with separator
 *
 * @example
 * ```ts
 * type C = Concat<".", ["A", "B", "C"]> = "A.B.C"
 * ```
 */
export type Concat<SEP extends string, VALS extends string[]> = VALS extends [
    infer V1 extends string,
    ...infer OV extends string[]
]
    ? OV["length"] extends 0
        ? `${V1}`
        : `${V1}${ConcatTail<SEP, Concat<SEP, OV>>}`
    : never

type ConcatTail<SEP extends string, V extends string> = V extends never ? "" : `${SEP}${V}`

export type SObject = Record<string, unknown>

export type IsEmptyObject<I> = I extends { [key: string]: any } ? (keyof I extends never ? true : false) : never

type AllKeys<T> = T extends any ? keyof T : never

type TypeOfKey<T, TK extends AllKeys<T>> = T extends { [K in TK]?: any } ? T[TK] : never
// const _State: TypeOfKey<Test, "state"> = null as any

// export type MergeUnion<T> = Eval<{ [K in AllKeys<T>]: TypeOfKey<T, K> }>
export type MergeUnion<T> = Eval<{ [K in AllKeys<T>]: TypeOfKey<T, K> }>

export type Eval<T> = T[][number]

/**
 * ```ts
 * const enum Flags { One = 1, Two = 2 }
 * type T = FlagInclude<Flags.One | Falgs.Two, Flags.One>
 * ```
 */
export type FlagInclude<V extends number, F extends number> = F extends V ? true : false

export type FlagRemove<V extends number, F extends number> = Exclude<V, F>

export type FlagAdd<V extends number, F extends number> = V | F

type OptionalPropertyNames<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never }[keyof T]

type SpreadProperties<L, R, K extends keyof L & keyof R> = { [P in K]: L[P] | Exclude<R[P], undefined> }

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

type SpreadTwo<L, R> = Id<
    Pick<L, Exclude<keyof L, keyof R>>
        & Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>>
        & Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>>
        & SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>

export type ObjectSpread<A extends readonly [...any]> = A extends [infer L, ...infer R]
    ? SpreadTwo<L, ObjectSpread<R>>
    : unknown
