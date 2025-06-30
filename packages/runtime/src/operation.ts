import type { UnionToIntersection } from "utility-types"

import type { Concat, Eval } from "./common"
import type { Input } from "./type"
import type { Variable } from "./var"

export type Arguments<I extends Input> = _Arguments<I> | Variable<any>

type _Arguments<I extends Input> = {
    [K in keyof I]: K extends string ? (I[K] extends Input ? _Arguments<I[K]> : I[K] | Variable<any>) : never
}

// TODO: optimalize
// export type ToVars<I, P extends string[], Arg> =
//     Arg extends Variable<infer N>
//         ? N extends "$"
//             ? MergeUnion<{ [K in keyof I]: K extends string ? MaybePrefixed<I[K], [...P, K]> : never }[keyof I]>
//             : MergeUnion<{ [K in keyof I]: K extends string ? MaybePrefixed<I[K], [N, K]> : never }[keyof I]>
//         : Extract<I, P, Arg>

export type ToVars<I, P extends string[], Arg> = Eval<
    Arg extends Variable<infer N> ? (N extends "$" ? _ToVars<I, P> : _ToVars<I, [N]>) : Extract<I, P, Arg>
>

type _ToVars<I, P extends string[]> = { [K in keyof I]: K extends string ? Prefixed<I[K], [...P, K]> : never }[keyof I]

type Prefixed<I, P extends string[]> = undefined extends I
    ? { [K in Concat<"__", P>]?: I }
    : { [K in Concat<"__", P>]-?: I }

type Extract<I, P extends string[], Arg> = Arg extends object ? UnionToIntersection<_Extract<P, I, Arg>> : never

type _Extract<P extends string[], I, A extends Record<string, any>> = {
    [K in keyof A]: A[K] extends Variable<infer N>
        ? K extends keyof I
            ? N extends "$"
                ? K extends string
                    ? true extends KeyIsRequired<I, K>
                        ? { [k in Concat<"__", [...P, K]>]-?: I[K] }
                        : { [k in Concat<"__", [...P, K]>]?: I[K] }
                    : never
                : { [k in N]: I[K] }
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

type KeyIsRequired<T, K> = T extends object
    ? K extends keyof T
        ? undefined extends T[K]
            ? false
            : true
        : false
    : false
