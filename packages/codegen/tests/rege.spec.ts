/* eslint-disable @stylistic/js/max-len */
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

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
    let G: typeof import("./__generated__/rege")

    beforeAll(async () => {
        const schemaContent = await Bun.file(path.join(__dirname, "rege.graphql")).text()
        const result = transform(buildSchema(schemaContent), {
            scalars: {
                UUID: "string",
                JSON: "string",
                Zoned: "string",
                CivilDateRange: "string",
                CivilDateTimeRange: "string",
                CivilDate: "string",
                CivilDateTime: "string",
                CivilTime: "string",
                Decimal: "number",
                Geography: "object",
                Duration: "object"
            }
        })
        const outPath = path.join(__dirname, "__generated__", "rege.ts")
        await mkdir(path.dirname(outPath), { recursive: true })
        await Bun.file(outPath).write(result)
        G = await import("./__generated__/rege")
    })

    describe("org", () => {
        type Unit = import("./__generated__/rege").Org_Unit

        test("query section", () => {
            const querySection = G.queryOrgSection(
                { filter: { id: { eq: G.$("sectionId") } }, offset: 0, limit: 1 },
                q => q.id.title.children(q => q.id.title.$on(G.Org_CareType(q => q.kind.isActive)))
            )

            testQuery<
                Array<{
                    __typename: "Org_Section"
                    id: string
                    title: string
                    children?: Array<
                        | { __typename: "Org_CareType"; kind: string; isActive: boolean }
                        | { __typename: Exclude<Unit["__typename"], "Org_CareType"> }
                    > | null
                }>,
                { sectionId: string }
            >(
                querySection,
                `query($sectionId:UUID){orgSection(filter:{id:{eq:$sectionId}},offset:0,limit:1){__typename,id,title,children{__typename,id,title,... on Org_CareType{kind,isActive}}}}`
            )
        })
    })
})
