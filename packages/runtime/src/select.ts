/* eslint-disable unused-imports/no-unused-vars */
import type { TypedDocumentNode } from "@graphql-typed-document-node/core"
import { type Primitive } from "utility-types"

import type { ExcludeEmpty } from "./common"
import { type ALIAS, SELECTION } from "./symbols"
import type { SimpleType } from "./type"
import type { Vars } from "./var"

// type Result = any

// export const enum Flag {
//     None = 0,
//     Buildable = 1,
//     AutoTn = 2,
//     Array = 4,
//     Optional = 8,
//     OptionalItem = 16
// }

// type AllTypeFlags = Flag.Array | Flag.Optional | Flag.OptionalItem
// type AllCommonFlags = Flag.AutoTn

// export type TypeFlags<T> =
//     | (T extends null ? Flag.Optional : never)
//     | (T extends Array<infer A> ? Flag.Array | (A extends null ? Flag.OptionalItem : never) : never)

// type RebuildType<T, F extends Flag> =
//     FlagInclude<F, Flag.Array> extends true
//         ? FlagInclude<F, Flag.OptionalItem> extends true
//             ? RebuildType<Array<T | null>, FlagRemove<F, Flag.Array | Flag.OptionalItem>>
//             : RebuildType<T[], FlagRemove<F, Flag.Array>>
//         : FlagInclude<F, Flag.Optional> extends true
//           ? T | null
//           : T

// type FlagAsCommon<F> = Extract<F, AllCommonFlags>

// // TODO: more specify selection
// // TODO: build only one level at a time
// export type Select<T, R extends Result, V extends Vars, F extends Flag, P extends string[]> = P["length"] extends 10
//     ? never
//     : IsInterface<T> extends true
//       ? _Select<T, R, V, F, P> & OnType<T, R, V, F, P>
//       : _Select<T, R, V, F, P>

// type _Select<T, R extends Result, V extends Vars, F extends Flag, P extends string[]> =
//     IsAtomic<T> extends true
//         ? AtomicSelect<T, R, V, F, P> & Selection<R, V>
//         : T extends Union<infer UT>
//           ? UnionSelect<T, UT, R, V, F, P> & Selection<R, V>
//           : T extends SimpleType
//             ? TypeSelect<T, R, V, F, P> & Selection<R, V>
//             : unknown

// type _AddFieldToResult<R extends Result, T extends SimpleType, K extends keyof T, V, F extends Flag> =
//     FlagInclude<F, Flag.AutoTn> extends true
//         ? _AddTypedFieldToResult<R, T, K, RebuildType<V, F>>
//         : _AddCommonFieldToResult<R, T, K, RebuildType<V, F>> & { F: F }

// type _AddTypedFieldToResult<R extends Result, T extends SimpleType, K extends keyof T, V> = R extends {
//     __typename: T["__typename"]
// }
//     ? ObjectSpread<[R, Record<K, V>]>
//     : ObjectSpread<[Record<"__typename", T["__typename"]>, Record<K, V>]>

// type _AddCommonFieldToResult<R extends Result, T extends SimpleType, K extends keyof T, V> = R & { [k in K]: V }

// type _AddBuildable<T, R extends Result, V extends Vars, F extends Flag> =
//     FlagInclude<F, Flag.Buildable> extends true
//         ? T extends { $build: (...args: any[]) => any }
//             ? T
//             : T & Buildable<R, V>
//         : T

// type AtomicSelect<T, R extends Result, V extends Vars, F extends Flag, P extends string[]> = _AddBuildable<
//     {},
//     RebuildType<T, F>,
//     V,
//     F
// >

// type TypeSelect<T extends SimpleType, R extends Result, V extends Vars, F extends Flag, P extends string[]> = Omit<
//     _AddBuildable<
//         {
//             readonly [K in keyof T]: K extends string ? Field<T, K, R, V, F, [...P, K]> : never
//         },
//         R,
//         V,
//         F
//     >,
//     FlagInclude<F, Flag.AutoTn> extends true ? keyof R | "__typename" : keyof R
// >

// type UnionSelect<
//     T extends SimpleType,
//     UT,
//     R extends Result,
//     V extends Vars,
//     F extends Flag,
//     P extends string[]
// > = _AddBuildable<
//     {
//         $on: OnFn<T, R, V, F, P>
//     },
//     R,
//     V,
//     F
// >

// type Field<
//     T extends SimpleType,
//     K extends keyof T,
//     R extends Result,
//     V extends Vars,
//     F extends Flag,
//     P extends string[]
// > = T[K] extends Function
//     ? never
//     : T[K] extends Operation<infer I, infer A>
//       ? _OperationField<T, K, R, V, F, P, BareType<A>, TypeFlags<A>, I>
//       : TypeField<T, K, R, V, F, P, BareType<T[K]>, TypeFlags<T[K]>>

// type TypeField<
//     T extends SimpleType,
//     K extends keyof T,
//     R extends Result,
//     V extends Vars,
//     F extends Flag,
//     P extends string[],
//     O,
//     OF extends Flag
// > = O extends SimpleType ? TypeOperationField<T, K, R, V, F, P, O, OF> : AtomicField<T, K, R, V, F, P, O, OF>

// type TypeOperationField<
//     T extends SimpleType,
//     K extends keyof T,
//     R extends Result,
//     V extends Vars,
//     F extends Flag,
//     P extends string[],
//     O extends SimpleType,
//     OF extends Flag
// > = <SR, SV extends Vars>(
//     select: (select: Select<O, {}, {}, FlagAsCommon<F>, P>) => Selection<SR, SV>
// ) => Select<T, _AddFieldToResult<R, T, K, SR, OF | FlagAsCommon<F>>, V & SV, F, RemoveLast<P>>

// type AtomicField<
//     T extends SimpleType,
//     K extends keyof T,
//     R extends Result,
//     V extends Vars,
//     F extends Flag,
//     P extends string[],
//     O,
//     OF extends Flag
// > = Select<T, _AddFieldToResult<R, T, K, O, OF | FlagAsCommon<F>>, V, F, RemoveLast<P>>

// type _OperationField<
//     T extends SimpleType,
//     K extends keyof T,
//     R extends Result,
//     V extends Vars,
//     F extends Flag,
//     P extends string[],
//     O,
//     OF extends Flag,
//     I extends Input
// > = O extends SimpleType ? OperationField<T, K, R, V, F, P, O, OF, I> : AtomicOperationField<T, K, R, V, F, P, O, OF, I>

// type OperationField<
//     T extends SimpleType,
//     K extends keyof T,
//     R extends Result,
//     V extends Vars,
//     F extends Flag,
//     P extends string[],
//     O,
//     OF extends Flag,
//     I extends Input
// > = <SR, SV extends Vars, A extends Arguments<I>>(
//     args: A,
//     select: (select: Select<O, {}, {}, FlagAsCommon<F>, P>) => Selection<SR, SV>
// ) => Select<T, _AddFieldToResult<R, T, K, SR, OF | FlagAsCommon<F>>, V & SV & ToVars<I, P, A>, F, RemoveLast<P>>

// type AtomicOperationField<
//     T extends SimpleType,
//     K extends keyof T,
//     R extends Result,
//     V extends Vars,
//     F extends Flag,
//     P extends string[],
//     O,
//     OF extends Flag,
//     I extends Input
// > = <A extends Arguments<I>>(
//     args: A
// ) => Select<T, _AddFieldToResult<R, T, K, O, OF | FlagAsCommon<F>>, V & ToVars<I, P, A>, F, RemoveLast<P>>

/**
 * !!! XXX csak union vagy interface
 * ```ts
 * Query.users.$on(Type.Worker.workplace({...}, q => q.name))
 * const Pagination = Fragment.Pagintaion.offset.limit
 * Query.users.$on(Pagination)
 * ```
 */
// type OnType<T, R extends Result, V extends Vars, F extends Flag, P extends string[]> =
//     T extends Interface<infer _, infer CT>
//         ? CT extends SimpleType
//             ? {
//                   [TN in CT["__typename"]]: CT extends { __typename: TN } ? { $on: OnFn<T, R, V, F, P> } : never
//               }[CT["__typename"]]
//             : never
//         : never

// type OnFn<T, R extends Result, V extends Vars, F extends Flag, P extends string[]> = <OR, OV extends Vars>(
//     on: Selection<OR, OV>
// ) => Select<T, R | OR, V & OV, F, P>

// export type OnFnResult<R, SR> = R extends { __typename: infer TN }
//     ? SR extends { __typename: TN }
//         ? R & SR
//         : R | SR
//     : never

// export type MaybeBuildable<T, R, V extends Vars, F extends Flag> =
//     FlagInclude<F, Flag.Buildable> extends true ? (T extends { $build: () => any } ? T : T & Buildable<R, V>) : T

// TODO: rename to GQL
export type BuildReturn<OP extends string, T, S extends SelectionDef, V extends Vars> = TypedDocumentNode<
    T extends Primitive ? T : Record<OP, Selected<T, S>>,
    V extends Record<string, any> ? ExcludeEmpty<V> : V
>

// export type TypeOf<T> =
//     T extends TypedDocumentNode<infer R, any>
//         ? R
//         : T extends BuildReturn<infer BT, infer BS, any>
//           ? Selected<BT, BS>
//           : unknown
export type TypeOf<T> = T extends TypedDocumentNode<infer R, never> ? R : unknown
// export type TypeOf<T> = ReturnType<<R, V>(x: TypedDocumentNode<R, V>) => R>
// export type TypeOf<T> = T extends BuildReturn<infer BT, infer BS, any> ? Selected<BT, BS> : unknown
export type VarOf<T> = T extends TypedDocumentNode<any, infer V> ? V : unknown

// export type AddFieldToResult<R, TN extends string, K extends string, V> = R extends { __typename: string }
//     ? ObjectSpread<[R, Record<K, V>]>
//     : ObjectSpread<[Record<"__typename", TN>, Record<K, V>]>

// export type AddFieldToResult<R, TN extends string, K extends string, V> = R extends { __typename: string }
//     ? ObjectSpread<[R, Record<K, V>]>
//     : ObjectSpread<[Record<"__typename", TN>, Record<K, V>]>

// export type AddFieldToResult<R, TN extends string, K extends string, V> =
//     R extends Array<infer RR>
//         ? Array<AddFieldToResult<RR, TN, K, V>>
//         : R extends { __typename: string }
//           ? ObjectSpread<[R, Record<K, V>]>
//           : ObjectSpread<[Record<"__typename", TN>, Record<K, V>]>

// TODO: merge {subField: ["id"]}, {subField: ["name"]}
// currently working without todos, but not so fancy

export type ExtendSelection<S extends SelectionDef, I extends SelectionItem> = S["length"] extends 0
    ? [I]
    : I extends SelectionOn
      ? _ExtendWithOn<S, I>
      : I extends SelectionSub
        ? _ExtendWithSub<S, I>
        : I extends SelectionField
          ? _ExtendWithField<S, I>
          : S

type _ExtendWithOn<S extends SelectionDef, I extends SelectionOn> =
    _HasItem<S, SelectionOn> extends never ? [...S, I] : _UpdateOn<S, I>

type _UpdateOn<S extends SelectionDef, I extends SelectionOn> = S extends [...infer S1 extends SelectionDef, infer S2]
    ? S2 extends SelectionOn
        ? [...S1, { $on: _MergeSub<S2["$on"], I["$on"]> }]
        : [..._UpdateOn<S1, I>, S2]
    : S

type _ExtendWithSub<S extends SelectionDef, I extends SelectionSub> =
    _HasItem<S, SelectionSub> extends never ? [...S, I] : _UpdateSub<S, I>

type _ExtendWithField<S extends SelectionDef, I extends SelectionField> = I extends S[number] ? S : [...S, I]

type _HasItem<S extends SelectionDef, I> = S extends Array<infer V> ? (V extends I ? true : never) : never

type _UpdateSub<S extends SelectionDef, I extends SelectionSub> = S extends [...infer S1 extends SelectionDef, infer S2]
    ? S2 extends SelectionSub
        ? [...S1, _MergeSub<S2, I>]
        : [..._UpdateSub<S1, I>, S2]
    : S

type _MergeSub<A extends SelectionSub, B extends SelectionSub> = {
    [K in keyof A | keyof B]: K extends keyof A & keyof B
        ? MergeSelection<A[K], B[K]>
        : K extends keyof A
          ? A[K]
          : K extends keyof B
            ? B[K]
            : never
}

// type Alma1 = ExtendSelection<[], "id">
// type Alma2 = ExtendSelection<["id", "name"], "id">
// type Alma3 = ExtendSelection<["id"], { $on: { User: ["name"] } }>
// type Alma4 = ExtendSelection<Alma3, { $on: { User: ["name", "id"] } }>
// type Alma5 = ExtendSelection<Alma4, { $on: { Worker: ["org"] } }>
// type Alma6 = ExtendSelection<Alma5, "title">
// type Alma7 = ExtendSelection<Alma6, { child: ["id"] }>
// type Alma8 = ExtendSelection<Alma7, { child: ["name"] }>
// type Alma9 = ExtendSelection<Alma8, { child: [{ $on: { User: ["id"] } }] }>
// type AlmaXXX = Alma9[3]

export type MergeSelection<A extends SelectionDef, B extends SelectionDef> = B["length"] extends 1
    ? ExtendSelection<A, B[0]>
    : B extends [...infer B1 extends SelectionItem[], infer B2 extends SelectionItem]
      ? ExtendSelection<MergeSelection<A, B1>, B2>
      : A

export type Selected<T, S extends SelectionDef> = T extends null
    ? Selected<NonNullable<T>, S> | null
    : T extends Array<infer TA>
      ? Array<Selected<TA, S>>
      : T extends SimpleType
        ? T extends { __typename: infer TN extends string }
            ? /*{ __typename: TN } &*/ _Selected<T, _SelectionByType<TN, S>>
            : never
        : never

type _SelectionByType<TN extends string, S extends SelectionDef> = S extends [
    ...infer S1 extends SelectionDef,
    infer S2 extends SelectionItem
]
    ? S2 extends SelectionOn
        ? S2["$on"][TN] extends infer S2D extends SelectionDef
            ? MergeSelection<_SelectionByType<TN, S1>, S2D>
            : S1["length"] extends 0
              ? never
              : _SelectionByType<TN, S1>
        : ExtendSelection<_SelectionByType<TN, S1>, S2>
    : S

type _Selected<T extends SimpleType, S extends SelectionDef> = OmitNever<{
    [K in keyof T]: S extends Array<infer A>
        ? K extends A
            ? T[K]
            : A extends Record<string, any>
              ? K extends keyof A
                  ? A[K] extends SelectionDef
                      ? Selected<T[K], A[K]>
                      : never
                  : never
              : never
        : never
}>

type OmitNever<T extends Record<string, any>> = Omit<T, NeverKeys<T>>

type NeverKeys<T extends Record<string, any>> = { [K in keyof T]: T[K] extends never ? K : never }[keyof T]

type AliasKeys<T extends Record<string, any>> = {
    [K in keyof T]: Alias<T[K], string> extends T[K] ? K : never
}[keyof T]

type ApplyAlias<T extends Record<string, any>> = {
    [K in keyof T]: T[K] extends Alias<T[K], infer A> ? (A extends string ? Record<A, T[K]> : never) : never
}[keyof T]

// type ApplyAlias<T extends Record<string, any>> = {
//     [K in keyof T]: T[K] extends Alias<T[K], infer A> ? A : never
// }[keyof T]

type Alias<T, N extends string> = T & { [ALIAS]: N }

// TODO: Handle aliases
// export type SelectionDef = Array<string | Record<string, string> | Record<string, SelectionDef>>
export type SelectionDef = SelectionItem[]
export type SelectionItem = SelectionField | SelectionSub | SelectionOn
export type SelectionField = string
export interface SelectionSub {
    [key: string]: SelectionDef
}
export interface SelectionOn {
    $on: SelectionSub
}

export type SelectedFields<S extends SelectionDef> = _FieldFromSelection<S, true>

type _FieldFromSelection<S extends SelectionDef, AllowOn extends boolean> = S extends [
    infer F extends SelectionItem,
    ...infer R extends SelectionDef
]
    ? _SelectionIntoFields<F, AllowOn> | _FieldFromSelection<R, AllowOn>
    : never

type _SelectionIntoFields<I extends SelectionItem, AllowOn extends boolean> = I extends SelectionField
    ? I
    : I extends SelectionSub
      ? keyof I
      : AllowOn extends true
        ? I extends SelectionOn
            ? I["$on"] extends { [key: string]: infer SD extends SelectionDef }
                ? _FieldFromSelection<SD, false>
                : never
            : never
        : never

// export type ExtendSelection<SD extends SelectionDef, P extends string[], K extends string> = P["length"] extends 0
//     ? [...SD, K]
//     : AppendSelectionPath<SD, P, K>

// type AppendSelectionPath<SD extends SelectionDef, P extends string[], K extends string> = P["length"] extends 0
//     ? [...SD, K]
//     : P extends [infer CP extends string, ...infer RP extends string[]]
//       ? SD extends Array<infer SA>
//           ? SA extends { [k in CP]: infer E extends Record<string, SelectionDef> }
//               ? [...SD, AppendNestedPath<E, RP, K>]
//               : P["length"] extends 1
//                 ? [...SD, Record<CP, [K]>]
//                 : [...SD, AppendNestedPath<Record<CP, []>, RP, K>]
//           : never
//       : never

// type AppendNestedPath<SD extends Record<string, SelectionDef>, P extends string[], K extends string> = unknown

export class Selection<T, S extends SelectionDef, V extends Vars> {
    [SELECTION]?: [T, S, V]
}
