import { type FieldDefinitions } from "@gql-unicorn/runtime"
import {
    type GraphQLArgument,
    type GraphQLEnumType,
    type GraphQLEnumValue,
    type GraphQLFieldMap,
    type GraphQLInputFieldMap,
    type GraphQLInputObjectType,
    type GraphQLInterfaceType,
    type GraphQLList,
    type GraphQLNamedType,
    type GraphQLNonNull,
    type GraphQLObjectType,
    type GraphQLScalarType,
    type GraphQLSchema,
    type GraphQLType,
    type GraphQLUnionType,
    isEnumType,
    isInputObjectType,
    isInterfaceType,
    isListType,
    isNonNullType,
    isObjectType,
    isScalarType,
    isUnionType
} from "graphql"

import { type ScalarMap, type UnicornConfig } from "./config"

export type TransformConfig = UnicornConfig

const AtomicScalars = {
    ID: "string",
    Int: "number",
    Float: "number",
    String: "string",
    Boolean: "boolean"
} satisfies ScalarMap

const RuntimeLib = "@gql-unicorn/runtime"

const Banner = ["/* eslint-disable */", "/* prettier-ignore */", "/* !!! GENERATED FILE DO NOT EDIT !!! */"]

export function transform(schema: GraphQLSchema, config?: TransformConfig) {
    return new Transformer(schema, config || {}).transform()
}

class Transformer {
    readonly #scalarMap: Record<string, string>
    readonly #typeMap: Record<string, string> = {}
    readonly #parts: string[] = []
    readonly #indent = "    "
    readonly #imports: Record<string, Record<string, boolean>> = {}
    readonly #objects: Record<string, string> = {}
    readonly #fieldDefs: FieldDefinitions = {}

    constructor(
        readonly schema: GraphQLSchema,
        readonly config: TransformConfig
    ) {
        // TODO: Support custom scalars
        this.#scalarMap = {
            ...AtomicScalars,
            ...this.config.scalars
        }
    }

    transform(): string {
        const builders: string[] = []

        const query = this.schema.getQueryType()
        if (query != null) {
            this.#parts.push(...this.#generateObject(query, "__Query"))
            this.#import(RuntimeLib, "queryBuilder", false)
            builders.push(`export const Query = queryBuilder<__Query>(__FieldDefs)`)
        }

        const mutation = this.schema.getMutationType()
        if (mutation != null) {
            this.#parts.push(...this.#generateObject(mutation, "__Mutation"))
            this.#import(RuntimeLib, "mutationBuilder", false)
            builders.push(`export const Mutation = mutationBuilder<__Mutation>(__FieldDefs)`)
        }

        const subscription = this.schema.getSubscriptionType()
        if (subscription != null) {
            this.#parts.push(...this.#generateObject(subscription, "__Subscription"))
            this.#import(RuntimeLib, "subscriptionBuilder", false)
            builders.push(`export const Subscription = subscriptionBuilder<__Subscription>(__FieldDefs)`)
        }

        const typeMap = this.#generateTypeMap()
        if (typeMap.length > 0) {
            this.#parts.push(...typeMap)
            this.#import(RuntimeLib, "fragmentBuilder", false)
            this.#import(RuntimeLib, "typeBuilder", false)
            builders.push(`export const Type = typeBuilder<__TypeMap>(__FieldDefs)`)
            builders.push(`export const Fragment = fragmentBuilder<__TypeMap>(__FieldDefs)`)
        }

        if (builders.length > 0) {
            const info = JSON.stringify(this.#fieldDefs, null, this.#indent)
            this.#import(RuntimeLib, "FieldDefinitions", true)
            builders.unshift(`const __FieldDefs: FieldDefinitions = ${info}`)
        }

        const reexport = ["$"]
        for (const n of reexport) {
            this.#import(RuntimeLib, n, false)
        }

        this.#parts.unshift(...Banner, ...this.#generateImports())
        return [...this.#parts, ...builders, `export { ${reexport.join(", ")} }`].join("\n")
    }

    #generateImports(): string[] {
        return Object.entries(this.#imports).map(
            ([name, imports]) =>
                `import { ${Object.entries(imports)
                    .map(([name, isType]) => `${isType ? "type " : ""}${name}`)
                    .join(", ")} } from "${name}"`
        )
    }

    #generateTypeMap(): string[] {
        if (Object.keys(this.#objects).length === 0) {
            return []
        }

        return [
            "type __TypeMap = {",
            ...Object.entries(this.#objects).map(([name, type]) => `${this.#indent}${name}: ${type}`),
            "}"
        ]
    }

    #addType(type: GraphQLNamedType): string {
        if (this.#typeMap[type.name]) {
            return this.#typeMap[type.name]
        }

        if (isScalarType(type)) {
            if (!(type.name in this.#scalarMap)) {
                throw new Error(`Unknown scalar type: ${type.name}`)
            }
            const name = this.#scalarMap[type.name]
            this.#typeMap[type.name] = name
            this.#parts.push(...this.#generateScalar(type, name))
            return name
        } else {
            const name = type.name
            this.#typeMap[type.name] = name
            if (isEnumType(type)) {
                this.#parts.push(...this.#generateEnum(type, name))
            } else if (isInputObjectType(type)) {
                this.#parts.push(...this.#generateInput(type, name))
            } else if (isInterfaceType(type)) {
                this.#parts.push(...this.#generateInterface(type, name))
            } else if (isUnionType(type)) {
                this.#parts.push(...this.#generateUnion(type, name))
            } else if (isObjectType(type)) {
                this.#parts.push(...this.#generateObject(type, name))
            }
            return name
        }
        // if (isEnumType(type)) {
        //     this.#parts.push(...this.#generateEnum(type, name))
        // } else if (isInputObjectType(type)) {
        //     this.#parts.push(...this.#generateInput(type, name))
        // } else {

        // }
    }

    #typename(type: GraphQLType): string {
        if (isListType(type)) {
            return this.#typenameOfList(type)
        } else if (isNonNullType(type)) {
            return this.#typenameOfNonNull(type)
        }
        // XXX maybe recursive: `type User { creator: User }`
        return this.#addType(type)
    }

    #bareTypename(type: GraphQLType): string {
        if (isListType(type)) {
            return this.#bareTypename(type.ofType)
        } else if (isNonNullType(type)) {
            return this.#bareTypename(type.ofType)
        }
        return type.name
    }

    #typenameOfList(type: GraphQLList<GraphQLType>): string {
        return `Array<${this.#typename(type.ofType)}>`
    }

    #typenameOfNonNull(type: GraphQLNonNull<GraphQLType>): string {
        return this.#typename(type.ofType)
    }

    #generateScalar(_type: GraphQLScalarType, _name: string): string[] {
        return []
    }

    #generateEnum(type: GraphQLEnumType, name: string): string[] {
        return [
            ...this.#comment(type.description),
            `export const enum ${name} {`,
            ...this.#generateEnumValues(type.getValues()),
            "}"
        ]
    }

    #generateEnumValues(values: ReadonlyArray<GraphQLEnumValue>): string[] {
        const result = []
        const vl = values.length
        let i = 0
        for (const { name, value, description, deprecationReason } of values) {
            result.push(...this.#comment(description, deprecationReason).map(v => `${this.#indent}${v}`))
            result.push(`${this.#indent}${name} = ${JSON.stringify(value)}${i < vl - 1 ? "," : ""}`)
            ++i
        }

        return result
    }

    #generateObject(type: GraphQLObjectType, name: string): string[] {
        if (isObjectType(type) && type.name === name) {
            this.#objects[type.name] = name
        }

        return [
            ...this.#comment(type.description),
            `export type ${name} = {`,
            type.name === name ? `${this.#indent}__typename: ${JSON.stringify(name)}` : null,
            ...this.#generateObjectFields(type, type.getFields()),
            `}`
        ].filter(Boolean) as string[]
    }

    #generateObjectFields(context: GraphQLType, fields: GraphQLFieldMap<any, any>): string[] {
        const result: string[] = []
        for (const [name, { type, description, deprecationReason, args }] of Object.entries(fields)) {
            if (args.length > 0) {
                result.push(
                    ...this.#generateOperation(context, name, args, type, description, deprecationReason).map(
                        v => `${this.#indent}${v}`
                    )
                )
            } else {
                result.push(
                    ...this.#generateField(context, name, type, description, deprecationReason, null).map(
                        v => `${this.#indent}${v}`
                    )
                )
            }
        }
        return result
    }

    #generateInput(type: GraphQLInputObjectType, name: string): string[] {
        return [
            ...this.#comment(type.description),
            `export type ${name} = {`,
            // `${this.#indent}__typename: ${JSON.stringify(name)}`,
            ...this.#generateInputFields(type.getFields()),
            `}`
        ]
    }

    #generateInputFields(fields: GraphQLInputFieldMap): string[] {
        const result: string[] = []
        for (const [name, { type, description, deprecationReason, defaultValue }] of Object.entries(fields)) {
            result.push(
                ...this.#generateField(null, name, type, description, deprecationReason, defaultValue).map(
                    v => `${this.#indent}${v}`
                )
            )
        }
        return result
    }

    #generateField(
        context: GraphQLType | null,
        name: string,
        type: GraphQLType,
        description?: string | null,
        deprecationReason?: string | null,
        defaultValue?: unknown
    ): string[] {
        const result: string[] = []
        result.push(...this.#comment(description, deprecationReason, defaultValue))

        if (isNonNullType(type)) {
            result.push(`${name}: ${this.#typename(type)}`)
        } else {
            result.push(`${name}: ${this.#typename(type)} | null`)
        }

        if (context != null) {
            if (bareIsScalar(type)) {
                this.#addFieldDef(context, name, {}, undefined)
            } else {
                this.#addFieldDef(context, name, {}, this.#bareTypename(type))
            }
        }

        return result
    }

    #generateOperation(
        context: GraphQLType,
        name: string,
        args: ReadonlyArray<GraphQLArgument>,
        type: GraphQLType,
        description?: string | null,
        deprecationReason?: string | null
    ): string[] {
        const result: string[] = []
        const compiledArgs: string[] = []
        const paramsComment: string[] = []

        const opArgInfo: Record<string, string> = {}
        this.#import(RuntimeLib, "Operation", true)

        // alma: OpFunction<{count: number}, Article[] | null>
        for (const arg of args) {
            const [c, a] = this.#generateArg(arg)
            compiledArgs.push(a)
            paramsComment.push(...c)
            opArgInfo[arg.name] = arg.type.toString()
        }

        const returnType = isNonNullType(type) ? this.#typename(type) : `${this.#typename(type)} | null`

        result.push(
            ...this.#comment(description, deprecationReason, null, paramsComment),
            `${name}: Operation<{ ${compiledArgs.join(", ")} }, ${returnType}>`
        )

        this.#addFieldDef(context, name, opArgInfo, bareIsScalar(type) ? undefined : this.#bareTypename(type))

        return result
    }

    #generateArg(arg: GraphQLArgument): [string[], string] {
        const comment: string[] = []
        const argDoc = arg.defaultValue ? ` [${arg.name}=${JSON.stringify(arg.defaultValue)}]` : ` [${arg.name}]`
        const deprectaed = arg.deprecationReason ? `(DEPRECATED: ${arg.deprecationReason}) ` : ""

        if (arg.description != null) {
            comment.push(
                ...arg.description
                    .split(/\r?\n/g)
                    .map((line, i) => ` * ${i > 0 ? this.#indent : `@param${argDoc}`} ${deprectaed}${line.trim()}`)
            )
        }

        const sep = isNonNullType(arg.type) ? ":" : "?:"
        const result: string = `${arg.name}${sep} ${this.#typename(arg.type)}`

        return [comment, result]
    }

    #addFieldDef(
        context: GraphQLType,
        name: string,
        args: Record<string, string>,
        returnType: string | undefined
    ): void {
        if (isObjectType(context)) {
            const contextName = context.name
            const contextO = (this.#fieldDefs[contextName] ??= {})
            if (Object.keys(args).length === 0) {
                if (typeof returnType === "string") {
                    contextO[name] = returnType
                }
            } else {
                if (returnType == null) {
                    contextO[name] = args
                } else {
                    contextO[name] = [args, returnType]
                }
            }
        }
    }

    #generateInterface(type: GraphQLInterfaceType, name: string): string[] {
        this.#import(RuntimeLib, "Interface", true)

        const impls = this.schema.getImplementations(type)
        const objects = impls.objects.map(o => this.#typename(o))
        const interfaces = impls.interfaces.map(o => this.#typename(o))

        const comment = this.#comment(type.description)
        return [
            ...comment,
            `type __interface_${name} = {`,
            ...this.#generateObjectFields(type, type.getFields()),
            `}`,
            ...comment,
            `export type ${name} = Interface<__interface_${name}, ${[...objects, ...interfaces].join(" | ")}>`
        ]
    }

    #generateUnion(type: GraphQLUnionType, name: string): string[] {
        this.#import(RuntimeLib, "Union", true)

        const types = type.getTypes().map(t => this.#typename(t))

        return [...this.#comment(type.description), `export type ${name} = Union<${types.join(" | ")}>`]
    }

    #comment(
        text?: string | null,
        deprecationReason?: string | null,
        defaultValue?: unknown,
        extra?: string[]
    ): string[] {
        const result: string[] = []
        if (text == null && deprecationReason == null) {
            return result
        }

        result.push(`/**`)
        if (text != null) {
            result.push(...text.split(/\r?\n/g).map(line => ` * ${line.trim()}`))
        }
        if (defaultValue != null) {
            result.push(` * @default ${JSON.stringify(defaultValue)}`)
        }
        if (deprecationReason != null) {
            result.push(` * @deprecated ${deprecationReason}`)
        }
        if (extra != null) {
            result.push(...extra)
        }
        result.push(" */")

        return result
    }

    #import(_from: string, what: string, isType: boolean) {
        if (!(_from in this.#imports)) {
            this.#imports[_from] = {}
        }

        this.#imports[_from][what] = isType
    }
}

function bareIsScalar(type: GraphQLType) {
    if (isListType(type)) {
        return bareIsScalar(type.ofType)
    } else if (isNonNullType(type)) {
        return bareIsScalar(type.ofType)
    }
    return isScalarType(type)
}
