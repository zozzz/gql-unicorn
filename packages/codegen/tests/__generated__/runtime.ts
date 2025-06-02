/* eslint-disable */
/* prettier-ignore */
/* !!! GENERATED FILE DO NOT EDIT !!! */
import { type Interface, type Operation, queryBuilder, mutationBuilder, subscriptionBuilder, fragmentBuilder, typeBuilder, type FieldDefinitions, $ } from "@gql-unicorn/runtime"
export type Tag = {
    __typename: "Tag"
    id: string
    tag: string
}
export type Article = {
    __typename: "Article"
    id: string
    title: string
    tags: Array<Tag> | null
}
export type User = {
    __typename: "User"
    id: string
    name: string
    articles: Operation<{ count: number }, Array<Article>>
}
type __interface_Node = {
    id: string
}
export type Node = Interface<__interface_Node, User | Article | Tag>
export type ArticleFilter = {
    title: string
}
export const enum DistanceUnit {
    METRIC = "METRIC",
    IMPERIAL = "IMPERIAL"
}
export type Location = {
    __typename: "Location"
    id: string
    name: string
    distance: Operation<{ lat: number, lng: number, unit: DistanceUnit }, number>
}
export type SelfRecursive = {
    __typename: "SelfRecursive"
    id: string
    parent: SelfRecursive
}
export type AFC = {
    __typename: "AFC"
    /**
     * ID of AFC
     */
    id: string
    parent: AFC | null
    optional: string | null
    distance: Operation<{ lat: number, lng: number, unit: DistanceUnit }, number>
    nearest: Operation<{ lat: number, lng: number }, Location | null>
    hq: Location
    hqName: string
}
export type __Query = {
    nodes: Node | null
    node: Operation<{ id: string }, Node | null>
    user: Operation<{ id: string }, User | null>
    articles: Operation<{ filter?: ArticleFilter }, Array<Article>>
    location: Operation<{ id: string }, Location | null>
    currentUserId: string | null
    selfRecursive: Operation<{ id: string }, SelfRecursive | null>
    afc: AFC
    atomicScalar: string
    atomicArgsScalar: Operation<{ id?: string }, string | null>
}
export type ArticleUpdate = {
    title: string
}
export type __Mutation = {
    updateArticle: Operation<{ id: string, params: ArticleUpdate }, Article>
    doSomething: Operation<{ something?: string }, number | null>
}
export type UserChangeEvent = {
    __typename: "UserChangeEvent"
    prev: User
    curr: User
}
export type ArticleChangeEvent = {
    __typename: "ArticleChangeEvent"
    prev: Article
    curr: Article
}
type __interface_Event = {
    source: string
}
export type Event = Interface<__interface_Event, UserChangeEvent | ArticleChangeEvent>
export type __Subscription = {
    watch: Operation<{ event: string }, Event>
}
type __TypeMap = {
    User: User
    Article: Article
    Tag: Tag
    Location: Location
    SelfRecursive: SelfRecursive
    AFC: AFC
    UserChangeEvent: UserChangeEvent
    ArticleChangeEvent: ArticleChangeEvent
}
const __FieldDefs: FieldDefinitions = {
    "User": {
        "articles": [
            {
                "count": "Int!"
            },
            "Article"
        ]
    },
    "Article": {
        "tags": "Tag"
    },
    "Tag": {},
    "Query": {
        "nodes": "Node",
        "node": [
            {
                "id": "ID!"
            },
            "Node"
        ],
        "user": [
            {
                "id": "ID!"
            },
            "User"
        ],
        "articles": [
            {
                "filter": "ArticleFilter"
            },
            "Article"
        ],
        "location": [
            {
                "id": "ID!"
            },
            "Location"
        ],
        "selfRecursive": [
            {
                "id": "ID!"
            },
            "SelfRecursive"
        ],
        "afc": "AFC",
        "atomicArgsScalar": {
            "id": "ID"
        }
    },
    "Location": {
        "distance": {
            "lat": "Float!",
            "lng": "Float!",
            "unit": "DistanceUnit!"
        }
    },
    "SelfRecursive": {
        "parent": "SelfRecursive"
    },
    "AFC": {
        "parent": "AFC",
        "distance": {
            "lat": "Float!",
            "lng": "Float!",
            "unit": "DistanceUnit!"
        },
        "nearest": [
            {
                "lat": "Float!",
                "lng": "Float!"
            },
            "Location"
        ],
        "hq": "Location"
    },
    "Mutation": {
        "updateArticle": [
            {
                "id": "ID!",
                "params": "ArticleUpdate!"
            },
            "Article"
        ],
        "doSomething": {
            "something": "String"
        }
    },
    "UserChangeEvent": {
        "prev": "User",
        "curr": "User"
    },
    "ArticleChangeEvent": {
        "prev": "Article",
        "curr": "Article"
    },
    "Subscription": {
        "watch": [
            {
                "event": "String!"
            },
            "Event"
        ]
    }
}
export const Query = queryBuilder<__Query>(__FieldDefs)
export const Mutation = mutationBuilder<__Mutation>(__FieldDefs)
export const Subscription = subscriptionBuilder<__Subscription>(__FieldDefs)
export const Type = typeBuilder<__TypeMap>(__FieldDefs)
export const Fragment = fragmentBuilder<__TypeMap>(__FieldDefs)
export { $ }