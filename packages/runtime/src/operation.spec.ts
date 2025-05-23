/* eslint-disable unused-imports/no-unused-vars */
import { type Params, type ToVars } from "./operation"
import { $, type Var, type VarToken } from "./var"

type Filter = {
    name: string
    is_active: boolean
    optional?: string
}

type Nested = {
    filter: Filter
}

const x1: ToVars<Filter, [], VarToken> = { name: "", is_active: false }
const x2: ToVars<Filter, ["user", "roles"], VarToken> = { user__roles: { name: "", is_active: false } }
const x3: ToVars<Filter, [], Var<"alma", Filter>> = { alma: { name: "", is_active: false } }
const x4: ToVars<Filter, ["user"], Var<"alma", Filter>> = { alma: { name: "", is_active: false } }
const x5: ToVars<Filter, [], { name: "Scalar"; is_active: Var<"rename", boolean> }> = { rename: true }
const x6: ToVars<Filter, [], { name: "Scalar"; is_active: VarToken }> = { is_active: true }
const x7: ToVars<Filter, ["roles"], { name: "Scalar"; is_active: VarToken }> = { roles__is_active: true }
const x8: ToVars<Nested, ["roles"], { filter: { is_active: VarToken } }> = { roles__filter__is_active: true }
const x9: ToVars<Nested, ["roles"], { filter: { is_active: Var<"is_active", boolean> } }> = { is_active: true }
const x10: ToVars<Nested, ["roles"], { filter: { optional: VarToken } }> = {}
// const vnp: ToVars<Filter, [], {a: {b: {c: VarToken}}}> = { a__b__c: true }

const p1: Params<Filter> = { name: "", is_active: false }
const p2: Params<Filter> = { name: "", is_active: false, optional: "" }
const p3: Params<Filter> = { name: $, is_active: false, optional: "" }
const p4: Params<Filter> = { name: $("name"), is_active: false, optional: "" }
const p5: Params<Nested> = { filter: { name: $, is_active: $ } }
