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
        expect(transform(schema, { output: "" })).toMatchSnapshot()
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
        expect(transform(schema, { output: "" })).toMatchSnapshot()
    })

    test("mutation without parameters", () => {
        const schema = buildSchema(/* GraphQL */ `
            type Mutation {
                someMutaionThing: String!
            }
        `)
        expect(transform(schema, { output: "" })).toMatchSnapshot()
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
        expect(transform(schema, { output: "" })).toMatchSnapshot()
    })

    test("subscription without parameters", () => {
        const schema = buildSchema(/* GraphQL */ `
            type Subscription {
                onChangeSomething: String!
            }
        `)
        expect(transform(schema, { output: "" })).toMatchSnapshot()
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
        expect(transform(schema, { output: "" })).toMatchSnapshot()
    })
})
