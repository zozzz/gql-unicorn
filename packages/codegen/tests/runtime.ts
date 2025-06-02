/* eslint-disable @stylistic/js/max-len */
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

            testQuery<{ __typename: string; id: string }, { id: string }>(
                G.Query.user({ id: G.$ }).id,
                `query($id:ID!){user(id:$id){__typename,id}}`
            )

            testQuery<{ __typename: string; id: string }, { id: string }>(
                G.Query.user(G.$).id,
                `query($id:ID!){user(id:$id){__typename,id}}`
            )

            testQuery<{ __typename: string; id: string }, { prefix__id: string }>(
                G.Query.user(G.$("prefix")).id,
                `query($prefix__id:ID!){user(id:$prefix__id){__typename,id}}`
            )

            testQuery<{ __typename: string; id: string }, { userId: string }>(
                G.Query.user({ id: G.$("userId") }).id,
                `query($userId:ID!){user(id:$userId){__typename,id}}`
            )

            testQuery<{ __typename: string; articles: Array<{ __typename: string; id: string }> }, { id: string }>(
                G.Query.user(G.$).articles({ count: 1 }, q => q.id),
                `query($id:ID!){user(id:$id){__typename,articles(count:1){__typename,id}}}`
            )

            testQuery<
                { __typename: string; articles: Array<{ __typename: string }> },
                { id: string; articles__count: number }
            >(
                G.Query.user(G.$).articles({ count: G.$ }, q => q.id),
                `query($id:ID!,$articles__count:Int!){user(id:$id){__typename,articles(count:$articles__count){__typename,id}}}`
            )

            testQuery<
                { __typename: string; articles: Array<{ __typename: string }> },
                { id: string; articles__count: number }
            >(
                G.Query.user(G.$).articles(G.$, q => q.id),
                `query($id:ID!,$articles__count:Int!){user(id:$id){__typename,articles(count:$articles__count){__typename,id}}}`
            )

            testQuery<
                { __typename: string; articles: Array<{ __typename: string }> },
                { id: string; articleCount: number }
            >(
                G.Query.user(G.$).articles({ count: G.$("articleCount") }, q => q.id),
                `query($id:ID!,$articleCount:Int!){user(id:$id){__typename,articles(count:$articleCount){__typename,id}}}`
            )
        })

        test("scalar operation return", () => {
            testQuery<{ __typename: string; distance: number }, { id: string }>(
                G.Query.location(G.$).distance({ lat: 1, lng: 2, unit: G.DistanceUnit.METRIC }),
                'query($id:ID!){location(id:$id){__typename,distance(lat:1,lng:2,unit:"METRIC")}}'
            )

            type DistanceUnit = import("./__generated__/runtime").DistanceUnit
            testQuery<{ __typename: string; distance: number }, { id: string; distance__unit: DistanceUnit }>(
                G.Query.location(G.$).distance({ lat: 1, lng: 2, unit: G.$ }),
                "query($id:ID!,$distance__unit:DistanceUnit!){location(id:$id){__typename,distance(lat:1,lng:2,unit:$distance__unit)}}"
            )
        })

        test("query scalar opertaion return w/o parameters", () => {
            testQuery<string | null, {}>(G.Query.currentUserId, `query{currentUserId}`)
        })

        test("some fields", () => {
            testQuery<{ __typename: string; id: string; name: string }, { id: string }>(
                G.Query.user(G.$).id.name,
                `query($id:ID!){user(id:$id){__typename,id,name}}`
            )
        })

        test("articles", () => {
            type ArticleFilter = import("./__generated__/runtime").ArticleFilter

            // Query.articles({count: 1}).id.name.$build()
            // Query.currentUserId.$build()
            // Query.articlesWithoutParams.id.name.$build()
            // Query.atomicWithParam({id: 1}).$build()
            // G.Query.currentUserId.$build()
            // const x = G.Query.articles(G.$).id.title.tags(q => q.tag).$build()
            // type Alma = typeof x extends TypedDocumentNode<infer X, any> ? X : never

            testQuery<
                { __typename: string; id: string; tags: Array<{ __typename: string; tag: string }> | null },
                { id: string; filter: ArticleFilter }
            >(
                G.Query.articles(G.$).id.tags(q => q.tag),
                `query($filter:ArticleFilter){articles(filter:$filter){__typename,id,tags{__typename,tag}}}`
            )

            // TODO: WRONG, because tags must select fields
            // testQuery<{ __typename: string; id: string; tags: Tag[] | null }, { id: string; filter: ArticleFilter }>(
            //     G.Query.articles(G.$).id.tags,
            //     `query($filter:ArticleFilter){articles(filter:$filter){__typename,id,tags}}`
            // )

            // WRONG
            // testQuery<{ __typename: string; tags: Tag[] | null }, { id: string; filter: ArticleFilter }>(
            //     G.Query.articles(G.$).tags,
            //     `query($filter:ArticleFilter){articles(filter:$filter){__typename,id,tags}}`
            // )

            // WRONG
            // testQuery<{ __typename: string; tags: Tag[] | null }, { id: string; filter: ArticleFilter }>(
            //     G.Query.articles(G.$).tags.id,
            //     `query($filter:ArticleFilter){articles(filter:$filter){__typename,id,tags}}`
            // )
        })

        test("self recursive 1/1", () => {
            testQuery<
                {
                    __typename: string
                    id: string
                    hqName: string
                    parent: { __typename: string; id: string; hqName: string } | null
                },
                {}
            >(
                G.Query.afc.id.hqName.parent(q => q.id.hqName),
                `query{afc{__typename,id,hqName,parent{__typename,id,hqName}}}`
            )
        })

        test("self recursive 1/2", () => {
            testQuery<
                {
                    __typename: string
                    id: string
                    hqName: string
                    parent: { __typename: string; id: string; hqName: string } | null
                },
                {}
            >(
                G.Query.afc.id.parent(q => q.id.hqName).hqName,
                `query{afc{__typename,id,hqName,parent{__typename,id,hqName}}}`
            )
        })

        test("self recursive 1/3", () => {
            testQuery<
                {
                    __typename: string
                    id: string
                    hqName: string
                    parent: { __typename: string; id: string; hqName: string } | null
                },
                {}
            >(
                G.Query.afc.parent(q => q.id.hqName).id.hqName,
                `query{afc{__typename,id,hqName,parent{__typename,id,hqName}}}`
            )
        })

        test("self recursive 2", () => {
            testQuery<
                {
                    __typename: string
                    id: string
                    hqName: string
                    parent: {
                        __typename: string
                        id: string
                        hqName: string
                        parent: { __typename: string; id: string } | null
                    } | null
                },
                {}
            >(
                G.Query.afc.id.hqName.parent(q => q.id.hqName.parent(q => q.id)),
                `query{afc{__typename,id,hqName,parent{__typename,id,hqName}}}`
            )
        })
    })

    describe("mutation", () => {
        test("scalar opertaion return w parameters", () => {
            testQuery<number | null, { something: string | undefined }>(
                G.Mutation.doSomething(G.$),
                `mutation($something:String){doSomething(something:$something)}`
            )
        })

        test("update article", () => {
            type ArticleUpdate = import("./__generated__/runtime").ArticleUpdate
            testQuery<{ id: string }, { id: string; params: ArticleUpdate }>(
                G.Mutation.updateArticle(G.$).id,
                `mutation($id:ID!,$params:ArticleUpdate!){updateArticle(id:$id,params:$params){__typename,id}}`
            )
        })
    })
})
