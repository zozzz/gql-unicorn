/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { UnionToIntersection } from "utility-types"

import type { Concat } from "./common"
import type { Select, WithTN } from "./select"
import { OPERATION } from "./symbols"
import type { GType } from "./type"
import type { Variable, Vars } from "./var"

export type Input = Record<string, unknown>
export type Output = GType

// TODO: remove
export const enum OperationKind {
    /**
     * ```graphql
     * type Query {
     *   users(...): [User]
     * }
     * ```
     */
    Query = 1,

    /**
     * ```graphql
     * type Mutation {
     *   saveUser(...): User
     * }
     * ```
     */
    Mutation = 2,

    /**
     * ```graphql
     * type Subscription {
     *   users(...): [User]
     * }
     * ```
     */
    Subscription = 3,

    /**
     * ```graphql
     * type User {
     *   articles(...): [Article]
     * }
     * ```
     */
    Function = 4
}

export type Operation<I extends Input, O extends Output, K extends OperationKind> = O & {
    [OPERATION]: OP<I, O, K>
}
export type OpQuery<I extends Input, O extends Output> = Operation<I, O, OperationKind.Query>
export type OpMutation<I extends Input, O extends Output> = Operation<I, O, OperationKind.Mutation>
export type OpSubscription<I extends Input, O extends Output> = Operation<I, O, OperationKind.Subscription>
export type OpFunction<I extends Input, O extends Output> = Operation<I, O, OperationKind.Function>

export type Params<I extends Input> = _Params<I> | Variable<any>

type _Params<I extends Input> = {
    [K in keyof I]: K extends string ? (I[K] extends Input ? _Params<I[K]> : I[K] | Variable<any>) : never
}

// TODO: optimalize
export type ToVars<I, P extends string[], Arg> =
    Arg extends Variable<undefined>
        ? UnionToIntersection<{ [K in keyof I]: K extends string ? MaybePrefixed<I[K], [...P, K]> : never }[keyof I]>
        : Arg extends Variable<infer N>
          ? N extends string
              ? UnionToIntersection<{ [K in keyof I]: K extends string ? MaybePrefixed<I[K], [N, K]> : never }[keyof I]>
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
export type Operations = Record<string, Operation<any, any, OperationKind>>

export type OperationBuilder<O extends Operations> = {
    [K in keyof O]: O[K] extends Operation<infer I, infer O, OperationKind> ? OperationFn<I, O, [], {}> : never
}

type OperationFn<I extends Input, O extends Output, P extends string[], V extends Vars> = <A extends Params<I>>(
    params: A
) => Select<O, P, WithTN, V & ToVars<I, P, A>>

// export function operation<O extends Operation<any, any, OperationKind>>() {}

// export type OperationCall<O extends Operation<any, any, OperationKind>> = {}

/**
 * ```gql
 * query ($varName: String) {
 *   users(varName: $varName) {id, name}
 * }
 * ```
 *
 * Support
 * ```typescript
 * const __Operations = {
 *   [OperationKind.Query]: {
 *     users: {varName: "String"}
 *   },
 *   [OperationKind.Mutation]: {},
 *   [OperationKind.Function]: {
 *     "User.tags": {count: "Int"}
 *   }
 * }
 * ```
 */
class OP<I extends Input, O extends Output, Kind extends OperationKind> {
    #i?: I
    #o?: O
    #io?: Kind
}

// type Strict = { strict: string }
// type Optional = { optional?: string }

// type xx1 = HasRequiredKey<Strict>
// type x1 = true extends HasRequiredKey<Strict> ? "OK" : "NO"
// type xx2 = HasRequiredKey<Optional>
// type x2 = true extends HasRequiredKey<Optional> ? "OK" : "NO"
// type xx3 = HasRequiredKey<Strict | Optional>
// type x3 = true extends HasRequiredKey<Strict | Optional> ? "OK" : "NO"
// type x4 = true extends HasRequiredKey<{}> ? "OK" : "NO"
// type xx4 = HasRequiredKey<{}>

type KeyIsRequired<T, K> = T extends object
    ? K extends keyof T
        ? undefined extends T[K]
            ? false
            : true
        : false
    : false
