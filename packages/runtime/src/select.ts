import type { TypedDocumentNode } from "@graphql-typed-document-node/core"

import { SELECTION, SELECTION_DEF } from "./symbols"

// TODO: rename to GQL
// export type BuildReturn<OP extends string, T, S extends SelectionDef, V extends Vars> = TypedDocumentNode<
//     Record<OP, Selected<T, S>>,
//     V extends Record<string, any> ? ExcludeEmpty<V> : V
// >

export type BuildReturn<OP extends string, T, V> = TypedDocumentNode<Record<OP, T>, V>

// export type TypeOf<T> =
//     T extends TypedDocumentNode<infer R, any>
//         ? R
//         : T extends BuildReturn<infer BT, infer BS, any>
//           ? Selected<BT, BS>
//           : unknown
export type TypeOf<T> =
    T extends TypedDocumentNode<infer R, never> ? R : T extends Selection<infer R, any> ? R : unknown
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

export type ExtendSelection<S extends SelectionDef, I extends SelectionItem> = I extends SelectionOn
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

export type LetSelectionDef<SD extends SelectionDef> = {
    [SELECTION_DEF]: SD
}

export type GetSelectionDef<T> = T extends { [SELECTION_DEF]: infer SD extends SelectionDef } ? SD : never

export class Selection<T, V> {
    [SELECTION]?: [T, V]
}

export type IsSelected<S extends SelectionDef, ON extends string, K extends string, V> = NeverToUnknown<
    _IsSelected<S, ON, K, V>
>

type NeverToUnknown<T> = [T] extends [never] ? unknown : T

type _IsSelected<S extends SelectionDef, ON extends string, K extends string, V> =
    S extends Array<infer A>
        ? K extends A
            ? V
            : A extends { $on: infer O extends { [k in ON]: SelectionDef } }
              ? IsSelected<O[ON], never, K, V>
              : A extends Record<string, any>
                ? K extends keyof A
                    ? V
                    : never
                : never
        : never

export type SubSelection<S extends SelectionDef, K extends string> =
    S extends Array<infer A>
        ? A extends Record<string, any>
            ? K extends keyof A
                ? A[K] extends SelectionDef
                    ? A[K]
                    : never
                : never
            : never
        : never

export type VariantSelection<S extends SelectionDef, TN extends string, common extends string[]> = S extends [
    ...infer S1 extends SelectionDef,
    infer S2 extends SelectionItem
]
    ? S2 extends SelectionOn
        ? TN extends keyof S2["$on"]
            ? MergeSelection<VariantSelection<S1, TN, common>, S2["$on"][TN]>
            : VariantSelection<S1, TN, common>
        : S2 extends common[number]
          ? MergeSelection<VariantSelection<S1, TN, common>, [S2]>
          : keyof S2 extends common[number]
            ? MergeSelection<VariantSelection<S1, TN, common>, [S2]>
            : VariantSelection<S1, TN, common>
    : []

export type FlattenOnSelection<S extends SelectionDef, TN extends string> = S extends [
    infer I extends SelectionItem,
    ...infer SD extends SelectionDef
]
    ? I extends SelectionOn
        ? TN extends keyof I["$on"]
            ? MergeSelection<FlattenOnSelection<SD, TN>, I["$on"][TN]>
            : FlattenOnSelection<SD, TN>
        : [I, ...FlattenOnSelection<SD, TN>]
    : []
