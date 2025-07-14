/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import type { TypedDocumentNode } from "@graphql-typed-document-node/core"
import { isPlainObject } from "es-toolkit"
import { parse as parseGql } from "graphql"

import type { MergeUnion } from "./common"
import type { Selection, SelectionDef } from "./select"
import { CONTEXT } from "./symbols"
import type { SimpleType } from "./type"
import { isVariable, variableName, type Vars } from "./var"

/**
 * const __OperationInfo = {
 *  "Query": {
 *    "users": [{id: "ID!"}, "User"]
 * }
 */
export type FieldDefinitions = Record<
    string,
    Record<string, [Record<string, string>, string] | Record<string, string> | string>
>

type ContextType = "Query" | "Mutation" | "Subscription" | "Fragment" | "Type" | "Operation" | "Conditional"

export type BuilderInfo = Record<string, BuilderInfoEntry>
type ArgsType = Record<string, ArgType>
type ArgType = { tn: string; fields?: () => ArgsType; items?: () => ArgType }
type BuilderInfoEntry = [ArgsType, TypeBuilder<any, any>] | TypeBuilder<any, any> | ArgsType

class Context {
    readonly fields: BField[] = []
    readonly subBuilder: Context[] = []
    readonly fragments: Record<string, Context>
    readonly vars: Record<string, string>
    args?: Record<string, any>
    maybeMethod = false
    readonly #parent: WeakRef<Context> | undefined

    get parent() {
        return this.#parent?.deref()
    }

    get level(): number {
        const parent = this.parent
        if (parent != null) {
            return parent.level + 1
        } else {
            return 0
        }
    }

    get root(): Context {
        return this.parent ? this.parent.root : this
    }

    get fullPath(): string[] {
        const parent = this.parent
        if (parent) {
            return [...parent.fullPath, ...this.path]
        } else {
            return this.path
        }
    }

    get name(): string {
        return this.path[0]
    }

    get varPrefix(): string | undefined {
        const parts: string[] = []
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let c: Context | undefined = this
        while (c != null) {
            if (c.type === "Operation" && !isQuery(c.parent) && !isSubscription(c.parent) && !isMutation(c.parent)) {
                parts.push(c.name)
            }
            c = c.parent
        }
        return parts.join("__")
    }

    readonly #infoInput: BuilderInfo | null | undefined | (() => BuilderInfo)
    #info?: BuilderInfo | null
    get info(): BuilderInfo | null | undefined {
        if (this.#info != null) {
            return this.#info
        } else {
            const info = this.#infoInput
            if (typeof info === "function") {
                return (this.#info = info())
            } else {
                return (this.#info = info)
            }
        }
    }

    constructor(
        readonly type: ContextType,
        readonly path: string[],
        info?: BuilderInfo | null | (() => BuilderInfo),
        parent?: Context
    ) {
        // TODO: WeakRef maybe, or omit parent ref
        this.#parent = parent != null ? new WeakRef(parent) : undefined
        this.vars = parent ? parent.vars : {}
        this.fragments = parent ? parent.fragments : {}
        this.#infoInput = info
    }

    sub(type: ContextType, path: string[], info?: BuilderInfo) {
        const sub = new Context(type, path, info || this.info, this)
        this.subBuilder.push(sub)
        return sub
    }

    clone(parent?: Context): Context {
        const res = new Context(this.type, this.path, this.info, parent || this.parent)
        if (parent != null) {
            parent.subBuilder.push(res)
        }
        return res
    }

    handleArgs(input: Record<string, any>, argTypes: ArgsType, path: string[] = []): Record<string, any> | undefined {
        const prefix = [this.varPrefix, ...path].join("__")
        const result: Record<string, any> = {}

        if (isVariable(input)) {
            const fixName = variableName(input)
            const vp = fixName === "$" ? prefix : fixName
            for (const [k, v] of Object.entries(argTypes)) {
                const name = `$${vp ? `${vp}__${k}` : k}`
                this.vars[name] = v["tn"]
                result[k] = name
            }
        } else if (isPlainObject(input)) {
            for (const [k, v] of Object.entries(input)) {
                result[k] = this._handleArg(v, argTypes[k], [...path, k])
                // if (isVariable(v)) {
                //     const fixName = variableName(v)
                //     const name = `$${fixName !== "$" ? fixName : prefix ? `${prefix}__${k}` : k}`
                //     this.vars[name] = argTypes[k]["tn"]
                //     result[k] = name
                // } else if (Array.isArray(v)) {
                //     result[k] = JSON.stringify(v)
                // }
            }
        } else {
            throw new Error("Unexpected input type")
        }

        this.args = Object.keys(result).length === 0 ? undefined : result
        return this.args
    }

    _handleArg(input: any, argType: ArgType, path: string[]): string {
        const varName = (this.varPrefix ? [this.varPrefix, ...path] : path).join("__")

        if (Array.isArray(input)) {
            const items = input.map(value => this._handleArg(value, argType.items!(), path))
            return `[${items.join(",")}]`
        } else if (isVariable(input)) {
            const fixName = variableName(input)
            const name = `$${fixName !== "$" ? fixName : varName}`
            this.vars[name] = argType["tn"]
            return name
        } else if (isPlainObject(input)) {
            const fields = Object.entries(input)
                .map(([k, v]) => `${k}:${this._handleArg(v, argType.fields!()[k], [...path, k])}`)
                .join(",")
            return `{${fields}}`
        }
        return JSON.stringify(input)
    }

    // _stringifyArgs(input: any): string {
    //     if (Array.isArray(input)) {
    //         return `[${input.map(v => this._stringifyArgs(v)).join(",")}]`
    //     } else if (isPlainObject(input)) {
    //         const fields = Object.entries(input)
    //             .map(([k, v]) => `${k}:${this._stringifyArgs(v)}`)
    //             .join(",")
    //         return `{${fields}}`
    //     }
    //     return JSON.stringify(input)
    // }

    is(this: ProxyTarget, obj: Record<string, any> | null | undefined): boolean {
        const self = this[CONTEXT]
        return obj != null && obj.__typename === self.path[0]
    }

    fragment(this: ProxyTarget, name: string, select: (select: any) => any): boolean {
        const self = this[CONTEXT]
        const fragment = new Context("Fragment", [name])
        const sub = newSelectionBuilder(self.clone(fragment))
        select(sub)
        return sub
    }

    $on(this: ProxyTarget, builder: ProxyTarget | Context) {
        const self = this[CONTEXT]
        const sub = asContext(builder)
        if (sub == null || (!isType(sub) && !isFragment(sub))) {
            throw new Error("Argument must be a Type or Fragment")
        }
        const cond = self.sub("Conditional", [])
        cond.subBuilder.push(sub)

        if (isFragment(sub)) {
            if (sub.name in self.fragments) {
                throw new Error(`Fragment ${sub.name} already exists`)
            }
            self.fragments[sub.name] = sub
        }

        Object.assign(self.vars, sub.vars)
        return this
    }

    // TODO: implement
    builder(this: ProxyTarget, ...args: any[]) {
        let name: string | undefined
        if (args.length >= 1 && typeof args[0] === "string") {
            name = args[0]
            args = args.slice(1)
        }

        const self = this[CONTEXT]
        const opName = self.path[0]
        // console.log(args)
        // console.log(self.info?.[opName])
        const root = new Context(self.type, name ? [name] : [], self.info)
        const [subSelect, cb] = handleMethodCall(root, opName, args, self.info?.[opName])

        if (cb != null) {
            throw new Error("The selector function is not allowed here")
        }

        return subSelect
    }

    // TODO: some option to switch betwwen parser
    // TODO: cache
    $build(this: ProxyTarget) {
        return typedDocumentNode(this[CONTEXT].root)
    }

    $gql(this: ProxyTarget) {
        return this[CONTEXT].root.compile(false)
    }

    compile(skipTyename: boolean) {
        const result: string[] = []
        const type = this.type

        // debugContext(this)

        // console.log(this.type, this.path, this.#args)

        if (type === "Query" || type === "Mutation" || type === "Subscription" || type === "Operation") {
            if (this.name) {
                result.push(this.name)
            } else if (type === "Operation") {
                throw new Error("No name")
            }

            if (type !== "Operation") {
                if (this.level !== 0) {
                    throw new Error("Something went wrong")
                }

                const typePrefix = this.type.toLowerCase()
                if (result.length > 0) {
                    result.unshift(`${typePrefix} `)
                } else {
                    result.unshift(typePrefix)
                }

                const vars = Object.entries(this.vars)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(",")

                if (vars.length > 0) {
                    result.push(`(${vars})`)
                }
            } else if (this.args) {
                const args = Object.entries(this.args)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(",")
                if (args.length > 0) {
                    result.push(`(${args})`)
                }
            }

            if (this.fields.length > 0) {
                throw new Error("This type of context does not support fields")
            }

            const sub = this.subBuilder.map(v => v.compile(skipTyename)).filter(v => v.length > 0)
            if (sub.length > 0) {
                result.push(`{${sub.join(",")}}`)
            }

            if (this.level === 0) {
                const fragments = Object.values(this.fragments)
                    .map(v => v.compile(true))
                    .filter(v => v.length > 0)
                if (fragments.length > 0) {
                    result.push(` ${fragments.join(" ")}`)
                }
            }

            return result.join("")
        } else if (type === "Type") {
            const sub = [...this.fields, ...this.subBuilder.map(v => v.compile(skipTyename)).filter(v => v.length > 0)]
            if (!skipTyename && sub.length > 0 && !this.fields.includes("__typename")) {
                sub.unshift("__typename")
            }
            result.push(sub.filter((v, i, a) => a.indexOf(v) === i).join(","))
        } else if (type === "Conditional") {
            if (this.subBuilder.length !== 1) {
                throw new Error("This type of context does not constructec with the expected number of subBuilder")
            }
            const sub = this.subBuilder[0]
            if (isType(sub)) {
                const compiled = sub.compile(true)
                if (compiled.length === 0) {
                    throw new Error("Empty type")
                }
                result.push(`... on ${sub.name}{${compiled}}`)
            } else if (isFragment(sub)) {
                result.push(`...${sub.name}`)
            }
        } else if (type === "Fragment") {
            const sub = this.subBuilder[0]
            if (!isType(sub)) {
                throw new Error("Fragment subBuilder must be Type")
            }

            const compiled = sub.compile(skipTyename)
            if (compiled.length === 0) {
                throw new Error("Empty type")
            }
            result.push(`fragment ${this.name} on ${sub.name}{${compiled}}`)
        }

        return result.join("")
    }
}

const GQL = Symbol("GQL")

function typedDocumentNode(context: Context) {
    const gql = context.compile(false)
    // console.log(gql)
    const td = parseGql(gql) as unknown as TypedDocumentNode & { [GQL]: string }
    td[GQL] = gql
    Object.setPrototypeOf(td, TDPrototype)
    return td
}

const TDPrototype = {
    [Symbol.toPrimitive](this: { [GQL]: string }, hint: string) {
        if (hint === "string") {
            return this[GQL]
        }
        return null
    }
}

// eslint-disable-next-line unused-imports/no-unused-vars
function debugContext(context: Context, level = "") {
    console.log(`${level} ${context.type} [name=${context.name}] ${JSON.stringify(context.vars)}`)
    for (const f of context.fields) {
        console.log(`${level}  ${f}`)
    }
    for (const f of context.subBuilder) {
        debugContext(f, level + "  ")
    }
}

const ContextSpecials: Array<string | symbol> = ["$build", "$gql"]

interface ProxyTarget {
    [CONTEXT]: Context
}

type BField = string

export interface TypeBuilder<T, TN extends string> {
    fragment<S extends Selection<any, any, any>>(name: string, select: (select: T) => S): S
    // @ts-expect-error V is assignable to TypeVariant<V, TN>, but TS is not liking it, but works
    is<V extends SimpleType | null | undefined>(obj: V): obj is TypeVariant<V, TN> & NonNullable<V>
    <ST, SS extends SelectionDef, SV extends Vars>(
        ...args: [string, (select: T) => Selection<ST, SS, SV>] | [(select: T) => Selection<ST, SS, SV>]
    ): Selection<ST, [{ $on: { [k in TN]: SS } }], SV>
}

type TypeVariant<V extends SimpleType, TN extends string> = MergeUnion<{ __typename: TN } & V>

/**
 * @example
 * ```typescript
 * const Query = queryBuilder()
 * Query.users({id: ...})
 * ```
 */
export function queryBuilder(name: string, args?: BuilderInfoEntry) {
    return newRootBuilder(new Context("Query", [name], args ? { [name]: args } : undefined))
}

function isQuery(obj: any) {
    return testContextType(obj, "Query")
}

/**
 * @example
 * ```typescript
 * const Mutation = mutationBuilder()
 * Mutation.createUser({name: ...})
 * ```
 */
export function mutationBuilder(name: string, args?: BuilderInfoEntry) {
    return newRootBuilder(new Context("Mutation", [name], args ? { [name]: args } : undefined))
}

function isMutation(obj: any) {
    return testContextType(obj, "Mutation")
}

/**
 * @example
 * ```typescript
 * const Subscription = subscriptionBuilder()
 * Subscription.onUserChanged({filter: ...})
 * ```
 */
export function subscriptionBuilder(name: string, args?: BuilderInfoEntry) {
    return newRootBuilder(new Context("Subscription", [name], args ? { [name]: args } : undefined))
}

function isSubscription(obj: any) {
    return testContextType(obj, "Subscription")
}

/**
 * @example
 * ```typescript
 * const Fragment = fragmentBuilder()
 * Fragment.User("Something").id.name
 * ```
 */
// export function fragmentBuilder<T extends TypeMap>(opd: FieldDefinitions) {
//     return newTypeBuilder(new Context(opd, "Fragment", [])) as unknown as (
//         name: string
//     ) => FragmentBuilder<T, Flag.AutoTn>
// }

function isFragment(obj: any) {
    return testContextType(obj, "Fragment")
}

/**
 * @example
 * ```typescript
 * const Type = typeBuilder()
 * Query.users().$on(Type.Manager.manager_field.roles(q => q.name))
 * ```
 */
export function typeBuilder(name: string, info?: () => BuilderInfo) {
    return newTypeBuilder(new Context("Type", [name], info))
}

function isType(obj: any): boolean {
    return testContextType(obj, "Type")
}

function testContextType(obj: ProxyTarget | Context, type: ContextType): boolean {
    return asContext(obj)?.type === type
}

function asContext(v: any): Context | undefined {
    if (v instanceof Context) {
        return v
    } else if (v && CONTEXT in v) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return v[CONTEXT]
    }
}

/**
 * Root builders: Query, Mutation, Subscription
 * ```ts
 * Query("UserQuery").users()
 * Query.users({...})
 * Query.currentUser.id
 * Query.currentUserId
 * ```
 */
function newRootBuilder(context: Context) {
    return _newBuilder(context, rootBuilderCall, RootBuilderProxy)
}

const RootBuilderSpecials = ["builder", ...ContextSpecials]

const RootBuilderProxy = {
    get(target: ProxyTarget, key: string | symbol, _receiver: any): any {
        const context = target[CONTEXT]
        if (key === CONTEXT) {
            return context
        }
        if (RootBuilderSpecials.includes(key)) {
            return context[key as keyof typeof context]
        }

        throw new Error(`Invalid key: ${String(key)}`)
    }
}

/**
 * @param context Context is must have type: Query | Mutation | Subscription
 */
function rootBuilderCall(proxy: ProxyTarget, context: Context, args: any[]) {
    let name: string | undefined
    if (args.length >= 1 && typeof args[0] === "string") {
        name = args[0]
        args = args.slice(1)
    }

    const opName = context.path[0]
    const info = context.info?.[opName]
    const root = new Context(context.type, name ? [name] : [], context.info)
    const [subSelect, cb] = handleMethodCall(root, opName, args, info)
    if (cb != null) {
        cb(subSelect)
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (subSelect as unknown as any).$build()
}

function newSelectionBuilder(context: Context) {
    return _newBuilder(context, selectionBuilderCall, SelectionBuilderProxy)
}

const SelectionSpecials = ["$on", ...ContextSpecials]

const SelectionBuilderProxy = {
    get(target: ProxyTarget, key: string | symbol, receiver: any): any {
        const context = target[CONTEXT]
        if (key === CONTEXT) {
            return context
        } else if (SelectionSpecials.includes(key)) {
            return context[key as keyof typeof context]
        }

        if (typeof key === "string") {
            context.maybeMethod = true
            context.fields.push(key)
        } else {
            throw new Error("key must be string")
        }

        return receiver
    }
}

/**
 * @param context Context is must NOT have type: Query | Mutation | Subscription
 */
function selectionBuilderCall(proxy: ProxyTarget, context: Context, args: any[]) {
    if (!context.maybeMethod) {
        throw new Error(`This is not callable`)
    }
    context.maybeMethod = false

    const opName = context.fields.pop()!
    const info = context.info?.[opName]
    const [subSelect, cb] = handleMethodCall(context, opName, args, info)
    if (cb != null) {
        cb(subSelect)
    }
    return proxy
}

function handleMethodCall(
    context: Context,
    opName: string,
    args: any[],
    info: BuilderInfoEntry | undefined
): [ProxyTarget, ((s: ProxyTarget) => void) | undefined] {
    // scalar, no args
    if (info == null) {
        const operation = context.sub("Operation", [opName])
        return [newSelectionBuilder(operation.sub("Type", [])), undefined]
    } else if (isType(info)) {
        // type, no args
        const select = args[0]
        const operation = context.sub("Operation", [opName])
        const sub = newSelectionBuilder(asContext(info)!.clone(operation))
        return [sub, select]
    } else if (Array.isArray(info)) {
        // type, with args
        const [argInfo, selectInfo] = info

        let select = args.at(-1)
        let params
        if (typeof select !== "function") {
            params = select
            select = undefined
        } else {
            params = args.slice(0, -1)[0]
        }

        const operation = context.sub("Operation", [opName])
        if (params) {
            operation.handleArgs(params, argInfo)
        }
        const sub = newSelectionBuilder(asContext(selectInfo)!.clone(operation))
        return [sub, select]
    } else if (isPlainObject(info)) {
        const operation = context.sub("Operation", [opName])
        if (args[0] != null) {
            operation.handleArgs(args[0], info as ArgsType)
        }
        return [newSelectionBuilder(operation.sub("Type", [])), undefined]
    }
    throw new Error("Invalid type of argument")
}

// function _handleMethodCall(
//     context: Context,
//     opName: string,
//     args: any[],
//     info: BuilderInfoEntry | undefined
// ): ProxyTarget {
//     // scalar, no args
//     if (info == null) {
//         const operation = context.sub("Operation", [opName])
//         return newSelectionBuilder(operation.sub("Type", [])) as ProxyTarget
//     } else if (isType(info)) {
//         // type, no args
//         const select = args[0]
//         if (typeof select !== "function") {
//             throw new Error("Invalid type of argument, must be a select function")
//         }
//         const operation = context.sub("Operation", [opName])
//         const sub = newSelectionBuilder(asContext(info)!.clone(operation))
//         select(sub)
//         return sub as ProxyTarget
//     } else if (Array.isArray(info)) {
//         // type, with args
//         const [argInfo, selectInfo] = info
//         let select: any
//         let params: any
//         if (typeof args[0] === "function") {
//             params = null
//             select = args[0]
//         } else if (typeof args[1] === "function") {
//             params = args[0]
//             select = args[1]
//         } else {
//             throw new Error("Invalid type of argument, must be a select function")
//         }

//         const operation = context.sub("Operation", [opName])
//         if (params) {
//             operation.handleArgs(params, argInfo)
//         }
//         const sub = newSelectionBuilder(asContext(selectInfo)!.clone(operation))
//         select(sub)
//         return sub as ProxyTarget
//     } else if (isPlainObject(info)) {
//         const operation = context.sub("Operation", [opName])
//         if (args[0] != null) {
//             operation.handleArgs(args[0], info as ArgsType)
//         }
//         return newSelectionBuilder(operation.sub("Type", [])) as ProxyTarget
//     }
//     throw new Error("Invalid type of argument")
// }

function newTypeBuilder(context: Context) {
    return _newBuilder(context, typeBuilderCall, TypeBuilderProxy)
}

const TypeBuilderSpecials: Array<string | symbol> = ["is", "fragment", ...ContextSpecials]

const TypeBuilderProxy = {
    get(target: ProxyTarget, key: string | symbol, _receiver: any): any {
        const context = target[CONTEXT]
        if (key === CONTEXT) {
            return context
        } else if (TypeBuilderSpecials.includes(key)) {
            return context[key as keyof typeof context]
        }
        throw new Error(`Invalid key: ${String(key)}`)
    }
}

/**
 * @param context Context is must have type: Type | Fragment
 */
function typeBuilderCall(proxy: ProxyTarget, context: Context, args: any[]) {
    if (args.length === 0) {
        throw new Error(`Missing arguments select, or name + select`)
    }

    let fragmentName: string | undefined
    if (typeof args[0] === "string") {
        fragmentName = args[0]
        args = args.slice(1)
    }

    const select = args[0]
    if (typeof select !== "function") {
        throw new Error("Must be a select function: `q => q.fieldName`")
    }

    let sub: any
    if (fragmentName != null) {
        const fragment = new Context("Fragment", [fragmentName])
        sub = newSelectionBuilder(context.clone(fragment))
        select(sub)
        return fragment
    } else {
        sub = newSelectionBuilder(context.clone())
        select(sub)
        return sub
    }
}

function _newBuilder(
    context: Context,
    onCall: (proxy: any, context: Context, args: any[]) => any,
    handler: ProxyHandler<any>
) {
    const self = ((...args: any[]) => onCall(proxy, context, args)) as unknown as ProxyTarget
    self[CONTEXT] = context
    const proxy = new Proxy(self, handler)
    return proxy
}
