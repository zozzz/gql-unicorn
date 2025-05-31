/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { TypedDocumentNode } from "@graphql-typed-document-node/core"
import type { UnionToIntersection } from "utility-types"

import type { SObject } from "./common"
import type { Input, Operation, OperationKind, Params, ToVars } from "./operation"
import { SELECTION } from "./symbols"
import type { GType, IsInterface, IsUnion, SimpleType } from "./type"
import type { Vars } from "./var"

export type Select<T extends GType, P extends string[], S extends SObject, V extends Vars> =
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
              : unknown

type _Select<T extends SimpleType, P extends string[], S extends SObject, V extends Vars> = SelectBase
    & Selectable<T, P, S, V>
    & Builder<S, V>

export type WithTN = Record<"__typename", string>
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type SelectRoot<T extends GType> = Select<T, [], WithTN, {}>
type SubSelect<T extends GType, P extends string[], V extends Vars> = Select<T, P, WithTN, V>

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

// export type Selected<T extends GqlType, S extends Selection> = {}

interface SelectBase {
    [SELECTION]: Selection
}

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
            ? T[K] extends Operation<infer I, infer O, OperationKind>
                ? O extends Array<infer OO>
                    ? OO extends SimpleType
                        ? SimpleOperationSelect<T, P, S, V, I, OO, K, true>
                        : OtherOperationSelect<T, P, S, V, I, OO, K, true>
                    : O extends SimpleType
                      ? SimpleOperationSelect<T, P, S, V, I, O, K, false>
                      : OtherOperationSelect<T, P, S, V, I, O, K, false>
                : T[K] extends Array<infer I>
                  ? I extends SimpleType
                      ? TypeSelect<T, P, S, V, I, K, true>
                      : never
                  : T[K] extends SimpleType
                    ? TypeSelect<T, P, S, V, T[K], K, false>
                    : Select<T, P, S & Record<K, T[K]>, V>
            : never
}

export type TypeSelect<
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

export type SimpleOperationSelect<
    T extends GType,
    P extends string[],
    S extends SObject,
    V extends Vars,
    I extends Input,
    O extends GType,
    K extends string,
    IsArray extends boolean
> = <TS extends SObject, TV extends Vars, A extends Params<I>>(
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
> = <TV extends Vars, A extends Params<I>>(
    params: A
) => Select<T, P, S & Record<K, IsArray extends true ? O[] : O>, V & TV & ToVars<I, [...P, K], A>>

type Builder<S extends SObject, V extends Vars> = {
    $build: () => TypedDocumentNode<S, V>
    $gql: () => string
}

// type BuilderFn<S extends SObject, V extends Vars> =
//     true extends HasRequiredVar<V>
//         ? (vars: V) => TypedDocumentNode<S, V>
//         : true extends IsEmptyObject<V>
//           ? () => TypedDocumentNode<S, V>
//           : (vars?: V) => TypedDocumentNode<S, V>

// type GqlFn<S extends SObject, V extends Vars> =
//     true extends HasRequiredVar<V>
//         ? (vars: V) => string
//         : true extends IsEmptyObject<V>
//           ? () => string
//           : (vars?: V) => string
