/* eslint-disable @stylistic/js/max-len */
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { TypeOf } from "@gql-unicorn/runtime"
import type { TypedDocumentNode } from "@graphql-typed-document-node/core"
import { beforeAll, describe, expect, test } from "bun:test"
import { buildSchema, parse } from "graphql"

import { transform } from "../src/transform"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function testQuery<O, V>(query: TypedDocumentNode<O, V>, x: string) {
    const gql = `${query as any}`
    // console.log(gql)
    expect(parse(gql)).toBeDefined()
    expect(gql).toBe(x)
}

describe("runtime", () => {
    let G: typeof import("./__generated__/runtime")

    beforeAll(async () => {
        const schemaContent = await Bun.file(path.join(__dirname, "runtime.graphql")).text()
        const result = transform(buildSchema(schemaContent))
        const outPath = path.join(__dirname, "__generated__", "runtime.ts")
        await mkdir(path.dirname(outPath), { recursive: true })
        await Bun.file(outPath).write(result)
        G = await import("./__generated__/runtime")
    })

    describe("query", () => {
        describe("all argument combinations", () => {
            test("type", () => {
                testQuery<{ __typename: "AFC"; id: string }, never>(
                    G.queryAfc(q => q.id),
                    `query{afc{__typename,id}}`
                )
            })

            test("type + arg", () => {
                testQuery<{ __typename: "Location"; id: string } | null | undefined, { id: string }>(
                    G.queryLocation({ id: G.$$ }, q => q.id),
                    `query($id:ID!){location(id:$id){__typename,id}}`
                )
            })

            test("type + name", () => {
                testQuery<{ __typename: "AFC"; id: string }, never>(
                    G.queryAfc("QueryName", q => q.id),
                    `query QueryName{afc{__typename,id}}`
                )
            })

            test("type + name + arg", () => {
                testQuery<{ __typename: "Location"; id: string } | null | undefined, { id: string }>(
                    G.queryLocation("LocName", { id: G.$$ }, q => q.id),
                    `query LocName($id:ID!){location(id:$id){__typename,id}}`
                )
            })

            test("scalar", () => {
                testQuery<string | null | undefined, never>(G.queryCurrentUserId(), `query{currentUserId}`)
            })

            test("scalar + arg", () => {
                testQuery<string | null | undefined, { id: string }>(
                    G.queryAtomicArgsScalar({ id: G.$$ }),
                    `query($id:ID){atomicArgsScalar(id:$id)}`
                )
            })

            test("scalar + name", () => {
                test("scalar", () => {
                    testQuery<string | null | undefined, never>(
                        G.queryCurrentUserId("GetCurrentUserId"),
                        `query GetCurrentUserId{currentUserId}`
                    )
                })
            })

            test("scalar + name + arg", () => {
                testQuery<string | null | undefined, { id: string }>(
                    G.queryAtomicArgsScalar("XYZ", { id: G.$$ }),
                    `query XYZ($id:ID){atomicArgsScalar(id:$id)}`
                )
            })

            test("queryAtomicArgsScalar 1", () => {
                testQuery<string | null | undefined, never>(
                    G.queryAtomicArgsScalar("Atomic", { id: "1" }),
                    `query Atomic{atomicArgsScalar(id:"1")}`
                )
            })

            test("queryAtomicArgsScalar $", () => {
                testQuery<string | null | undefined, { id: string }>(
                    G.queryAtomicArgsScalar("Atomic", G.$$),
                    `query Atomic($id:ID){atomicArgsScalar(id:$id)}`
                )
            })

            test("queryAtomicArgsScalar {id:$}", () => {
                testQuery<string | null | undefined, { id: string }>(
                    G.queryAtomicArgsScalar("Atomic", { id: G.$$ }),
                    `query Atomic($id:ID){atomicArgsScalar(id:$id)}`
                )
            })

            test("queryAtomicArgsScalar {id:$} - name", () => {
                testQuery<string | null | undefined, { id: string }>(
                    G.queryAtomicArgsScalar({ id: G.$$ }),
                    `query($id:ID){atomicArgsScalar(id:$id)}`
                )
            })

            describe("all args optional & omit", () => {
                test("type without name", () => {
                    testQuery<Array<{ __typename: "AFC"; id: string }>, never>(
                        G.queryFilterAfc(q => q.id),
                        `query{filterAfc{__typename,id}}`
                    )
                })

                test("type with name", () => {
                    testQuery<Array<{ __typename: "AFC"; id: string }>, never>(
                        G.queryFilterAfc("qAFC", q => q.id),
                        `query qAFC{filterAfc{__typename,id}}`
                    )
                })

                test("scalar without name", () => {
                    testQuery<string | null, never>(G.queryAtomicArgsScalar(), `query{atomicArgsScalar}`)
                })

                test("scalar with name", () => {
                    testQuery<string | null, never>(G.queryAtomicArgsScalar("XYZ"), `query XYZ{atomicArgsScalar}`)
                })

                test("field", () => {
                    testQuery<Array<{ __typename: "AFC"; id: string; allOptional?: string | null }>, never>(
                        G.queryFilterAfc("qAFC", q => q.id.allOptional()),
                        `query qAFC{filterAfc{__typename,id,allOptional}}`
                    )
                })
            })
        })

        test("variables", () => {
            testQuery<{ __typename: string; id: string; name: string | undefined } | null | undefined, never>(
                G.queryUser({ id: "1" }, q => q.id.name),
                `query{user(id:"1"){__typename,id,name}}`
            )

            testQuery<{ __typename: string; id: string } | null | undefined, { id: string }>(
                G.queryUser({ id: G.$$ }, q => q.id),
                `query($id:ID!){user(id:$id){__typename,id}}`
            )

            testQuery<{ __typename: string; id: string } | null | undefined, { id: string }>(
                G.queryUser(G.$$, q => q.id),
                `query($id:ID!){user(id:$id){__typename,id}}`
            )

            testQuery<{ __typename: string; id: string } | null | undefined, { prefix__id: string }>(
                G.queryUser(G.$("prefix"), q => q.id),
                `query($prefix__id:ID!){user(id:$prefix__id){__typename,id}}`
            )

            testQuery<{ __typename: string; id: string } | null | undefined, { userId: string }>(
                G.queryUser({ id: G.$("userId") }, q => q.id),
                `query($userId:ID!){user(id:$userId){__typename,id}}`
            )

            testQuery<
                { __typename: string; articles: Array<{ __typename: string; id: string }> } | null | undefined,
                { id: string }
            >(
                G.queryUser(G.$$, q => q.articles({ count: 1 }, q => q.id)),
                `query($id:ID!){user(id:$id){__typename,articles(count:1){__typename,id}}}`
            )

            testQuery<
                { __typename: string; articles: Array<{ __typename: string }> } | null | undefined,
                { id: string; articles__count: number }
            >(
                G.queryUser(G.$$, q => q.articles({ count: G.$$ }, q => q.id)),
                `query($id:ID!,$articles__count:Int!){user(id:$id){__typename,articles(count:$articles__count){__typename,id}}}`
            )

            testQuery<
                { __typename: string; articles: Array<{ __typename: string }> } | null | undefined,
                { id: string; articles__count: number }
            >(
                G.queryUser(G.$$, q => q.articles(G.$$, q => q.id)),
                `query($id:ID!,$articles__count:Int!){user(id:$id){__typename,articles(count:$articles__count){__typename,id}}}`
            )

            testQuery<
                { __typename: string; articles: Array<{ __typename: "Article"; id: string }> } | null | undefined,
                { id: string; articleCount: number }
            >(
                G.queryUser(G.$$, q => q.articles({ count: G.$("articleCount") }, q => q.id)),
                `query($id:ID!,$articleCount:Int!){user(id:$id){__typename,articles(count:$articleCount){__typename,id}}}`
            )

            testQuery<Array<{ __typename: string; id: string; name: string | undefined }>, never>(
                G.queryUsers({ filter: {} }, q => q.id.name),
                `query{users(filter:{}){__typename,id,name}}`
            )

            // TODO: optionlly allow paramters
            testQuery<Array<{ __typename: string; id: string; name: string | undefined }>, never>(
                G.queryUsersOptionalFilter({}, q => q.id.name),
                `query{usersOptionalFilter{__typename,id,name}}`
            )
        })

        describe("filter variable", () => {
            type OrderDirection = import("./__generated__/runtime").OrderDirection
            type AFCKind = import("./__generated__/runtime").AFCKind

            test("by const id", () => {
                testQuery<Array<{ __typename: "AFC"; id: string }>, never>(
                    G.queryFilterAfc({ filter: { id: "idOfUser" } }, q => q.id),
                    `query{filterAfc(filter:{id:"idOfUser"}){__typename,id}}`
                )
            })

            test("by id default filter", () => {
                testQuery<Array<{ __typename: "AFC"; id: string }>, { filter__id: string }>(
                    G.queryFilterAfc({ filter: { id: G.$$ } }, q => q.id),
                    `query($filter__id:ID){filterAfc(filter:{id:$filter__id}){__typename,id}}`
                )
            })

            test("by id defaults", () => {
                testQuery<
                    Array<{ __typename: "AFC"; id: string }>,
                    { filter__id: string; order__kind: OrderDirection; limit: number; offset: number }
                >(
                    G.queryFilterAfc(
                        { filter: { id: G.$$ }, order: { kind: G.$$ }, limit: G.$$, offset: G.$$ },
                        q => q.id
                    ),
                    `query($filter__id:ID,$order__kind:OrderDirection,$limit:Int,$offset:Int){filterAfc(filter:{id:$filter__id},order:{kind:$order__kind},limit:$limit,offset:$offset){__typename,id}}`
                )
            })

            test("by id fixed var", () => {
                testQuery<Array<{ __typename: "AFC"; id: string }>, { afcId: string }>(
                    G.queryFilterAfc({ filter: { id: G.$("afcId") } }, q => q.id),
                    `query($afcId:ID){filterAfc(filter:{id:$afcId}){__typename,id}}`
                )
            })

            test("mixed", () => {
                testQuery<Array<{ __typename: "AFC"; id: string }>, { afcId: string }>(
                    G.queryFilterAfc({ filter: { id: G.$("afcId"), kind: "EXTENDED" } }, q => q.id),
                    `query($afcId:ID){filterAfc(filter:{id:$afcId,kind:"EXTENDED"}){__typename,id}}`
                )
            })

            test("mixed2", () => {
                testQuery<Array<{ __typename: "AFC"; id: string }>, { afcId: string }>(
                    G.queryFilterAfc({ filter: { id: G.$("afcId") }, order: { kind: "ASC" } }, q => q.id),
                    `query($afcId:ID){filterAfc(filter:{id:$afcId},order:{kind:"ASC"}){__typename,id}}`
                )
            })

            test("array", () => {
                testQuery<Array<{ __typename: "AFC"; id: string }>, { filter__and__id: string }>(
                    G.queryFilterAfc({ filter: { and: [{ id: G.$$, kind: "EXTENDED" }] } }, q => q.id),
                    `query($filter__and__id:ID){filterAfc(filter:{and:[{id:$filter__and__id,kind:"EXTENDED"}]}){__typename,id}}`
                )
            })

            test("array2", () => {
                testQuery<Array<{ __typename: "AFC"; id: string }>, { filter__and__id: string; notKind: AFCKind }>(
                    G.queryFilterAfc({ filter: { and: [{ id: G.$$, not: [{ kind: G.$("notKind") }] }] } }, q => q.id),
                    `query($filter__and__id:ID,$notKind:AFCKind){filterAfc(filter:{and:[{id:$filter__and__id,not:[{kind:$notKind}]}]}){__typename,id}}`
                )
            })
        })

        test("union", () => {
            type AFCKind = import("./__generated__/runtime").AFCKind
            testQuery<
                Array<
                    | { __typename: "AFC"; id: string; kind: AFCKind }
                    | { __typename: "SelfRecursive"; parent: { id: string } }
                >,
                never
            >(
                G.querySearch({ text: "search" }, q =>
                    q.$on(G.AFC(q => q.id.kind)).$on(G.SelfRecursive(q => q.id.parent(q => q.id)))
                ),
                'query{search(text:\"search\"){__typename,... on AFC{id,kind},... on SelfRecursive{id,parent{id}}}}'
            )

            const fragment = G.SelfRecursive.fragment("someName", q => q.id.parent(q => q.id))

            testQuery<
                Array<{ __typename: "AFC"; id: string } | { __typename: "SelfRecursive"; parent: { id: string } }>,
                never
            >(
                G.querySearch({ text: "search" }, q => q.$on(G.AFC(q => q.id)).$on(fragment)),
                'query{search(text:\"search\"){__typename,... on AFC{id},... on SelfRecursive{id,parent{id}}}}'
            )

            const fragment2 = G.SelfRecursive("someName", q => q.id.parent(q => q.id))
            testQuery<
                Array<{ __typename: "AFC"; id: string } | { __typename: "SelfRecursive"; parent: { id: string } }>,
                never
            >(
                G.querySearch({ text: "search" }, q => q.$on(G.AFC(q => q.id)).$on(fragment2)),
                'query{search(text:"search"){__typename,... on AFC{id},...someName}} fragment someName on SelfRecursive{id,parent{id}}'
            )
        })

        test("scalar operation return", () => {
            testQuery<{ __typename: string; distance: number } | null | undefined, { id: string }>(
                G.queryLocation(G.$$, q => q.distance({ lat: 1, lng: 2, unit: G.DistanceUnit.METRIC })),
                'query($id:ID!){location(id:$id){__typename,distance(lat:1,lng:2,unit:"METRIC")}}'
            )

            type DistanceUnit = import("./__generated__/runtime").DistanceUnit
            testQuery<
                { __typename: string; distance: number } | null | undefined,
                { id: string; distance__unit: DistanceUnit }
            >(
                G.queryLocation(G.$$, q => q.distance({ lat: 1, lng: 2, unit: G.$$ })),
                "query($id:ID!,$distance__unit:DistanceUnit!){location(id:$id){__typename,distance(lat:1,lng:2,unit:$distance__unit)}}"
            )
        })

        test("query scalar opertaion return w/o parameters", () => {
            testQuery<string | null | undefined, never>(G.queryCurrentUserId(), `query{currentUserId}`)
        })

        test("some fields", () => {
            testQuery<{ __typename: string; id: string; name: string } | null | undefined, { id: string }>(
                G.queryUser(G.$$, q => q.id.name),
                `query($id:ID!){user(id:$id){__typename,id,name}}`
            )
        })

        test("articles", () => {
            type ArticleFilter = import("./__generated__/runtime").ArticleFilter

            testQuery<
                Array<{
                    __typename: "Article"
                    id: string
                    tags?: Array<{ __typename: string; tag: string }> | null
                }>,
                { id: string; filter: ArticleFilter }
            >(
                G.queryArticles(G.$$, q => q.id.tags(q => q.tag)),
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
                    __typename: "AFC"
                    id: string
                    hqName: string
                    parent?: { __typename: "AFC"; id: string; hqName: string } | null
                },
                never
            >(
                G.queryAfc(q => q.id.hqName.parent(q => q.id.hqName)),
                `query{afc{__typename,id,hqName,parent{__typename,id,hqName}}}`
            )
        })

        test("self recursive 1/2", () => {
            testQuery<
                {
                    __typename: string
                    id: string
                    hqName: string
                    parent?: { __typename: string; id: string; hqName: string } | null
                },
                never
            >(
                G.queryAfc(q => q.id.hqName.parent(q => q.id.hqName)),
                `query{afc{__typename,id,hqName,parent{__typename,id,hqName}}}`
            )
        })

        test("self recursive 1/3", () => {
            testQuery<
                {
                    __typename: "AFC"
                    id: string
                    hqName: string
                    parent?: { __typename: "AFC"; id: string; hqName: string } | null
                },
                never
            >(
                G.queryAfc(q => q.id.hqName.parent(q => q.id.hqName)),
                `query{afc{__typename,id,hqName,parent{__typename,id,hqName}}}`
            )
        })

        test("self recursive 2", () => {
            testQuery<
                {
                    __typename: string
                    id: string
                    hqName: string
                    parent?: {
                        __typename: string
                        id: string
                        hqName: string
                        parent?: { __typename: string; id: string } | null
                    } | null
                },
                never
            >(
                G.queryAfc(q => q.id.hqName.parent(q => q.id.hqName.parent(q => q.id))),
                `query{afc{__typename,id,hqName,parent{__typename,id,hqName,parent{__typename,id}}}}`
            )
        })

        describe("$on", () => {
            test("type", () => {
                testQuery<
                    | { __typename: "Article"; id: string }
                    | { __typename: "Tag"; id: string }
                    | { __typename: "User"; id: string; name: string }
                    | null
                    | undefined,
                    { id: string }
                >(
                    G.queryNode(G.$$, q => q.id.$on(G.User(q => q.name))),
                    `query($id:ID!){node(id:$id){__typename,id,... on User{name}}}`
                )
            })

            test("type", () => {
                testQuery<
                    | { __typename: "Article" }
                    | { __typename: "Tag" }
                    | { __typename: "User"; name: string }
                    | null
                    | undefined,
                    { id: string }
                >(
                    G.queryNode(G.$$, q => q.$on(G.User(q => q.name))),
                    `query($id:ID!){node(id:$id){__typename,... on User{name}}}`
                )
            })

            test("fragment 1", () => {
                testQuery<
                    | { __typename: "Article"; id: string }
                    | { __typename: "Tag"; id: string }
                    | { __typename: "User"; id: string; name: string }
                    | null
                    | undefined,
                    { id: string }
                >(
                    G.queryNode(G.$$, q => q.id.$on(G.User("fragmentName", q => q.name))),
                    `query($id:ID!){node(id:$id){__typename,id,...fragmentName}} fragment fragmentName on User{name}`
                )
            })

            type NodeRes =
                | { __typename: "Tag"; id: string }
                | { __typename: "User"; id: string; name: string }
                | {
                      __typename: "Article"
                      id: string
                      title: string
                      tags?: Array<{ __typename: "Tag"; id: string; tag: string }> | null
                  }
                | null
                | undefined

            test("fragment 2", () => {
                testQuery<NodeRes, { id: string }>(
                    G.queryNode(G.$$, q =>
                        q.id
                            .$on(G.User("userFragment", q => q.name))
                            .$on(G.Article("articleFragment", q => q.title.tags(q => q.id.tag)))
                    ),
                    `query($id:ID!){node(id:$id){__typename,id,...userFragment,...articleFragment}} fragment userFragment on User{name} fragment articleFragment on Article{title,tags{id,tag}}`
                )
            })

            type NodeRes2 =
                | { __typename: "Tag"; id: string }
                | { __typename: "User"; id: string; name: string }
                | {
                      __typename: "Article"
                      id: string
                      title: string
                      tags?: Array<{ __typename: "Tag"; id: string; tag: string }> | null
                      events?: Array<
                          | {
                                __typename: "ArticleChangeEvent"
                                curr: { __typename: "Article"; id: string }
                            }
                          | { __typename: "UserChangeEvent" }
                      >
                  }
                | null
                | undefined

            const queryNodeRes2 = G.queryNodes(q =>
                q.id
                    .$on(G.User("userFragment", q => q.name))
                    .$on(
                        G.Article("articleFragment", q =>
                            q.title.tags(q => q.id.tag).events(q => q.$on(G.ArticleChangeEvent(q => q.curr(q => q.id))))
                        )
                    )
            )
            test("fragment 2", () => {
                testQuery<NodeRes2[], never>(
                    queryNodeRes2,
                    `query{nodes{__typename,id,...userFragment,...articleFragment}} fragment userFragment on User{name} fragment articleFragment on Article{title,tags{id,tag},events{... on ArticleChangeEvent{curr{id}}}}`
                )
            })

            type QueryNodeRes2 = TypeOf<typeof queryNodeRes2>
            test("is", () => {
                const articles: QueryNodeRes2 = [{ __typename: "Article", id: "id", title: "title", events: [] }]
                const article = articles[0]
                if (G.Article.is(article)) {
                    const {
                        __typename,
                        id,
                        title,
                        events
                    }: { __typename: "Article"; id: string; title: string; events: any[] } = article
                    expect(__typename).toBe("Article")
                    expect(id).toBe("id")
                    expect(title).toBe("title")
                    expect(events).toEqual([])
                } else {
                    throw new Error("not article")
                }
            })

            type DistanceUnit = import("./__generated__/runtime").DistanceUnit
            test("fragment variable", () => {
                const distance = G.Location("fragmentName", q =>
                    q.distance({ lat: G.$("lat"), lng: G.$("lng"), unit: G.$$ })
                )
                testQuery<
                    { __typename: "Location"; id: string; distance: number } | null | undefined,
                    { lat: number; lng: number; distance__unit: DistanceUnit }
                >(
                    G.queryLocation({ id: "1" }, s => s.$on(distance).id),
                    'query($lat:Float!,$lng:Float!,$distance__unit:DistanceUnit!){location(id:"1"){__typename,id,...fragmentName}} fragment fragmentName on Location{distance(lat:$lat,lng:$lng,unit:$distance__unit)}'
                )
            })

            test("fragment fix variable", () => {
                const distance = G.Location("fragmentName", q =>
                    q.distance({ lat: 1, lng: 2, unit: "METRIC" as DistanceUnit })
                )
                testQuery<{ __typename: "Location"; id: string; distance: number } | null | undefined, never>(
                    G.queryLocation({ id: "1" }, s => s.$on(distance).id),
                    'query{location(id:"1"){__typename,id,...fragmentName}} fragment fragmentName on Location{distance(lat:1,lng:2,unit:"METRIC")}'
                )
            })

            test("on type variable", () => {
                testQuery<
                    { __typename: "Location"; id: string; distance: number } | null | undefined,
                    { lat: number; lng: number; distance__unit: DistanceUnit }
                >(
                    G.queryLocation(
                        { id: "1" },
                        s => s.$on(G.Location(q => q.distance({ lat: G.$("lat"), lng: G.$("lng"), unit: G.$$ }))).id
                    ),
                    'query($lat:Float!,$lng:Float!,$distance__unit:DistanceUnit!){location(id:"1"){__typename,id,... on Location{distance(lat:$lat,lng:$lng,unit:$distance__unit)}}}'
                )
            })

            test("type variable", () => {
                testQuery<
                    { __typename: "Location"; id: string; distance: number } | null | undefined,
                    { lat: number; lng: number; distance__unit: DistanceUnit }
                >(
                    G.queryLocation({ id: "1" }, s => s.distance({ lat: G.$("lat"), lng: G.$("lng"), unit: G.$$ }).id),
                    'query($lat:Float!,$lng:Float!,$distance__unit:DistanceUnit!){location(id:"1"){__typename,id,distance(lat:$lat,lng:$lng,unit:$distance__unit)}}'
                )
            })
        })
    })

    describe("mutation", () => {
        test("scalar opertaion return w parameters", () => {
            testQuery<number | null, { something?: string }>(
                G.mutateDoSomething(G.$$),
                `mutation($something:String){doSomething(something:$something)}`
            )
        })

        test("update article", () => {
            type ArticleUpdate = import("./__generated__/runtime").ArticleUpdate

            // type ArticleChangeEvent = import("./__generated__/runtime").ArticleChangeEvent
            // type Article = import("./__generated__/runtime").Article
            // type User = import("./__generated__/runtime").User

            // type XXX = ExtendSelected<
            //     ["__typename"],
            //     [
            //         "__typename",
            //         "id",
            //         Record<"articles", ["__typename", "id"]>,
            //         Record<"articles", ["__typename", "title"]>
            //     ]
            // >

            // type XXX = Selected<Article, ["__typename", "id", { tags: ["__typename"] }]>
            // const xxx = null as unknown as XXX
            // xxx.

            // type YYY = Selected<ArticleChangeEvent, [{ prev: ["__typename", {id: "prevId"}]}, { curr: ["__typename", "title"] }]>
            // const yyy = null as unknown as YYY
            // yyy.prev.

            // type ZZZ = Selected<User, ["__typename", { articles: ["__typename", "id", { tags: ["tag"] }] }]>
            // const zzz = null as unknown as ZZZ
            // const ccc = zzz.articles[0].tags[0]

            // type S1 = ExtendSelection<[], [], "id">
            // type S2 = ExtendSelection<S1, [], "name">
            // type S3 = ExtendSelection<S2, ["articles"], "title">
            // type S3U = Selected<User, S3>
            // type S4 = ExtendSelection<S3, ["articles"], "id">
            // type S4U = Selected<User, S4>

            testQuery<{ id: string }, { id: string; params: ArticleUpdate }>(
                G.mutateUpdateArticle(G.$$, q => q.id),
                `mutation($id:ID!,$params:ArticleUpdate!){updateArticle(id:$id,params:$params){__typename,id}}`
            )
        })
    })

    // TODO: implement builder()
    // describe("builder", () => {
    //     test("basic", () => {
    //         const builder = G.queryUser.builder({ id: G.$$ }).id.name
    //     })

    //     test("with name", () => {
    //         const builder = G.queryUser.builder("QueryName", { id: G.$$ }).id.name
    //     })

    //     test("with articles", () => {
    //         const builder = G.queryUser.builder({ id: G.$$ }).id.name.articles({ count: 10 }, q => q.id)
    //     })
    // })
})
