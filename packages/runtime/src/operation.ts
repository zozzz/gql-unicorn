import type { Concat, Eval, MergeUnion } from "./common"
import type { Input } from "./type"
import { type Variable } from "./var"

export type Arguments<I> =
    I extends Array<infer V>
        ? Array<Arguments<V>> | Variable
        : I extends Record<string, any>
          ?
                | {
                      [K in keyof I]: K extends string ? Arguments<I[K]> : never
                  }
                | Variable
          : I | Variable

// export type Arguments<I extends Input> = _Arguments<I>
// export type ArgsParam<I extends Input, A extends object> = {
//     [K in keyof I]: A extends { [k in K]: infer V } ? V : never
// }

// export type ArgsParam<I extends Input, A extends Arguments<I>> =
//     | {
//           [K in keyof A]: K extends keyof I ? A[K] : never
//       }
//     | Variable<string>

// TODO: harden: not allowing unknown keys
// eslint-disable-next-line unused-imports/no-unused-vars
export type ArgsParam<I extends Input, A> = A

// type Alma = {
//     and?: Alma[]
//     id?: string
// }

// type AAA = Arguments<Alma>
// type BBB = ToVars<Alma, [], AAA>

// const x: Arguments<Alma> = { id: "", and: [{ id: $$ }] }
// type ZZZ = ToVars<Alma, [], typeof x>

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

type _ToVars<I, P extends string[]> = {
    [K in keyof I]: K extends string ? Prefixed<I[K], [...P, K]> : never
}[keyof I]

type Prefixed<I, P extends string[]> = undefined extends I
    ? { [K in Concat<"__", P>]?: I }
    : { [K in Concat<"__", P>]-?: I }

// type Extract<I, P extends string[], Arg> = Arg extends object ? UnionToIntersection<_Extract<P, I, Arg>> : never

// type _Extract<P extends string[], I, A extends Record<string, any>> = {
//     [K in keyof A]: A[K] extends Variable<infer N>
//         ? K extends keyof I
//             ? N extends "$"
//                 ? K extends string
//                     ? true extends KeyIsRequired<I, K>
//                         ? { [k in Concat<"__", [...P, K]>]-?: I[K] }
//                         : { [k in Concat<"__", [...P, K]>]?: I[K] }
//                     : never
//                 : { [k in N]: I[K] }
//             : never
//         : A[K] extends object
//           ? K extends keyof I
//               ? K extends string
//                   ? _Extract<[...P, K], I[K], A[K]>
//                   : never
//               : never
//           : never
// }[keyof A]

type Extract<I, P extends string[], Arg> = MergeUnion<_Extract<I, P, Arg>>

type _Extract<I, P extends string[], A> = P["length"] extends 5
    ? never
    : A extends Variable<infer N>
      ? N extends "$"
          ? undefined extends I
              ? { [K in Concat<"__", P>]?: I }
              : { [K in Concat<"__", P>]: I }
          : undefined extends I
            ? { [k in N]?: I }
            : { [k in N]: I }
      : A extends Array<infer AV>
        ? I extends Array<infer IV>
            ? _Extract<IV, P, AV>
            : never
        : A extends Record<string, any>
          ? {
                [K in keyof A]: K extends keyof NonNullable<I>
                    ? K extends string
                        ? _Extract<NonNullable<I>[K], [...P, K], A[K]>
                        : never
                    : never
            }[keyof A]
          : never

// export type HasRequiredVar<I> = I extends { [key: string]: any }
//     ? keyof I extends never
//         ? false
//         : { [k in keyof I]: undefined extends I[k] ? never : true }[keyof I]
//     : never

// type KeyIsRequired<T, K> = T extends object
//     ? K extends keyof T
//         ? undefined extends T[K]
//             ? false
//             : true
//         : false
//     : false
