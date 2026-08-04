import type { Concat, Eval, MergeUnion } from "./common"
import { type StripVariable, type Variable } from "./var"

// type Arguments<I, D extends unknown[] = []> = D["length"] extends 10 ? I | Variable
// +     : I extends Array<infer V> ? Array<Arguments<V, D>> | Variable
// +     : I extends Record<string, any> ? {
// +         [K in keyof I]: K extends string ? Arguments<I[K], [...D, unknown]> : never;
// +     } | Variable : I | Variable;

// export type Arguments<I, D extends unknown[] = []> = D["length"] extends 10
//     ? never
//     : I extends Array<infer V>
//       ? Array<Arguments<V, [...D, unknown]>> | Variable
//       : I extends Record<string, any>
//         ?
//               | {
//                     [K in keyof I]: K extends string ? Arguments<I[K], [...D, unknown]> : never
//                 }
//               | Variable
//         : I | Variable

export type Arguments<I, T> = (T & { [K in keyof I]: K extends keyof T ? I[K] : never }) | Variable

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

// export type ArgsParam<I extends Input, A> = A

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

// export type ToVars<I, P extends string[], Arg> = Extract<I, P, Arg>

// type ExtractVars<I, P extends string[], Arg> =
//     Arg extends Variable<infer N>
//         ? Record<N, I>
//         : Arg extends Array<infer AV>
//           ? I extends Array<infer IV>
//               ? ExtractVars<IV, P, AV>
//               : never
//           : Arg extends Record<string, any>
//             ? {
//                   [K in keyof Arg]: K extends keyof NonNullable<I>
//                       ? ExtractVars<NonNullable<I>[K], [...P, K & string], Arg[K]>
//                       : never
//               }[keyof Arg]
//             : never

export type ToVars<I, P extends string[], Arg> = Eval<
    Arg extends Variable<infer N> ? (N extends "$" ? _ToVars<I, P> : _ToVars<I, [N]>) : Extract<I, P, Arg>
>

type _ToVars<I, P extends string[]> = {
    [K in keyof I]: K extends string ? Prefixed<I[K], [...P, K]> : never
}[keyof I]

type Prefixed<I, P extends string[]> = undefined extends I
    ? { [K in Concat<"__", P>]?: I }
    : { [K in Concat<"__", P>]-?: I }

type Extract<I, P extends string[], Arg> = MergeUnion<_Extract<I, P, Arg>>
type ____Extract<I, P extends string[], Arg> = UnionToIntersection<_Extract<I, P, Arg>>

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

type _Extract<I, P extends string[], A> =
    A extends Variable<infer N>
        ? N extends "$"
            ? undefined extends I
                ? { [K in Concat<"__", P>]?: StripVariable<I> }
                : { [K in Concat<"__", P>]: StripVariable<I> }
            : undefined extends I
              ? { [k in N]?: StripVariable<I> }
              : { [k in N]: StripVariable<I> }
        : A extends Array<infer AV>
          ? _ExtractArray<Clean<I>, P, AV>
          : A extends Record<string, any>
            ? //   {
              //       [K in keyof A]: K extends string ? _Extract<ExtractProp<I, K>, [...P, K], A[K]> : never
              //   }[keyof A]
              _ExtractRecord<Clean<I>, P, A>
            : never

// type ExtractProp<I, K extends string> = (I extends null | undefined ? never : I) extends infer U
//     ? U extends any
//         ? K extends keyof U
//             ? U[K]
//             : never
//         : never
//     : never

// type ExtractArrayItem<I> = (I extends null | undefined ? never : I) extends infer U
//     ? U extends any
//         ? U extends Array<infer Item>
//             ? Item
//             : never
//         : never
//     : never
type _ExtractArray<I, P extends string[], AV> = I extends Array<infer IV> ? _Extract<IV, P, AV> : never

type _ExtractRecord<I, P extends string[], A> = {
    [K in keyof A]: K extends keyof I ? (K extends string ? _Extract<I[K], [...P, K], A[K]> : never) : never
}[keyof A]

type Clean<T> = [T] extends [infer U]
    ? U extends Variable
        ? never
        : U extends Variable | infer Rest
          ? Rest extends undefined | null
              ? never
              : NonNullable<Rest>
          : never
    : never

// type NonVariable<T> = [T] extends [Variable] ? never : T
// type NonVariable<T> = T extends any ? (T extends Variable ? never : T) : never

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
