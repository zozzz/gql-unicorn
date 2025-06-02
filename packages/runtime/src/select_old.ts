/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { TypedDocumentNode } from "@graphql-typed-document-node/core"
import type { UnionToIntersection } from "utility-types"

import type { SObject } from "./common"
import type { Arguments, Input, Operation, ToVars } from "./operation"
import { type PHANTOM } from "./symbols"
import type { GType, IsAtomic, IsInterface, IsUnion, SimpleType } from "./type"
import type { Vars } from "./var"

// REFACTOR: type fields must call before progress forward
// REFACTOR: builder only on root path, but after the above statement

export type Select<T extends GType, P extends string[], S extends SObject, V extends Vars> =
    IsAtomic<T> extends true ? _AtomicSelect<T, P, S, V> : _TypeSelect<T, P, S, V>

type _TypeSelect<T extends GType, P extends string[], S extends SObject, V extends Vars> =
    T extends Array<infer A>
        ? A extends GType
            ? Select<A, P, S, V>
            : never
        : IsInterface<T> extends true
          ? // TODO:
            never
          : IsUnion<T> extends true
            ? // TODO:
              never
            : T extends SimpleType
              ? _Select<T, P, S, V>
              : never

type _AtomicSelect<T extends GType, P extends string[], S extends SObject, V extends Vars> = Builder<T, V>
// & PhantomSelect<T, P, S, V>

type _Select<T extends SimpleType, P extends string[], S extends SObject, V extends Vars> = Selectable<T, P, S, V>
    & Builder<S, V>

export type WithTN = Record<"__typename", string>
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type SelectRoot<T extends GType> = Select<T, [], WithTN, {}>
type SubSelect<T extends GType, P extends string[], V extends Vars> = Select<T, P, WithTN, V>
type Unselectable<T, P extends string[], S extends SObject, V extends Vars> = null extends T ? null : T

type PhantomSelect<T, P extends string[], S extends SObject, V extends Vars> = {
    [PHANTOM]: [T, P, S, V]
}

/**
 * ```typescript
 * const PagingFragment = fragment<Type.PagingInfo>("PagingInfo").offset.limit
 *
 * function generalPaging(select: AnySelect) {
 * }
 * ```
 */
export type AnySelect = Select<any, any, any, any>

/**
 * ```typescript
 * const PagingFragment = fragment<Type.PagingInfo>("PagingInfo").offset.limit
 * const Error = fragment<Type.Error>("Error").message.code
 *
 * function generalPaging(select: SelectConstraint<PagingFragment & Error>) {
 * }
 *
 * function generalPaging(select: SelectConstraint<PagingFragment | Error>) {
 * }
 *
 * const PartialUser = fragment<Type.User>("User").name.email
 *
 * function something(userSelect: SelectConstraint<PartialUser>) {
 * }
 * ```
 */
export type SelectConstraint<X> = Select<any, any, any, any>

type Selectable<T extends SimpleType, P extends string[], S extends SObject, V extends Vars> = Omit<
    // TODO: support union & interface
    _Selectable<S, RemapKeys<T, P, S, V>>,
    "__typename"
>
type _Selectable<S extends SObject, R> = UnionToIntersection<
    {
        [K in keyof R]: K extends keyof S ? never : Record<K, R[K]>
    }[keyof R]
>

type RemapKeys<T extends SimpleType, P extends string[], S extends SObject, V extends Vars> = {
    [K in keyof T]: K extends "__typename"
        ? never
        : T[K] extends Function
          ? never
          : K extends string
            ? T[K] extends Operation<infer I, infer O>
                ? O extends Array<infer OO>
                    ? FieldSelectWithArgs<T, P, S, V, I, OO, K, true>
                    : FieldSelectWithArgs<T, P, S, V, I, O, K, false>
                : T[K] extends Array<infer I>
                  ? I extends SimpleType
                      ? FieldSelect<T, P, S, V, I, K, true>
                      : unknown
                  : T[K] extends SimpleType
                    ? FieldSelect<T, P, S, V, T[K], K, false>
                    : Select<T, P, S & Record<K, T[K]>, V>
            : unknown
}

export type FieldSelect<
    T extends GType,
    P extends string[],
    S extends SObject,
    V extends Vars,
    O extends SimpleType,
    K extends string,
    IsArray extends boolean
> = <TS extends SObject, TV extends Vars>(
    q: (q: SubSelect<O, [...P, K], V>) => Select<O, any, TS, TV>
) => Select<T, P, S & Record<K, IsArray extends true ? TS[] : TS>, V & TV>

export type FieldSelectWithArgs<
    T extends GType,
    P extends string[],
    S extends SObject,
    V extends Vars,
    I extends Input,
    O,
    K extends string,
    IsArray extends boolean
> =
    IsAtomic<O> extends true
        ? OtherOperationSelect<T, P, S, V, I, O, K, IsArray>
        : O extends SimpleType
          ? SimpleOperationSelect<T, P, S, V, I, O, K, IsArray>
          : unknown

export type SimpleOperationSelect<
    T extends GType,
    P extends string[],
    S extends SObject,
    V extends Vars,
    I extends Input,
    O extends GType,
    K extends string,
    IsArray extends boolean
> = <TS extends SObject, TV extends Vars, A extends Arguments<I>>(
    params: A,
    q?: (q: SubSelect<O, [...P, K], V>) => Select<O, any, TS, TV>
) => Select<T, P, S & Record<K, IsArray extends true ? TS[] : TS>, V & TV & ToVars<I, [...P, K], A>>

export type OtherOperationSelect<
    T extends GType,
    P extends string[],
    S extends SObject,
    V extends Vars,
    I extends Input,
    O,
    K extends string,
    IsArray extends boolean
> = <A extends Arguments<I>>(
    params: A
) => Select<T, P, S & Record<K, IsArray extends true ? O[] : O>, V & ToVars<I, [...P, K], A>>

type Builder<S, V extends Vars> = {
    $build: () => TypedDocumentNode<S, V>
    $gql: () => string
}
