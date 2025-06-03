/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import { parse as parseGql } from "graphql"

import type { MergeUnion } from "./common"
import type { Arguments, ToVars } from "./operation"
import type { Flag, Select, TypeFlags } from "./select"
import { CONTEXT } from "./symbols"
import type { BareType, Input, Operation, SimpleType } from "./type"
import { isVariable, variableName } from "./var"

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

class Context {
    readonly vars: Record<string, string>
    readonly fields: BField[] = []
    readonly subBuilder: Context[] = []
    readonly fragments: Record<string, Context>
    #args?: Record<string, any>
    maybeMethod = false
    readonly #parent: Context | undefined

    get parent() {
        return this.#parent
    }

    get level(): number {
        if (this.parent) {
            return this.parent.level + 1
        } else {
            return 0
        }
    }

    get root(): Context {
        return this.parent ? this.parent.root : this
    }

    get fullPath(): string[] {
        const parent = this.#parent
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
            if (c.type === "Operation" && c.level > 1) {
                parts.push(c.name)
            }
            c = c.parent
        }
        return parts.join("__")
    }

    constructor(
        readonly fieldDefs: FieldDefinitions,
        readonly type: ContextType,
        readonly path: string[],
        parent?: Context
    ) {
        // TODO: WeakRef maybe, or omit parent ref
        this.#parent = parent
        this.vars = parent ? parent.vars : {}
        this.fragments = parent ? parent.fragments : {}
    }

    sub(type: ContextType, path: string[]) {
        const sub = new Context(this.fieldDefs, type, path, this)
        this.subBuilder.push(sub)
        return sub
    }

    handleArgs(args: any[], argTypes: Record<string, string>): ((b: ProxyTarget) => any) | undefined {
        if (args.length === 0) {
            return undefined
        }

        const last = args[args.length - 1]
        if (typeof last === "function") {
            if (!isVariable(last)) {
                this.#args = this.#substArgs(args.slice(0, args.length - 1), argTypes)
                return last
            }
        }

        this.#args = this.#substArgs(args, argTypes)
        return undefined
    }

    #substArgs(args: any[], argTypes: Record<string, string>): Record<string, any> | undefined {
        if (args.length === 0) {
            return undefined
        }

        if (args.length !== 1) {
            throw new Error("Too many args")
        }

        const input = args[0] as Record<string, any>
        const prefix = this.varPrefix
        const result: Record<string, any> = {}

        // Query.users($)
        // Query.users($("userFilter"))
        if (isVariable(input)) {
            const fixName = variableName(input)
            const vp = fixName ?? prefix
            for (const [k, v] of Object.entries(argTypes)) {
                const name = `$${vp ? `${vp}__${k}` : k}`
                this.vars[name] = v
                result[k] = name
            }
        } else {
            for (const [k, v] of Object.entries(input)) {
                if (isVariable(v)) {
                    const fixName = variableName(v)
                    const name = `$${fixName ? fixName : prefix ? `${prefix}__${k}` : k}`
                    this.vars[name] = argTypes[k]
                    result[k] = name
                } else {
                    result[k] = JSON.stringify(v)
                }
            }
        }

        return Object.keys(result).length === 0 ? undefined : result
    }

    // TODO: some option to switch betwwen parser
    // TODO: cache
    $build = () => parseGql(this.$gql())

    $gql = () => this.root.compile(false)

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
            } else if (this.#args) {
                const args = Object.entries(this.#args)
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
export type TypeMap = Record<string, any>

type OperationBuilder<O extends TypeMap> = _OperationBuilder<O, Flag.Buildable | Flag.AutoTn>
    & ((name: string) => _OperationBuilder<O, Flag.Buildable | Flag.AutoTn>)

type _OperationBuilder<O extends TypeMap, F extends Flag> = {
    [K in keyof O]: O[K] extends Operation<infer I, infer O>
        ? OperationFn<I, O, {}, F, []>
        : Select<BareType<O[K]>, {}, {}, F | TypeFlags<O[K]>, []>
}

type OperationFn<I extends Input, O, R, F extends Flag, P extends string[]> = <A extends Arguments<I>>(
    params: A
) => Select<BareType<O>, R, {} & ToVars<I, P, A>, F | TypeFlags<O>, P>

type FragmentBuilder<T extends TypeMap, F extends Flag> = {
    [K in keyof T]: Select<T[K], {}, {}, F, []>
}

type TypeBuilder<T extends TypeMap, F extends Flag> = {
    [K in keyof T]: Select<T[K], {}, {}, F, []> & IsFunction<T[K]>
}

type IsFunction<T extends SimpleType> = {
    // @ts-expect-error V is assignable to TypeVariant<V, T>, but TS is not liking it, but works
    $is: <V extends SimpleType>(obj: V) => obj is TypeVariant<V, T>
}

type TypeVariant<V extends SimpleType, T extends SimpleType> = MergeUnion<{ __typename: T["__typename"] } & V>

/**
 * @example
 * ```typescript
 * const Query = queryBuilder()
 * Query.users({id: ...})
 * ```
 */
export function queryBuilder<T extends TypeMap>(opd: FieldDefinitions) {
    return newRootBuilder(new Context(opd, "Query", [])) as unknown as OperationBuilder<T>
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
export function mutationBuilder<T extends TypeMap>(opd: FieldDefinitions) {
    return newRootBuilder(new Context(opd, "Mutation", [])) as unknown as OperationBuilder<T>
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
export function subscriptionBuilder<T extends TypeMap>(opd: FieldDefinitions) {
    return newRootBuilder(new Context(opd, "Subscription", [])) as unknown as OperationBuilder<T>
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
export function fragmentBuilder<T extends TypeMap>(opd: FieldDefinitions) {
    return newTypeBuilder(new Context(opd, "Fragment", [])) as unknown as (
        name: string
    ) => FragmentBuilder<T, Flag.AutoTn>
}

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
export function typeBuilder<T extends TypeMap>(opd: FieldDefinitions) {
    return newTypeBuilder(new Context(opd, "Type", [])) as unknown as TypeBuilder<T, Flag.AutoTn>
}

function isType(obj: any) {
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

const RootBuilderProxy = {
    get(target: ProxyTarget, key: string | symbol, _receiver: any): any {
        const context = target[CONTEXT]
        if (ContextSpecials.includes(key)) {
            return context[key as keyof typeof context]
        }

        if (typeof key !== "string") {
            throw new Error(`Invalid key: ${String(key)}`)
        }

        const def = context.fieldDefs[context.type][key]
        const root = new Context(context.fieldDefs, context.type, context.path)

        if (def == null) {
            // Atomic type without args, eg: Query.currentUserId
            const operation = root.sub("Operation", [key])
            return newSelectionBuilder(operation.sub("Type", []))
        } else if (typeof def === "string") {
            // Simple type without args, eg: Query.currentUser
            const operation = root.sub("Operation", [key])
            return newSelectionBuilder(operation.sub("Type", [def]))
        } else if (Array.isArray(def)) {
            // Simple type with args, eg: Query.users({is_active: true}).id
            root.maybeMethod = true
            root.fields.push(key)
            return newRootBuilder(root)
        } else {
            // Atomic type with args, eg, Query.distance({lat: 1, lng: 2, from: ...})
            root.maybeMethod = true
            root.fields.push(key)
            return newRootBuilder(root)
        }
    }
}

/**
 * @param context Context is must have type: Query | Mutation | Subscription
 */
function rootBuilderCall(proxy: ProxyTarget, context: Context, args: any[]) {
    if (args.length === 1 && context.path.length === 0) {
        // Query("UserQuery")
        if (typeof args[0] === "string") {
            return newRootBuilder(new Context(context.fieldDefs, context.type, [args[0]]))
        }
    }

    if (!context.maybeMethod) {
        console.error(context.type, context.path.join("."))
        throw new Error(`This is not callable`)
    }
    context.maybeMethod = false

    const key = context.fields.pop()!
    const def = context.fieldDefs[context.type][key]

    const [argTypes, returnType] = Array.isArray(def)
        ? def
        : typeof def === "string"
          ? [undefined, def]
          : [def, undefined]

    if (argTypes === undefined) {
        throw new Error("Internal error")
    }

    const operation = context.sub("Operation", [key])
    const builderFn = operation.handleArgs(args, argTypes)
    if (builderFn != null) {
        throw new Error(
            `Function call in this type is not allow. Use '${context.type}.${key}({...}).field_name' instead`
        )
    }

    return newSelectionBuilder(operation.sub("Type", returnType === undefined ? [] : [returnType]))
}

function newSelectionBuilder(context: Context) {
    return _newBuilder(context, selectionBuilderCall, SelectionBuilderProxy)
}

const SelectionBuilderProxy = {
    get(target: ProxyTarget, key: string | symbol, receiver: any): any {
        const context = target[CONTEXT]
        if (key === CONTEXT) {
            return context
        } else if (ContextSpecials.includes(key)) {
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
        console.error(context.type, context.path.join("."))
        throw new Error(`This is not callable`)
    }
    context.maybeMethod = false

    if (isQuery(context) || isMutation(context) || isSubscription(context)) {
        throw new Error("Not supported")
    } else if (isType(context)) {
        if (context.path.length === 0) {
            throw new Error(`This is not callable`)
        }

        const opName = context.fields.pop()!
        const typename = context.path[0]

        // Handle $on(Fragment.User.id)
        if (opName === "$on") {
            let fragment = asContext(args[0])
            if (fragment == null) {
                throw new Error("Missing fragment or type select")
            }

            if (isType(fragment) && isFragment(fragment.parent)) {
                fragment = fragment.parent!
                if (fragment.name in context.fragments) {
                    throw new Error(`Fragment "${fragment.name}" already exists`)
                }
                context.fragments[fragment.name] = fragment
            }

            const cond = context.sub("Conditional", [])
            cond.subBuilder.push(fragment)

            return proxy
        } else if (opName === "$is") {
            const [obj] = args
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            return obj == null ? false : obj["__typename"] === typename
        }

        const def = context.fieldDefs[typename][opName]
        if (def == null) {
            throw new Error(`This is not callable: ${opName}`)
        }

        const [argTypes, returnType] = Array.isArray(def)
            ? def
            : typeof def === "string"
              ? [undefined, def]
              : [def, undefined]
        const operation = context.sub("Operation", [opName])
        const builderFn = argTypes === undefined ? (args[0] as () => any) : operation.handleArgs(args, argTypes)

        const subContext = operation.sub("Type", returnType === undefined ? [] : [returnType])
        const subBuilder = newSelectionBuilder(subContext)
        if (builderFn != null) {
            builderFn(subBuilder)
        }

        return proxy
    } else if (isFragment(context)) {
        throw new Error(`Fragment is not callable. Use 'Fragment("fragmentName").TypeName.id.name' instead`)
    } else {
        throw new Error(`Not supported: ${context.type}`)
    }
}

function newTypeBuilder(context: Context) {
    return _newBuilder(context, typeBuilderCall, TypeBuilderProxy)
}

const TypeBuilderProxy = {
    get(target: ProxyTarget, key: string | symbol, _receiver: any): any {
        const context = target[CONTEXT]
        if (key === CONTEXT) {
            return context
        }
        if (ContextSpecials.includes(key)) {
            return context[key as keyof typeof context]
        }

        if (typeof key !== "string") {
            throw new Error(`Invalid key: ${String(key)}`)
        }

        const root = new Context(context.fieldDefs, context.type, context.path)
        return newSelectionBuilder(root.sub("Type", [key]))
    }
}

/**
 * @param context Context is must have type: Type | Fragment
 */
function typeBuilderCall(proxy: ProxyTarget, context: Context, args: any[]) {
    if (isFragment(context) && args.length === 1 && context.path.length === 0) {
        // Fragment("fragmentName")
        if (typeof args[0] === "string") {
            return newTypeBuilder(new Context(context.fieldDefs, context.type, [args[0]]))
        }

        throw new Error("Invalid type of argument, must be sting")
    } else {
        throw new Error(`This is not callable`)
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
