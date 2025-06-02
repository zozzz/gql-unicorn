/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { TypedDocumentNode } from "@graphql-typed-document-node/core"

import type { FlagInclude, FlagRemove, MergeUnion } from "./common"
import type { Input, Operation } from "./operation"
import type { PHANTOM, SELECTION } from "./symbols"
import type { IsAtomic } from "./type"
import type { Vars } from "./var"

type Result = any

export const enum Flag {
    None = 0,
    Buildable = 1,
    WithTn = 2,
    Array = 4
}

export type DefaultContext<T> = Context<null, T, null, Flag.Buildable | Flag.WithTn>

export type Select<C extends AnyContext, R extends Result, V extends Vars> =
    C extends Context<any, infer T, any, infer F> ? _Select<C, T, _AddTypeName<R, F>, V, F> : unknown

type _Select<C extends AnyContext, T, R extends Result, V extends Vars, F extends Flag> = MergeUnion<
    _AddBuildable<IsAtomic<T> extends true ? AtomicSelect<C, T, V> : TypeSelect<C, R, V>, R, V, F> & Selection<R, V>
>

type _AddTypeName<R extends Result, F extends Flag> =
    FlagInclude<F, Flag.WithTn> extends true ? _AddFieldToResult<R, "__typename", string> : R

type _AddFieldToResult<R extends Result, K extends string | null, T> = K extends keyof R
    ? R
    : K extends string
      ? R & Record<K, T>
      : T

type _AddBuildable<T, R extends Result, V extends Vars, F extends Flag> =
    FlagInclude<F, Flag.Buildable> extends true
        ? T extends { $build: (...args: any[]) => any }
            ? T
            : T & Buildable<R, V>
        : T

// type _AddBuildable<T, R extends Result, V extends Vars, F extends Flag> = T

/**
 * ```gql
 * type Query {
 *   hello: String
 * }
 *
 * query { hello }
 * ```
 */
type AtomicSelect<C extends AnyContext, R extends Result, V extends Vars> =
    C extends Context<any, infer T, any, infer F> ? _AddBuildable<{}, T, V, F> : unknown

type TypeSelect<C extends AnyContext, R extends Result, V extends Vars> =
    C extends Context<infer P, infer T, any, infer F>
        ? T extends Record<string, any>
            ? MergeUnion<
                  {
                      [K in keyof T]: K extends keyof R
                          ? never
                          : K extends string
                            ? { readonly [k in K]: Field<Context<C, T[K], K, FlagRemove<F, Flag.Array>>, R, V> }
                            : never
                  }[keyof T]
              >
            : unknown
        : unknown

export type Field<C extends AnyContext, R extends Result, V extends Vars> =
    C extends Context<infer P, infer T, infer N, infer F>
        ? IsAtomic<T> extends true
            ? AtomicField<C, T, R, V>
            : T extends Array<infer A>
              ? _Field<Context<P, T, N, F | Flag.Array>, A, R, V>
              : _Field<C, T, R, V>
        : unknown

type _Field<C extends AnyContext, RT, R extends Result, V extends Vars> =
    RT extends Operation<infer I, infer O> ? _Operation<C, I, O, R, V> : TypeField<C, RT, R, V>

type AtomicField<C extends AnyContext, RT, R extends Result, V extends Vars> =
    C extends Context<infer P, any, infer N, any> ? Select<P, _AddFieldToResult<R, N, RT>, V> : unknown

type TypeField<C extends AnyContext, RT, R extends Result, V extends Vars> =
    C extends Context<infer P, any, any, infer F>
        ? <QR, QV extends Vars>(
              q: (
                  q: Select<Context<C, RT, null, FlagRemove<F, Flag.Array | Flag.Buildable>>, {}, {}>
              ) => Selection<QR, QV>
          ) => Select<P, R & QR, V & QV>
        : unknown

type _Operation<C extends AnyContext, I extends Input, RT, R extends Result, V extends Vars> = unknown

type AtomicOperation<C extends AnyContext, I extends Input, RT, R extends Result, V extends Vars> = unknown

type TypeOperation<C extends AnyContext, I extends Input, RT, R extends Result, V extends Vars> = unknown

type SubSelect<C extends AnyContext, R extends Result, V extends Vars> =
    C extends Context<infer P, infer T, infer N, infer F> ? (q: Select<C, {}, {}>) => Selection<R, V> : unknown

export type Context<P extends AnyContext, T, N extends string | null, F extends Flag> = {
    [PHANTOM]: [P, T, N, F]
}

export type AnyContext = Context<any, any, any, any> | null

export type ContextPath<C> =
    C extends Context<infer P, any, infer N, any>
        ? null extends P
            ? null extends N
                ? []
                : [N]
            : null extends N
              ? ContextPath<P>
              : [...ContextPath<P>, N]
        : []

export type Buildable<R, V extends Vars> = {
    $build: () => TypedDocumentNode<R, V>
    $gql: () => string
}

type Selection<R, V extends Vars> = { [SELECTION]: [R, V] }
