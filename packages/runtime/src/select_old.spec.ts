import { describe, expect, test } from "bun:test"

import { type OpFunction } from "./operation"
import { select } from "./select"
import { $ } from "./var"

type User = {
    __typename: "User"
    id: string
    name: string
    roles: Role[]
    articles: OpFunction<{ count: number }, Article[]>
}

type MultipleOp = {
    __typename: "MultipleOp"
    roles: OpFunction<{ filter?: { name: string }; offset?: number }, Role[]>
    articles: OpFunction<{ count: number }, Article[]>
}

type Article = {
    __typename: "Article"
    id: string
    name: string
    author: OpFunction<{ id: string }, User>
}

type Role = {
    __typename: "Role"
    id: string
    name: string
}

describe("select", () => {
    test("User primitive", () => {
        const s = select<User>({ pth: [] }).id
        expect(String(s.$build())).toBe("{id,name}")
    })

    test("User auto var", () => {
        const s = select<User>([])
            .articles({ count: $ }, q => q.id)
            .$build()
    })

    test("User named var", () => {
        const s = select<User>({ pth: [] })
            .articles({ count: $("varName") }, q => q.id)
            .$build({ varName: 10 })
    })

    test("Optional var", () => {
        type OptionalVar = {
            __typename: "OptionalVar"
            get: OpFunction<{ optional?: string }, User>
        }
        const s = select<OptionalVar>({ pth: [] }).get({ optional: $ }, q => q.id)

        expect(String(s.$build())).toBe("{get(optional:$get__optional){id}}")
        expect(String(s.$build({}))).toBe("{get(optional:$get__optional){id}}")
        expect(String(s.$build({ get__optional: "ok" }))).toBe("{get(optional:$get__optional){id}}")
    })
})

// const s1 = select<User>("User")
//     .id
//     .name
//     .roles(q => q.id.name)
//     .articles({ count: $("count") }, q => q.id.name.author($, q => q.id))

// s1.$build({count: 10, articles__author: {id: "alma"}})

// const s2 = select<User>("User")
//     .id
//     .name
//     .roles(q => q.id.name)
//     .articles($, q => q.id.name.author($, q => q.id))

// s2.$build({articles: {count: 10}, articles__author: {id: "alma"}})

// const s3 = select<User>("User")
//     .articles({ count: 1 }, q => q.id.name)

// const s4 = select<MultipleOp>("MultipleOp")
//     .roles($.all, q => q.id.name)

// type XXX = Select<User, { roles: { id: string; name: string } }>
// const s2 = select<MultipleOp>("MultipleOp")

// const ss: SScalar<User, []> = {}
// const s: SType<User, []> = {}
// const f: keyof ScalarKeys<User, []> = { id: "id", name: "name" }
// const o: FOperation<User> = { articles }
