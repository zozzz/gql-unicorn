import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { TypedDocumentNode } from "@graphql-typed-document-node/core"
import { beforeAll, describe, expect } from "bun:test"
import { buildSchema, parse } from "graphql"

import { transform } from "../src/transform"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function testQuery<N extends string, O, V>(query: TypedDocumentNode<Record<N, O>, V>, x: string) {
    const gql = `${query as any}`
    // console.log(gql)
    expect(parse(gql)).toBeDefined()
    expect(gql).toBe(x)
}

describe("runtime", () => {
    let G: typeof import("./__generated__/rege")

    beforeAll(async () => {
        const schemaContent = await Bun.file(path.join(__dirname, "rege.graphql")).text()
        const result = transform(buildSchema(schemaContent), {
            scalars: {
                // ID: { import: "SurrealId", from: "../../surreal" },
                UUID: "string",
                JSON: "string",
                DateTime: "Date",
                // CivilDateRange: "string",
                // CivilDateTimeRange: "string",
                Date: "Date",
                // CivilDateTime: "Temporal.PlainDateTime",
                // CivilTime: "Temporal.PlainTime",
                Decimal: "number",
                Geography: "object",
                Duration: "object",
                Value: "any",
                Bytes: "string"
            }
        })
        const outPath = path.join(__dirname, "__generated__", "rege.ts")
        await mkdir(path.dirname(outPath), { recursive: true })
        await Bun.file(outPath).write(result)
        G = await import("./__generated__/rege")
    })

    describe("org", () => {
        type Alma = import("./__generated__/rege").OrgUnit<["id", "name", "parent"]>
        const x: Alma = {} as any

        const query = G.queryOrgUnit(q => q.id.kind.name)

        testQuery<"orgUnit", { id: string }, never>(query, `query{orgUnit{id}}`)
    })

    // test("saveFlow", () => {
    //     const save = G.saveFlow({ id: "id", title: "Test", model: "" })

    //     testQuery<Record<"saveFlow", string>, never>(save, `mutation{saveFlow(id:"id",title:"Test",model:"")}`)
    // })
})
