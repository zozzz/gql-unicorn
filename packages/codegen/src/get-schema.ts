/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as gq from "graphql"

import { type UnicornConfig } from "./config"
import { FetchError } from "./errors"

export async function getSchema(pathOrUrl: string, _config: UnicornConfig): Promise<gq.GraphQLSchema> {
    if (/^https?:\/\//.test(pathOrUrl)) {
        return await introspectionQuery(pathOrUrl, _config.headers ?? {})
    } else {
        const fileContent = await Bun.file(pathOrUrl).text()
        return parse(fileContent)
    }
}

async function introspectionQuery(url: string, headers: Record<string, string>) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
            operationName: "IntrospectionQuery",
            query: gq.getIntrospectionQuery()
        })
    })

    if (res.status !== 200) {
        throw new FetchError(`${res.status} ${res.statusText} ${url}`)
    }

    const body: any = await res.json()
    if (body.errors) {
        throw new FetchError(`Error introspecting schema from ${url}: ${JSON.stringify(body.errors, null, 2)}`)
    }
    return gq.buildClientSchema(body.data)
}

function parse(schema: string) {
    return gq.buildSchema(schema, { noLocation: true })
}
