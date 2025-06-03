import type { INTERFACE, Is, OPERATION, UNION } from "./symbols"

export type GType = SimpleType | SimpleType[] | AtomicType
export type AtomicType = number | string | boolean | null
export type SimpleType = Record<string, unknown> & { __typename: string }
export type BareType<T> = T extends null ? BareType<NonNullable<T>> : T extends Array<infer A> ? BareType<A> : T

/**
 * ```graphql
 * type User {
 * }
 * ```
 */
export type IsSimple<T> =
    IsUnion<T> extends true ? false : IsInterface<T> extends true ? false : T extends SimpleType ? true : false

/**
 * ```graphql
 * union User = UserA | UserB
 * ```
 */
export type IsUnion<T> = Is<typeof UNION, T>

// type HasMultiTypename<T extends string> = { [K in T]: Exclude<T, K> extends never ? false : true }[T]

/**
 * ```graphql
 * # graphql
 * interface IUser {}
 * union AnotherUnion = TagS | TagB
 * union User = UserA | UserB | IUser | AnotherUnion
 * ```
 *
 * ```typescript
 * // typescript
 * type User = Union<[UserA, UserB]>
 * ```
 */
export type Union<T extends SimpleType> = T & { [UNION]: true }

/**
 * ```graphql
 * interface IObject { id: ID! }
 * type User implements IObject { id: ID!, name: String }
 * type Tag implements IObject { id: ID!, tag: String }
 * ```
 */
export type IsInterface<T> = Is<typeof INTERFACE, T>

/**
 * ```graphql
 * interface IObject { id: ID! }
 * type User implements IObject { id: ID!, name: String }
 * type Tag implements IObject { id: ID!, tag: String }
 * ```
 *
 * ```typescript
 * // typescript
 * type User = { __typename: "User", id: string, name: string }
 * type Tag = { __typename: "Tag", id: string, tag: string }
 *
 * export type IObject = Interface<{id: string}, User | Tag>
 * ```
 */
export type Interface<I extends Record<string, unknown>, Impls extends SimpleType> = I & {
    [INTERFACE]: Impls
    __typename: Impls["__typename"]
}

export type Input = Record<string, unknown>
export type Operation<I extends Input, O extends GType> = O & {
    [OPERATION]: [I, O]
}

export type IsOperation<T> = Is<typeof OPERATION, T>

export type IsAtomic<T> =
    IsOperation<T> extends true
        ? false
        : T extends Array<infer V>
          ? V extends GType
              ? IsAtomic<V>
              : false
          : T extends { __typename: string }
            ? false
            : true
