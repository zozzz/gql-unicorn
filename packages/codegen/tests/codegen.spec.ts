import { describe, expect, test } from "bun:test"
import { buildSchema } from "graphql"

import { transform } from "../src/transform"

describe("codegen", () => {
    test("query without parameters", () => {
        const schema = buildSchema(/* GraphQL */ `
            type Query {
                "Curent user"
                currentUser: User
            }

            type User {
                "User id"
                id: ID!
                name: String!
            }
        `)
        expect(transform(schema)).toMatchSnapshot()
    })

    test("query with parameters", () => {
        const schema = buildSchema(/* GraphQL */ `
            type Query {
                user(id: ID!): User
            }

            type User {
                "User id"
                id: ID!
                name: String!
            }
        `)
        expect(transform(schema)).toMatchSnapshot()
    })

    test("mutation without parameters", () => {
        const schema = buildSchema(/* GraphQL */ `
            type Mutation {
                someMutaionThing: String!
            }
        `)
        expect(transform(schema)).toMatchSnapshot()
    })

    test("mutation with parameters", () => {
        const schema = buildSchema(/* GraphQL */ `
            type Query {
                updateUser(id: ID!, name: String!): User
            }

            type User {
                "User id"
                id: ID!
                name: String!
            }
        `)
        expect(transform(schema)).toMatchSnapshot()
    })

    test("subscription without parameters", () => {
        const schema = buildSchema(/* GraphQL */ `
            type Subscription {
                onChangeSomething: String!
            }
        `)
        expect(transform(schema)).toMatchSnapshot()
    })

    test("subscription with parameters", () => {
        const schema = buildSchema(/* GraphQL */ `
            type Subscription {
                onChangeSomething(type: String!): SomeEvent!
            }

            type SomeEvent {
                id: ID!
            }
        `)
        expect(transform(schema)).toMatchSnapshot()
    })

    test("Optional array", () => {
        const schema = buildSchema(/* GraphQL */ `
            type Query {
                users(filter: UserFilter): [User!]!
            }

            type User {
                id: ID!
            }

            type UserFilter {
                ids: [ID!]
            }
        `)
        expect(transform(schema)).toMatchSnapshot()
    })

    test("import scalar", () => {
        const schema = buildSchema(/* GraphQL */ `
            scalar JSON

            type Query {
                user: User
            }

            type User {
                id: ID!
                data: JSON!
            }
        `)
        const scalars = {
            JSON: { import: "JsonType", from: "some-package-name" }
        }
        expect(transform(schema, { scalars })).toMatchSnapshot()
    })

    test("import scalar with alias", () => {
        const schema = buildSchema(/* GraphQL */ `
            scalar JSON

            type Query {
                user: User
            }

            type User {
                id: ID!
                data: JSON!
            }
        `)
        const scalars = {
            JSON: { import: "JsonType", from: "some-package-name", alias: "SomeJsonTypeAlias" }
        }
        expect(transform(schema, { scalars })).toMatchSnapshot()
    })
})
