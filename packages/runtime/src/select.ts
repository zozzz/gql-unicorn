/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { TypedDocumentNode } from "@graphql-typed-document-node/core"

import type { FlagInclude, FlagRemove, ObjectSpread } from "./common"
import type { Arguments, ToVars } from "./operation"
import type { SELECTION } from "./symbols"
import type { BareType, Input, Interface, IsAtomic, IsInterface, Operation, SimpleType } from "./type"
import type { Vars } from "./var"

type Result = any

export const enum Flag {
    None = 0,
    Buildable = 1,
    AutoTn = 2,
    Array = 4,
    Optional = 8,
    OptionalItem = 16
}

type AllTypeFlags = Flag.Array | Flag.Optional | Flag.OptionalItem
type AllCommonFlags = Flag.AutoTn

export type TypeFlags<T> =
    | (T extends null ? Flag.Optional : never)
    | (T extends Array<infer A> ? Flag.Array | (A extends null ? Flag.OptionalItem : never) : never)

type RebuildType<T, F extends Flag> =
    FlagInclude<F, Flag.Array> extends true
        ? FlagInclude<F, Flag.OptionalItem> extends true
            ? RebuildType<Array<T | null>, FlagRemove<F, Flag.Array | Flag.OptionalItem>>
            : RebuildType<T[], FlagRemove<F, Flag.Array>>
        : FlagInclude<F, Flag.Optional> extends true
          ? T | null
          : T

type FlagAsCommon<F> = Extract<F, AllCommonFlags>

// TODO: more specify selection
// TODO: build only one level at a time
export type Select<T, R extends Result, V extends Vars, F extends Flag, P extends string[]> = P["length"] extends 10
    ? never
    : IsInterface<T> extends true
      ? _Select<T, R, V, F, P> & OnType<T, R, V, F, P>
      : _Select<T, R, V, F, P>

type _Select<T, R extends Result, V extends Vars, F extends Flag, P extends string[]> =
    IsAtomic<T> extends true
        ? AtomicSelect<T, R, V, F, P> & Selection<R, V>
        : T extends SimpleType
          ? TypeSelect<T, R, V, F, P> & Selection<R, V>
          : unknown

type _AddFieldToResult<R extends Result, T extends SimpleType, K extends keyof T, V, F extends Flag> =
    FlagInclude<F, Flag.AutoTn> extends true
        ? _AddTypedFieldToResult<R, T, K, RebuildType<V, F>>
        : _AddCommonFieldToResult<R, T, K, RebuildType<V, F>> & { F: F }

type _AddTypedFieldToResult<R extends Result, T extends SimpleType, K extends keyof T, V> = R extends {
    __typename: T["__typename"]
}
    ? ObjectSpread<[R, Record<K, V>]>
    : ObjectSpread<[Record<"__typename", T["__typename"]>, Record<K, V>]>

type _AddCommonFieldToResult<R extends Result, T extends SimpleType, K extends keyof T, V> = R & { [k in K]: V }

type _AddBuildable<T, R extends Result, V extends Vars, F extends Flag> =
    FlagInclude<F, Flag.Buildable> extends true
        ? T extends { $build: (...args: any[]) => any }
            ? T
            : T & Buildable<R, V>
        : T

type AtomicSelect<T, R extends Result, V extends Vars, F extends Flag, P extends string[]> = _AddBuildable<
    {},
    RebuildType<T, F>,
    V,
    F
>

type TypeSelect<T extends SimpleType, R extends Result, V extends Vars, F extends Flag, P extends string[]> = Omit<
    _AddBuildable<
        {
            readonly [K in keyof T]: K extends string ? Field<T, K, R, V, F, [...P, K]> : never
        },
        R,
        V,
        F
    >,
    FlagInclude<F, Flag.AutoTn> extends true ? keyof R | "__typename" : keyof R
>

type Field<
    T extends SimpleType,
    K extends keyof T,
    R extends Result,
    V extends Vars,
    F extends Flag,
    P extends string[]
> = T[K] extends Function
    ? never
    : T[K] extends Operation<infer I, infer A>
      ? _OperationField<T, K, R, V, F, P, BareType<A>, TypeFlags<A>, I>
      : TypeField<T, K, R, V, F, P, BareType<T[K]>, TypeFlags<T[K]>>

type TypeField<
    T extends SimpleType,
    K extends keyof T,
    R extends Result,
    V extends Vars,
    F extends Flag,
    P extends string[],
    O,
    OF extends Flag
> = O extends SimpleType ? TypeOperationField<T, K, R, V, F, P, O, OF> : AtomicField<T, K, R, V, F, P, O, OF>

type TypeOperationField<
    T extends SimpleType,
    K extends keyof T,
    R extends Result,
    V extends Vars,
    F extends Flag,
    P extends string[],
    O extends SimpleType,
    OF extends Flag
> = <SR, SV extends Vars>(
    select: (select: Select<O, {}, {}, FlagAsCommon<F>, P>) => Selection<SR, SV>
) => Select<T, _AddFieldToResult<R, T, K, SR, OF | FlagAsCommon<F>>, V & SV, F, RemoveLast<P>>

type AtomicField<
    T extends SimpleType,
    K extends keyof T,
    R extends Result,
    V extends Vars,
    F extends Flag,
    P extends string[],
    O,
    OF extends Flag
> = Select<T, _AddFieldToResult<R, T, K, O, OF | FlagAsCommon<F>>, V, F, RemoveLast<P>>

type _OperationField<
    T extends SimpleType,
    K extends keyof T,
    R extends Result,
    V extends Vars,
    F extends Flag,
    P extends string[],
    O,
    OF extends Flag,
    I extends Input
> = O extends SimpleType ? OperationField<T, K, R, V, F, P, O, OF, I> : AtomicOperationField<T, K, R, V, F, P, O, OF, I>

type OperationField<
    T extends SimpleType,
    K extends keyof T,
    R extends Result,
    V extends Vars,
    F extends Flag,
    P extends string[],
    O,
    OF extends Flag,
    I extends Input
> = <SR, SV extends Vars, A extends Arguments<I>>(
    args: A,
    select: (select: Select<O, {}, {}, FlagAsCommon<F>, P>) => Selection<SR, SV>
) => Select<T, _AddFieldToResult<R, T, K, SR, OF | FlagAsCommon<F>>, V & SV & ToVars<I, P, A>, F, RemoveLast<P>>

type AtomicOperationField<
    T extends SimpleType,
    K extends keyof T,
    R extends Result,
    V extends Vars,
    F extends Flag,
    P extends string[],
    O,
    OF extends Flag,
    I extends Input
> = <A extends Arguments<I>>(
    args: A
) => Select<T, _AddFieldToResult<R, T, K, O, OF | FlagAsCommon<F>>, V & ToVars<I, P, A>, F, RemoveLast<P>>

/**
 * !!! XXX csak union vagy interface
 * ```ts
 * Query.users.$on(Type.Worker.workplace({...}, q => q.name))
 * const Pagination = Fragment.Pagintaion.offset.limit
 * Query.users.$on(Pagination)
 * ```
 */
type OnType<T, R extends Result, V extends Vars, F extends Flag, P extends string[]> =
    T extends Interface<infer _, infer CT>
        ? CT extends SimpleType
            ? {
                  [TN in CT["__typename"]]: CT extends { __typename: TN } ? { $on: OnFn<T, R, V, F, P, CT> } : never
              }[CT["__typename"]]
            : never
        : never

type OnFn<T, R extends Result, V extends Vars, F extends Flag, P extends string[], O> = <OR, OV extends Vars>(
    on: Selection<OR, OV>
) => Select<T, R | OR, V & OV, F, P>

export type Buildable<R, V extends Vars> = {
    $build: () => TypedDocumentNode<R, V>
    $gql: () => string
}

export interface Selection<R, V extends Vars> {
    [SELECTION]: [R, V]
}

type Last<P extends string[]> = P extends [...any, infer L] ? L : never
type RemoveLast<P extends string[]> = P extends [...infer A, any] ? A : never
