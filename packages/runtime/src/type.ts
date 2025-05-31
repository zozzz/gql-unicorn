import type { INTERFACE, Is, UNION } from "./symbols"

export type GType = SimpleType | SimpleType[] | AtomicType
export type AtomicType = number | string | boolean | null
export type SimpleType = Record<string, unknown> & { __typename: string }

/**
 * ```graphql
 * type User {
 * }
 * ```
 */
export type IsSimple<T extends GType> =
    IsUnion<T> extends true ? false : IsInterface<T> extends true ? false : T extends SimpleType ? true : false

/**
 * ```graphql
 * union User = UserA | UserB
 * ```
 */
export type IsUnion<T extends GType> = Is<typeof UNION, T>

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
export type IsInterface<T extends GType> = Is<typeof INTERFACE, T>

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
    [INTERFACE]: true
    __typename: Impls["__typename"]
}

// maybe = Select<T>
export type TypeBuilder<T> =
    T extends Record<string, GType>
        ? {
              /* fragment | on type */
          }
        : never

// type User = {
//     __typename: "User"
//     id: string
//     username: string
// }

// type Role = {
//     __typename: "Role"
//     id: string
//     rolename: string
// }

// type Object = {
//     __typename: "Object"
//     id: string
// }

// type UnionTest = Union< User | Role | Object>
// type XXX = IsUnion<UnionTest>
// type YYY = IsUnion<User>
// type vvv = Extract<UnionTest["__typename"], "Users">
// type vvv = UnionToIntersection<UnionTest>

// type IsMultiTypename<T extends string> = { [K in T]: Exclude<T, K> }[T]

// type X = Exclude<"hello" | "world", "hello">

// type alma = IsMultiTypename<UnionTest["__typename"]>
// type alma = IsMultiTypename<"hello">
// type alma = IsMultiTypename<User["__typename"]>
// type alma = UnionTest["__typename"] extends string ? "OK" : "NOT OK"
// type alma = string extends UnionTest["__typename"] & undefined ? "OK" : "NOT OK"
// type alma = string extends User["username"] ? "OK" : "NOT OK"
