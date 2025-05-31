/* eslint-disable @typescript-eslint/no-empty-object-type */
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { TypedDocumentNode } from "@graphql-typed-document-node/core"
import { beforeAll, describe, expect, test } from "bun:test"
import { buildSchema, parse } from "graphql"

import { transform } from "../src/transform"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type Query<TD> = { $build(): TD; $gql(): string }

function testQuery<O, V>(query: Query<TypedDocumentNode<O, V>>, x: string) {
    const gql = query.$gql()
    console.log(gql)
    expect(parse(gql)).toBeDefined()
    expect(gql).toBe(x)
}

describe("runtime", () => {
    let G: typeof import("./__generated__/runtime")

    beforeAll(async () => {
        const schemaContent = await Bun.file(path.join(__dirname, "runtime.graphql")).text()
        const result = transform(buildSchema(schemaContent), { output: "" })
        const outPath = path.join(__dirname, "__generated__", "runtime.ts")
        await mkdir(path.dirname(outPath), { recursive: true })
        await Bun.file(outPath).write(result)
        G = await import("./__generated__/runtime")
    })

    describe("query", () => {
        test("variables", () => {
            testQuery<{ __typename: string; id: string; name: string }, {}>(
                G.Query.user({ id: "1" }).id.name,
                `query{user(id:"1"){__typename,id,name}}`
            )

            testQuery<{ __typename: string }, { id: string }>(G.Query.user({ id: G.$ }), `query($id:ID!){user(id:$id)}`)

            testQuery<{ __typename: string }, { id: string }>(G.Query.user(G.$), `query($id:ID!){user(id:$id)}`)

            testQuery<{ __typename: string }, { prefix__id: string }>(
                G.Query.user(G.$("prefix")),
                `query($prefix__id:ID!){user(id:$prefix__id)}`
            )

            testQuery<{ __typename: string }, { userId: string }>(
                G.Query.user({ id: G.$("userId") }),
                `query($userId:ID!){user(id:$userId)}`
            )

            testQuery<{ __typename: string; articles: Array<{ __typename: string }> }, { id: string }>(
                G.Query.user(G.$).articles({ count: 1 }),
                `query($id:ID!){user(id:$id){__typename,articles(count:1)}}`
            )

            testQuery<
                { __typename: string; articles: Array<{ __typename: string }> },
                { id: string; articles__count: number }
            >(
                G.Query.user(G.$).articles({ count: G.$ }),
                `query($id:ID!,$articles__count:Int!){user(id:$id){__typename,articles(count:$articles__count)}}`
            )

            testQuery<
                { __typename: string; articles: Array<{ __typename: string }> },
                { id: string; articles__count: number }
            >(
                G.Query.user(G.$).articles(G.$),
                `query($id:ID!,$articles__count:Int!){user(id:$id){__typename,articles(count:$articles__count)}}`
            )

            testQuery<
                { __typename: string; articles: Array<{ __typename: string }> },
                { id: string; articleCount: number }
            >(
                G.Query.user(G.$).articles({ count: G.$("articleCount") }),
                `query($id:ID!,$articleCount:Int!){user(id:$id){__typename,articles(count:$articleCount)}}`
            )
        })

        test("scalar operation return", () => {
            testQuery<{ __typename: string; distance: number }, { id: string }>(
                G.Query.location(G.$).distance({ lat: 1, lng: 2, unit: G.DistanceUnit.METRIC }),
                ""
            )

            // eslint-disable-next-line unused-imports/no-unused-vars
            const x = G.DistanceUnit.METRIC
            testQuery<{ __typename: string; distance: number }, { id: string; distance__unit: typeof x }>(
                G.Query.location(G.$).distance({ lat: 1, lng: 2, unit: G.$ }),
                ""
            )
        })

        test("query scalar opertaion return w/o parameters", () => {
            // TODO
            testQuery<string, {}>(G.Query.currentUserId, `query{currentUser}`)
        })

        test("articles", () => {
            testQuery<{ __typename: string; id: string; tags: Array<{ __typename: string }> }, { id: string }>(
                G.Query.articles(G.$).id.tags,
                ``
            )
        })
    })

    describe("mutation", () => {
        test("scalar opertaion return w parameters", () => {
            // TODO
            testQuery<number, {}>(G.Mutation.doSomething(G.$), `query{currentUser}`)
        })
    })
})
