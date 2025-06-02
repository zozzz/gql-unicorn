/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { UnionToIntersection } from "utility-types"

import type { Concat, MergeUnion } from "./common"
import { type Select } from "./select"
import type { GType, Input, Operation } from "./type"
import type { Variable, Vars } from "./var"

export type Arguments<I extends Input> = _Arguments<I> | Variable<any>

type _Arguments<I extends Input> = {
    [K in keyof I]: K extends string ? (I[K] extends Input ? _Arguments<I[K]> : I[K] | Variable<any>) : never
}

// TODO: optimalize
export type ToVars<I, P extends string[], Arg> =
    Arg extends Variable<undefined>
        ? MergeUnion<{ [K in keyof I]: K extends string ? MaybePrefixed<I[K], [...P, K]> : never }[keyof I]>
        : Arg extends Variable<infer N>
          ? N extends string
              ? MergeUnion<{ [K in keyof I]: K extends string ? MaybePrefixed<I[K], [N, K]> : never }[keyof I]>
              : never
          : Extract<I, P, Arg>

type MaybePrefixed<I, P extends string[]> = P["length"] extends 0 ? I : { [K in Concat<"__", P>]: I }

type Extract<I, P extends string[], Arg> = Arg extends object ? UnionToIntersection<_Extract<P, I, Arg>> : never

type _Extract<P extends string[], I, A> = {
    [K in keyof A]: A[K] extends Variable<infer N>
        ? K extends keyof I
            ? N extends string
                ? { [k in N]: I[K] }
                : N extends undefined
                  ? K extends string
                      ? true extends KeyIsRequired<I, K>
                          ? { [k in Concat<"__", [...P, K]>]-?: I[K] }
                          : { [k in Concat<"__", [...P, K]>]?: I[K] }
                      : never
                  : never
            : never
        : A[K] extends object
          ? K extends keyof I
              ? K extends string
                  ? _Extract<[...P, K], I[K], A[K]>
                  : never
              : never
          : never
}[keyof A]

export type HasRequiredVar<I> = I extends { [key: string]: any }
    ? keyof I extends never
        ? false
        : { [k in keyof I]: undefined extends I[k] ? never : true }[keyof I]
    : never

// TODO: maybe not export
export type Operations = Record<string, Operation<any, any>>

export type OperationBuilder<O extends Operations> = {
    // [K in keyof O]: O[K] extends Operation<infer I, infer O> ? OperationFn<I, O, [], {}> : Select<O[K], [], WithTN, {}>
    [K in keyof O]: O[K] extends Operation<infer I, infer O> ? OperationFn<I, O, [], {}> : Select<O[K], [], WithTN, {}>
}

type OperationFn<I extends Input, O extends GType, P extends string[], V extends Vars> = <A extends Arguments<I>>(
    params: A
) => Select<O, [], WithTN, V & ToVars<I, P, A>>

type KeyIsRequired<T, K> = T extends object
    ? K extends keyof T
        ? undefined extends T[K]
            ? false
            : true
        : false
    : false
