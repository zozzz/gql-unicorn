/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { TypedDocumentNode } from "@graphql-typed-document-node/core"

import type { FlagInclude, FlagRemove, MergeUnion } from "./common"
import type { Input, Operation } from "./operation"
import type { PHANTOM } from "./symbols"
import type { IsAtomic, IsInterface, IsUnion, SimpleType } from "./type"
import type { Vars } from "./var"

type Result = any

export const enum SelectFlags {
    None = 0,
    Buildable = 1,
    WithTn = 2,
    Array = 4
}

export type Select<S extends AnySelf, T, R extends Result, V extends Vars, F extends SelectFlags> =
    IsAtomic<T> extends true
        ? _AtomicSelect<S, T, R, V, F>
        : T extends Array<infer A>
          ? _InitSelect<S, A, R, V, F | SelectFlags.Array>
          : _InitSelect<S, T, R, V, F>

type _InitSelect<S extends AnySelf, T, R extends Result, V extends Vars, F extends SelectFlags> = _Select<
    S,
    T,
    _AddTypeName<R, F>,
    V,
    F
>

type _AddTypeName<R extends Result, F extends SelectFlags> =
    FlagInclude<F, SelectFlags.WithTn> extends true ? _AddFieldToResult<R, "__typename", string> : R

type _AddFieldToResult<R extends Result, K extends string, T> = K extends keyof R ? R : R & Record<K, T>

type _AddBuildable<T, R extends Result, V extends Vars, F extends SelectFlags> =
    FlagInclude<F, SelectFlags.Buildable> extends true ? T & Buildable<R, V> : T

type _Select<S extends AnySelf, T, R extends Result, V extends Vars, F extends SelectFlags> = T extends Function
    ? never
    : T extends Operation<infer I, infer O>
      ? OperationSelect<S, T, R, V, F, I, O>
      : IsInterface<T> extends true
        ? InterfaceSelect<S, T, R, V, F>
        : IsUnion<T> extends true
          ? UnionSelect<S, T, R, V, F>
          : T extends SimpleType
            ? null extends S
                ? TypeSelect<S, T, R, V, F>
                : OperationSelectWoArgs<S, T, R, V, F>
            : never

type _AtomicSelect<S extends AnySelf, T, R extends Result, V extends Vars, F extends SelectFlags> = _AddBuildable<
    AtomicSelect<S, T, R, V, F>,
    R,
    V,
    F
>

interface AtomicSelect<S, T, R, V, F> {
    [PHANTOM]: [S, T, R, V, F]
}

type OperationSelect<
    S extends AnySelf,
    T,
    R extends Result,
    V extends Vars,
    F extends SelectFlags,
    I extends Input,
    O
> = unknown

type UnionSelect<S extends AnySelf, T, R extends Result, V extends Vars, F extends SelectFlags> = unknown

type InterfaceSelect<S extends AnySelf, T, R extends Result, V extends Vars, F extends SelectFlags> = unknown

type TypeSelect<
    S extends AnySelf,
    T extends SimpleType,
    R extends Result,
    V extends Vars,
    F extends SelectFlags
> = MergeUnion<
    {
        [K in keyof T]: K extends keyof R
            ? never
            : K extends string
              ? Record<
                    K,
                    Select<Self<S, T, K, F>, T[K], R, V, FlagRemove<F, SelectFlags.Buildable | SelectFlags.Array>>
                >
              : never
    }[keyof T]
>

type OperationSelectWoArgs<S extends AnySelf, T, R extends Result, V extends Vars, F extends SelectFlags> = "FASZ"

type Buildable<R, V extends Vars> = {
    $build: () => TypedDocumentNode<R, V>
    $gql: () => string
}

type Self<S extends AnySelf, T, N extends string, F extends SelectFlags> = {
    [PHANTOM]: [S, T, N, F]
}

type AnySelf = Self<any, any, any, any> | null

type Path<S> = S extends Self<infer P, any, infer N, any> ? (null extends P ? [N] : [...Path<P>, N]) : []
