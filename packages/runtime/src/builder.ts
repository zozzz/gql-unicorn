import { parse as parseGql } from "graphql"

import type { OperationBuilder, Operations } from "./operation"
import { CONTEXT } from "./symbols"
import type { GType } from "./type"
import { isVariable, variableName } from "./var"

/**
 * const __OperationInfo = {
 *  "Query": {
 *    "users": [{id: "ID!"}, "User"]
 * }
 */
export type OperationDefinitions = Record<string, Record<string, [Record<string, string>, string]>>
// TODO: readonly
export type OperationDefinitionsRo = OperationDefinitions

type ContextType = "Query" | "Mutation" | "Subscription" | "Fragment" | "Type" | "Operation"

class Context {
    readonly vars: Record<string, string>
    readonly fields: BField[] = []
    readonly subBuilder: Context[] = []
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
            if (c.type === "Operation" && c.level !== 0) {
                parts.push(c.name)
            }
            c = c.parent
        }
        return parts.join("__")
    }

    constructor(
        readonly operations: OperationDefinitionsRo,
        readonly type: ContextType,
        readonly path: string[],
        parent?: Context
    ) {
        // TODO: WeakRef maybe, or omit parent ref
        this.#parent = parent
        this.vars = parent ? parent.vars : {}
    }

    sub(type: ContextType, path: string[]) {
        const sub = new Context(this.operations, type, path, this)
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

    $gql = () => this.root.compile()

    compile() {
        const result: string[] = []
        const type = this.type

        console.log(this.type, this.path, this.#args)

        if (type === "Query" || type === "Mutation" || type === "Subscription" || type === "Operation") {
            if (type !== "Operation") {
                if (this.level !== 0) {
                    throw new Error("Something went wrong")
                }

                result.push(type.toLowerCase())

                // TODO: name
                const vars = Object.entries(this.vars)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(",")
                if (vars.length > 0) {
                    result.push(`(${vars})`)
                }

                result.push("{")
            }

            result.push(this.path[0])
            if (this.#args) {
                const args = Object.entries(this.#args)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(",")
                if (args.length > 0) {
                    result.push(`(${args})`)
                }
            }

            if (this.subBuilder.length > 0) {
                const subResult = this.subBuilder.map(v => v.compile()).join(",")
                if (subResult.length > 0) {
                    result.push(`{${subResult}}`)
                }
            }

            if (type !== "Operation") {
                result.push("}")
            }
        } else if (type === "Type") {
            const sub = [...this.fields, ...this.subBuilder.map(v => v.compile())]
            if (sub.length > 0 && !sub.includes("__typename")) {
                sub.unshift("__typename")
            }
            result.push(sub.filter((v, i, a) => a.indexOf(v) === i).join(","))
        }

        return result.join("")
    }
}

const ContextSpecials: Array<string | symbol> = ["$build", "$gql"]

// class OperationContext extends ContextBase {
//     constructor(
//         readonly kind: OperationKind,
//         readonly params?: any
//     ) {
//         super()
//     }
// }

// class FragmentContext extends ContextBase {
//     constructor(readonly name: string) {
//         super()
//     }
// }

// class QueryContext extends ContextBase {}

// type Context = OperationContext | FragmentContext

interface ProxyTarget {
    [CONTEXT]: Context
}

type BField = string
export type TypeMap = Record<string, GType>

/**
 * @example
 * ```typescript
 * const Query = queryBuilder()
 * Query.users({id: ...})
 * ```
 */
export function queryBuilder<T extends Operations>(opd: OperationDefinitionsRo) {
    return newRootBuilder<T>(new Context(opd, "Query", [])) as unknown as OperationBuilder<T>
}

export function isQuery(obj: any) {
    return testContextType(obj, "Query")
}

/**
 * @example
 * ```typescript
 * const Mutation = mutationBuilder()
 * Mutation.createUser({name: ...})
 * ```
 */
export function mutationBuilder<T extends Operations>(opd: OperationDefinitionsRo) {
    return newRootBuilder<T>(new Context(opd, "Mutation", [])) as unknown as OperationBuilder<T>
}

export function isMutation(obj: any) {
    return testContextType(obj, "Mutation")
}

/**
 * @example
 * ```typescript
 * const Subscription = subscriptionBuilder()
 * Subscription.onUserChanged({filter: ...})
 * ```
 */
export function subscriptionBuilder<T extends Operations>(opd: OperationDefinitionsRo) {
    return newRootBuilder<T>(new Context(opd, "Subscription", [])) as unknown as OperationBuilder<T>
}

export function isSubscription(obj: any) {
    return testContextType(obj, "Subscription")
}

/**
 * @example
 * ```typescript
 * const Fragment = fragmentBuilder()
 * Fragment.User("Something").id.name
 * ```
 */
export function fragmentBuilder<T extends TypeMap>(opd: OperationDefinitionsRo) {
    return newRootBuilder<T>(new Context(opd, "Fragment", []))
}

export function isFragment(obj: any) {
    return testContextType(obj, "Fragment")
}

/**
 * @example
 * ```typescript
 * const Type = typeBuilder()
 * Query.users().$on(Type.Manager.manager_field.roles(q => q.name))
 * ```
 */
export function typeBuilder<T extends TypeMap>(opd: OperationDefinitionsRo) {
    return newRootBuilder<T>(new Context(opd, "Type", []))
}

export function isType(obj: any) {
    return testContextType(obj, "Type")
}

function newRootBuilder<T extends TypeMap>(context: Context) {
    return new Proxy({ [CONTEXT]: context }, RootBuilderProxy)
}

const RootBuilderProxy = {
    get(target: ProxyTarget, key: string | symbol): any {
        const context = target[CONTEXT]
        if (ContextSpecials.includes(key)) {
            return context[key as keyof typeof context]
        }
        return newBuilder(new Context(context.operations, context.type, [key.toString()]))
    }
}

function testContextType(obj: ProxyTarget | Context, type: ContextType): boolean {
    const otype = CONTEXT in obj ? obj[CONTEXT].type : obj instanceof Context ? obj.type : undefined
    return otype === type
}

function newBuilder(context: Context) {
    const self = ((...args: any[]) => builderCallHandler(proxy, context, ...args)) as unknown as ProxyTarget
    self[CONTEXT] = context
    const proxy = new Proxy(self, BuilderProxy)
    return proxy
}

function builderCallHandler(proxy: ProxyTarget, context: Context, ...args: any[]) {
    if (isQuery(context) || isMutation(context) || isSubscription(context)) {
        // Query.QueryName.users()
        // Query("QueryName").users()
        // Query.users() névtelen query
        if (context.path.length !== 1) {
            throw new Error(`This is not callable ${context.path.join(".")}`)
        }
        // Every root call creates a new builder: eg Query.users() -> create new root builder

        const opName = context.path[0]
        const [argTypes, returnType] = context.operations[context.type][opName]
        const builderFn = context.handleArgs(args, argTypes)

        if (builderFn != null) {
            throw new Error(
                `Function call in this type is not allow. Use '${context.type}.${opName}({...}).field_name' instead`
            )
        }

        return newBuilder(context.sub("Type", [returnType]))
    } else if (isType(context)) {
        if (!context.maybeMethod || context.path.length === 0) {
            throw new Error(`This is not callable`)
        }
        context.maybeMethod = false

        const opName = context.fields.pop()!
        const [argTypes, returnType] = context.operations[context.path[0]][opName]
        const operation = context.sub("Operation", [opName])
        const builderFn = operation.handleArgs(args, argTypes)

        const subContext = operation.sub("Type", [returnType])
        const subBuilder = newBuilder(subContext)
        if (builderFn != null) {
            builderFn(subBuilder)
        }

        return proxy
    } else if (isFragment(context)) {
        // Usage: Fragment.FragmentName.$on(Type.TypeName.id.name)
        // Query.users().$on(Fragment.FragmentName.$on(Type.TypeName.id.name))
        throw new Error("Fragment is not callable. Use 'Fragment.FragmentName.$on(Type.TypeName.id.name)' instead")
        // if (context.fields.length === 0) {
        //     throw new Error(`Missing type name. Use 'Fragment.TypeName("FragmentName").field_name' instead`)
        // }

        // if (args.length === 0 || typeof args[0] !== "string") {
        //     throw new Error(`Missing fragment name. Use 'Fragment.TypeName("FragmentName").field_name' instead`)
        // }

        // return newBuilder(context.sub(context.fields, { name: args[0] }))
    } else {
        throw new Error("Something is wrong")
    }
}

const BuilderProxy = {
    get(target: ProxyTarget, key: string | symbol, receiver: any): any {
        console.log("GET", key)

        const context = target[CONTEXT]
        if (ContextSpecials.includes(key)) {
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

// function addSpecialMethods(builder: any) {
//     builder.$build = () => String(builder[CONTEXT])
//     builder.$on = (select: ProxyTarget) => {
//         if (isType(select) || isFragment(select)) {
//             builder[CONTEXT].subBuilder.push(select[CONTEXT])
//         } else {
//             throw new Error("$on paramter must be constructed with 'Type' or 'Fragment'")
//         }
//         return builder
//     }
//     builder.gql = () => String(builder[CONTEXT])
//     return builder
// }
