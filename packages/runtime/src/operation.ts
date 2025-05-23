import type { RequiredKeys, UnionToIntersection } from "utility-types"

import type { Concat } from "./common"
import { checker, OPERATION } from "./symbols"
import type { GqlType } from "./type"
import type { Variable } from "./var"

export type Input = Record<string, unknown>
export type Output = GqlType | GqlType[]

export type Operation<I extends Input, O extends Output, IsQuery extends boolean> = O & { [OPERATION]: true }
export type OpQuery<I extends Input, O extends Output> = Operation<I, O, true>
export type OpMutation<I extends Input, O extends Output> = Operation<I, O, false>

export type Params<I extends Input> = _Params<I> | Variable<undefined>

type _Params<I extends Input> = {
    [K in keyof I]: K extends string ? (I[K] extends Input ? _Params<I[K]> : I[K] | Variable<any>) : never
}

export type Vars = Record<string, any>

export type ToVars<I, P extends string[], Arg> =
    Arg extends Variable<undefined>
        ? MaybePrefixed<I, P>
        : Arg extends Variable<infer N>
          ? N extends string
              ? MaybePrefixed<I, [N]>
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
                      ? { [k in K]: I[K] } extends Pick<I, K>
                          ? { [k in Concat<"__", [...P, K]>]?: I[K] }
                          : { [k in Concat<"__", [...P, K]>]: I[K] }
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

export type ParamsInput<I> = I extends object
    ? keyof I extends never
        ? undefined
        : RequiredKeys<I> extends never
          ? I | undefined
          : I
    : never

export const isOperation = checker<Operation<any, any, boolean>>(OPERATION)

type Operations = Array<Operation<any, any, boolean>>

export function operations<OS extends Operations>() {}

export function operation<O extends Operation<any, any, boolean>>() {}
