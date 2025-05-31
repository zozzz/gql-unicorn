/* eslint-disable unused-imports/no-unused-vars */
import { describe, test } from "bun:test"

import { operations, type OpQuery, type Params, type ToVars } from "./operation"
import { $, type Variable } from "./var"

type Filter = {
    name: string
    is_active: boolean
    optional?: string
}

type Nested = {
    filter: Filter
}

const x1: ToVars<Filter, [], Variable<undefined>> = { name: "", is_active: false }
const x2: ToVars<Filter, ["user", "roles"], Variable<undefined>> = { user__roles: { name: "", is_active: false } }
const x3: ToVars<Filter, [], Variable<"alma">> = { alma: { name: "", is_active: false } }
const x4: ToVars<Filter, ["user"], Variable<"alma">> = { alma: { name: "", is_active: false } }
const x5: ToVars<Filter, [], { name: "Scalar"; is_active: Variable<"rename"> }> = { rename: true }
const x6: ToVars<Filter, [], { name: "Scalar"; is_active: Variable<undefined> }> = { is_active: true }
const x7: ToVars<Filter, ["roles"], { name: "Scalar"; is_active: Variable<undefined> }> = { roles__is_active: true }
const x8: ToVars<Nested, ["roles"], { filter: { is_active: Variable<undefined> } }> = { roles__filter__is_active: true }
const x9: ToVars<Nested, ["roles"], { filter: { is_active: Variable<"is_active"> } }> = { is_active: true }
const x10: ToVars<Nested, ["roles"], { filter: { optional: Variable<undefined> } }> = {}
// const vnp: ToVars<Filter, [], {a: {b: {c: VarToken}}}> = { a__b__c: true }

const p1: Params<Filter> = { name: "", is_active: false }
const p2: Params<Filter> = { name: "", is_active: false, optional: "" }
const p3: Params<Filter> = { name: $, is_active: false, optional: "" }
const p4: Params<Filter> = { name: $("name"), is_active: false, optional: "" }
const p5: Params<Nested> = { filter: { name: $, is_active: $ } }

type User = {
    __typename: "User"
    id: string
    name: string
}

interface Queries {
    user_by_id: OpQuery<{ id: string }, User>
    users: OpQuery<Filter, User[]>
}

describe("operation", () => {
    test("query", () => {
        const ops = operations<Queries>()
        ops.users({ name: "", is_active: $ }).id.name.$build({ is_active: true })
        const x = ops.user_by_id({ id: $ }).id.$build({ id: "alma" })
    })
})
