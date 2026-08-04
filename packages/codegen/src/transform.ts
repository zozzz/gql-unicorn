/* eslint-disable @stylistic/js/max-len */
import { camelCase, pascalCase } from "es-toolkit"
import {
    type GraphQLArgument,
    type GraphQLEnumType,
    type GraphQLEnumValue,
    type GraphQLFieldMap,
    type GraphQLInputFieldMap,
    type GraphQLInputObjectType,
    type GraphQLInterfaceType,
    type GraphQLNamedType,
    type GraphQLObjectType,
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

const Banner = [
    "/* eslint-disable */",
    "/* prettier-ignore */",
    "/* !!! GENERATED FILE DO NOT EDIT !!! */",
    'import * as __runtime from "@gql-unicorn/runtime"'
]

export function transform(schema: GraphQLSchema, config?: TransformConfig) {
    return new Transformer(schema, { typeinfo: true, ...(config || {}) }).transform()
}

const SelectTypeArgs = `S extends SelectionDef, V, P extends string[], E extends string = never`

class Transformer {
    readonly #scalarMap: ScalarMap
    readonly #typeMap: Record<string, string> = {}
    readonly #parts: string[] = []
    readonly #indent = "    "
    readonly #imports: Record<string, Record<string, boolean>> = {}
    // readonly #selectedTypes: Record<string, string[]> = {}

    readonly #enums: string[] = []

    readonly #typeInfos: Record<string, { name: string; code: string }> = {}
    readonly #argTypes: Record<string, { name: string; code: string }> = {}
    readonly #argInfoVar: Record<string, { name: string; code: string }> = {}
    readonly #typeInfoVar: Record<string, string> = {}

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
        const builders: string[] = [
            // `type AsBuilder = { input: Input; output: BuilderOutputFlags; operation: string }`,
            // `type BuilderOutputFlags = { nullable: boolean, many: "nullable" | "must" | "none" }`,
            // `type ResultByOutputFlags<T, F extends BuilderOutputFlags> =
            //     F extends { nullable: infer N, many: infer M }
            //         ? N extends true
            //             ? M extends "nullable"
            //                 ? Array<T | null> | null
            //                 : M extends "must"
            //                     ? Array<T>
            //                     : T | null
            //             : M extends "nullable"
            //                 ? Array<T | null>
            //                 : M extends "must"
            //                     ? Array<T>
            //                     : T
            //         : never`,
            // `type Prettify<T> = { [K in keyof T]: T[K] } & {};`
        ]

        const query = this.schema.getQueryType()
        if (query != null) {
            this.#import(RuntimeLib, "queryBuilder", false)
            builders.push(...this.#rootBuilder(query, "query", "queryBuilder"))
        }

        const mutation = this.schema.getMutationType()
        if (mutation != null) {
            this.#import(RuntimeLib, "mutationBuilder", false)
            builders.push(...this.#rootBuilder(mutation, "", "mutationBuilder"))
        }

        const subscription = this.schema.getSubscriptionType()
        if (subscription != null) {
            this.#import(RuntimeLib, "subscriptionBuilder", false)
            builders.push(...this.#rootBuilder(subscription, "subscribe", "subscriptionBuilder"))
        }

        const reexport = ["$", "$$"]
        this.#import(RuntimeLib, "TypeOf", true)
        this.#import(RuntimeLib, "VarOf", true)
        this.#import(RuntimeLib, "Selected", true)

        const tiDefs: string[] = []
        const argTypes: string[] = []
        const tiTypes: string[] = []

        for (const { name, code } of Object.values(this.#typeInfos)) {
            tiDefs.push(`const ${name} = ${code} as const`)
        }

        for (const [key, { code }] of Object.entries(this.#argTypes)) {
            argTypes.push(code)
            argTypes.push(`const ${this.#argInfoVar[key].name} = ${this.#argInfoVar[key].code} as const`)
        }

        for (const [name, v] of Object.entries(this.#typeInfoVar)) {
            tiTypes.push(`    "${name}": ${v},`)
        }
        if (tiTypes.length > 0) {
            tiTypes.unshift(`export const __TypeInfo = {`)
            tiTypes.push(`} as const`)
        }

        const typeInfos = argTypes.length > 0 || tiTypes.length > 0 ? [...tiDefs, ...argTypes, ...tiTypes] : []

        this.#parts.unshift(...Banner, ...this.#generateImports(), ...this.#enums, ...typeInfos)
        return [
            ...this.#parts,
            // ...Object.values(this.#selectedTypes).flat(),
            ...builders,
            ...reexport.map(v => `export const ${v} = __runtime.${v}`),
            "export type { TypeOf, VarOf, Selected }"
        ].join("\n")
    }

    #generateImports(): string[] {
        return Object.entries(this.#imports).map(
            ([name, imports]) =>
                `import { ${Object.entries(imports)
                    .map(([name, isType]) => `${isType ? "type " : ""}${name}`)
                    .join(", ")} } from "${name}"`
        )
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

            if (typeof name === "string") {
                this.#typeMap[type.name] = name
                return name
            } else {
                const result = name.alias ?? name.import
                this.#typeMap[type.name] = result
                this.#import(name.from, name.import, true, name.alias)
                return result
            }
        } else {
            const name = this.#bareType(type).name
            this.#typeMap[type.name] = name
            if (isEnumType(type)) {
                this.#enums.push(...this.#generateEnum(type, name))
            } else if (isInputObjectType(type)) {
                this.#parts.push(...this.#generateInput(type, name))
            } else if (isInterfaceType(type)) {
                this.#parts.push(...this.#generateInterface(type, name))
                this.#parts.push(...this.#select(type))
            } else if (isUnionType(type)) {
                this.#parts.push(...this.#generateUnion(type, name))
                this.#parts.push(...this.#select(type))
            } else if (isObjectType(type)) {
                this.#parts.push(...this.#generateObject(type, name))
                this.#parts.push(...this.#select(type))
            }
            return name
        }
    }

    #typename(type: GraphQLType, nullable: boolean = true, sd: string | null = null): string {
        if (isListType(type)) {
            return maybeNullable(`Array<${this.#typename(type.ofType, nullable, sd)}>`, nullable)
        } else if (isNonNullType(type)) {
            return this.#typename(type.ofType, false, sd)
        }

        if (isObjectType(type) || isInterfaceType(type) || isUnionType(type)) {
            if (sd != null) {
                return maybeNullable(`${this.#addType(type)}<${sd}>`, nullable)
            }
        }
        return maybeNullable(this.#addType(type), nullable)
    }

    #bareTypename(type: GraphQLType): string {
        return this.#addType(this.#bareType(type))
    }

    #selectName(type: GraphQLType): string {
        return `${this.#addType(this.#bareType(type))}Select`
    }

    #bareType(type: GraphQLType): GraphQLNamedType {
        if (isListType(type)) {
            return this.#bareType(type.ofType)
        } else if (isNonNullType(type)) {
            return this.#bareType(type.ofType)
        }
        return type
    }

    #generateEnum(type: GraphQLEnumType, name: string): string[] {
        return [
            ...this.#comment(type.description),
            `export const ${name} = {`,
            ...this.#generateEnumValues(type.getValues()),
            "} as const",
            `export type ${name} = typeof ${name}[keyof typeof ${name}]`
        ]
    }

    #generateEnumValues(values: ReadonlyArray<GraphQLEnumValue>): string[] {
        const result = []
        const vl = values.length
        let i = 0
        for (const { name, value, description, deprecationReason } of values) {
            result.push(...this.#comment(description, deprecationReason).map(v => `${this.#indent}${v}`))
            result.push(`${this.#indent}${JSON.stringify(name)}: ${JSON.stringify(value)}${i < vl - 1 ? "," : ""}`)
            ++i
        }

        return result
    }

    // #generateObject(type: GraphQLObjectType, name: string): string[] {
    //     if (this.config.typeinfo) {
    //         this.#typeInfoVar[type.name] = this.#typeInfo(type).name
    //     }

    //     return [
    //         ...this.#comment(type.description),
    //         `export type ${name} = {`,
    //         `${this.#indent}__typename: ${JSON.stringify(this.#bareType(type).name)}`,
    //         ...this.#generateObjectFields(type, type.getFields()),
    //         `}`,
    //         ...this.#generateTypeBuilder(type)
    //     ].filter(Boolean)
    // }

    // #generateObjectFields(context: GraphQLType, fields: GraphQLFieldMap<any, any>): string[] {
    //     const result: string[] = []
    //     for (const [name, { type, description, deprecationReason }] of Object.entries(fields)) {
    //         result.push(
    //             ...this.#generateField(context, name, type, description, deprecationReason, null).map(
    //                 v => `${this.#indent}${v}`
    //             )
    //         )
    //     }
    //     return result
    // }

    #generateObject(type: GraphQLObjectType, name: string): string[] {
        this.#import(RuntimeLib, "SelectionDef", true)
        this.#import(RuntimeLib, "FlattenOnSelection", true)
        this.#import(RuntimeLib, "LetSelectionDef", true)

        if (this.config.typeinfo) {
            this.#typeInfoVar[type.name] = this.#typeInfo(type).name
        }

        const typeNameStr = JSON.stringify(this.#bareType(type).name)
        const fields = []
        fields.push()

        for (const { name: fieldName, type: fieldType, description, deprecationReason } of Object.values(
            type.getFields()
        )) {
            const fieldDef = []
            fieldDef.push(...this.#comment(description, deprecationReason))

            fieldDef.push(`${fieldName}: ${this.#selectedFieldType(fieldType, fieldName)}`)

            const glue = `\n${this.#indent}${this.#indent}`
            const value = `{${glue}${fieldDef.join(glue)}\n${this.#indent}}`
            const bareFType = this.#bareType(fieldType)

            if (isObjectType(bareFType) || isInterfaceType(bareFType) || isUnionType(bareFType)) {
                fields.push(
                    // `(SD extends Array<infer SF extends Record<string, SelectionDef>> ? ${JSON.stringify(fieldName)} extends keyof SF ? ${value} : unknown : unknown)`
                    `(Extract<SD[number], { ${JSON.stringify(fieldName)}: unknown }> extends { ${JSON.stringify(fieldName)}: infer SF } ? SF extends SelectionDef ? ${value} : unknown : unknown)`
                )
            } else {
                fields.push(`(${JSON.stringify(fieldName)} extends SD[number] ? ${value} : unknown)`)
            }
        }

        return [
            ...this.#comment(type.description),
            `export type _${name}<SD extends SelectionDef> = `,
            `${this.#indent}& LetSelectionDef<SD>`,
            `${this.#indent}& { __typename: ${typeNameStr} }`,
            ...fields.map(v => `${this.#indent}& ${v}`),
            `export type ${name}<SD extends SelectionDef> = _${name}<FlattenOnSelection<SD, ${typeNameStr}>>`,
            ...this.#generateTypeBuilder(type)
        ].filter(Boolean)
    }

    #selectedFieldType(type: GraphQLType, name: string, nullable: boolean = true): string {
        if (isNonNullType(type)) {
            return this.#selectedFieldType(type.ofType, name, false)
        } else if (isListType(type)) {
            return `Array<${this.#selectedFieldType(type.ofType, name)}>${nullable ? " | null" : ""}`
        } else if (isObjectType(type) || isInterfaceType(type) || isUnionType(type)) {
            return `${this.#typename(type, false)}<SF>${nullable ? " | null" : ""}`
        }
        return this.#typename(type, nullable)
    }

    #generateTypeBuilder(context: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType): string[] {
        this.#import(RuntimeLib, "TypeBuilder", true)
        this.#import(RuntimeLib, "BuilderInfo", true)
        this.#import(RuntimeLib, "typeBuilder", false)
        const info: string[] = []

        if (!isUnionType(context)) {
            for (const { name, type, args } of Object.values(context.getFields())) {
                if (args.length > 0) {
                    const [_, ai] = this.#argInfoType(args)

                    if (bareIsScalar(type)) {
                        info.push(`${name}: ${ai}`)
                    } else {
                        info.push(`${name}: [${ai}, ${this.#bareTypename(type)}]`)
                    }
                } else {
                    if (!bareIsScalar(type)) {
                        info.push(`${name}: ${this.#bareTypename(type)}`)
                    }
                }
            }
        }

        const infoStr = info.length > 0 ? `, (() => ({ ${info.join(", ")} })) as () => BuilderInfo` : ""
        const T = this.#selectType(this.#selectName(context), `["__typename"]`, "{}", "[]")
        const TN = JSON.stringify(context.name)
        return [
            `export const ${this.#bareTypename(context)} = typeBuilder("${context.name}"${infoStr}) as TypeBuilder<${T}, ${TN}>`
        ]
    }

    #generateInput(type: GraphQLInputObjectType, name: string): string[] {
        this.#import(RuntimeLib, "Variable", true)

        const fname = type.isOneOf ? `${name}OneOf` : name
        const result = [
            ...this.#comment(type.description),
            `export type ${fname} = {`,
            ...this.#generateInputFields(type.getFields(), type.isOneOf),
            `}`
        ]

        if (type.isOneOf) {
            this.#import(RuntimeLib, "ExactlyOne", true)
            result.push(`export type ${name} = ExactlyOne<${fname}>`)
        }

        return result
    }

    #generateInputFields(fields: GraphQLInputFieldMap, isOneOf: boolean): string[] {
        const result: string[] = []
        for (const [name, { type, description, deprecationReason, defaultValue }] of Object.entries(fields)) {
            if (name === "__typename") {
                continue
            }

            const fieldDef = []
            fieldDef.push(
                ...this.#comment(description, deprecationReason, defaultValue).map(v => `${this.#indent}${v}`)
            )

            if (isNonNullType(type)) {
                fieldDef.push(`${this.#indent}${name}: ${this.#typename(type.ofType, false)} | Variable`)
            } else {
                fieldDef.push(
                    `${this.#indent}${name}${isOneOf ? "" : "?"}: ${this.#typename(type, false)} | Variable | null`
                )
            }

            result.push(...fieldDef)
        }
        return result
    }

    // #generateField(
    //     context: GraphQLType | null,
    //     name: string,
    //     type: GraphQLType,
    //     description?: string | null,
    //     deprecationReason?: string | null,
    //     defaultValue?: unknown,
    //     isOneOf: boolean = false
    // ): string[] {
    //     const result: string[] = []
    //     result.push(...this.#comment(description, deprecationReason, defaultValue))
    //     const ft = isNonNullType(type)
    //         ? `: ${this.#typename(type.ofType, false)}`
    //         : isOneOf
    //           ? `: ${this.#typename(type, false)}`
    //           : `?: ${this.#typename(type, false)} | null`
    //     result.push(`${name}${ft}`)
    //     return result
    // }

    #generateInterface(type: GraphQLInterfaceType, name: string): string[] {
        const types = this.#__typenames(type)
        const comment = this.#comment(type.description)
        const commonFieldNames = Object.keys(type.getFields())
        const [defs, cases] = this.#generateUnionCases(name, types, commonFieldNames)

        return [
            ...comment,
            defs,
            `export type ${name}<SD extends SelectionDef> =`,
            cases,
            ...this.#generateTypeBuilder(type)
        ]
    }

    #generateUnion(type: GraphQLUnionType, name: string): string[] {
        const types = this.#__typenames(type)
        const [defs, cases] = this.#generateUnionCases(name, types, [])

        return [
            ...this.#comment(type.description),
            defs,
            `export type ${name}<SD extends SelectionDef> =`,
            cases,
            ...this.#generateTypeBuilder(type)
        ]
    }

    #generateUnionCases(baseName: string, types: string[], commonFields: string[]): [string, string] {
        this.#import(RuntimeLib, "VariantSelection", true)

        const result: Record<string, string> = {}
        for (const t of types) {
            result[t] =
                `VariantSelection<SD, ${JSON.stringify(t)}, ${JSON.stringify(commonFields)}> extends infer SelDef extends SelectionDef ? SelDef["length"] extends 0 ? never : ${t}<SelDef> : never`
        }

        const typeDefs = Object.entries(result)
            .map(([t, v]) => `export type ${baseName}__${t}<SD extends SelectionDef> = ${v}`)
            .join("\n")

        const cases = Object.keys(result)
            .map(v => `${this.#indent}| ${baseName}__${v}<SD>`)
            .join("\n")

        return [typeDefs, cases]
    }

    #rootBuilder(context: GraphQLObjectType, prefix: string, builder: string): string[] {
        const result: string[] = []

        for (const { name, args, type, description, deprecationReason } of Object.values(context.getFields())) {
            const varName = prefix && prefix.length > 0 ? `${prefix}${pascalCase(name)}` : camelCase(name)
            let argType: string = "undefined"
            let argInfo: string | undefined
            let argOptional: boolean
            let typeValue: string = "any"
            const builderFns = []

            this.#import(RuntimeLib, "BuildReturn", true)

            if (args.length > 0) {
                this.#import(RuntimeLib, "Arguments", true)
                ;[argType, argInfo, argOptional] = this.#argInfoType(args)
                if (bareIsScalar(type)) {
                    typeValue = this.#typename(type)

                    builderFns.push(
                        `<A>(queryName: string, args: Arguments<A, ${argType}>): `
                            + `BuildReturn<"${name}", ${typeValue}, ToVars<${argType}, [], A>>`
                    )

                    builderFns.push(
                        `<A>(args: Arguments<A, ${argType}>): `
                            + `BuildReturn<"${name}", ${typeValue}, ToVars<${argType}, [], A>>`
                    )

                    if (argOptional) {
                        builderFns.push(`(queryName: string): ` + `BuildReturn<"${name}", ${typeValue}, never>`)
                        builderFns.push(`(): ` + `BuildReturn<"${name}", ${typeValue}, never>`)
                    }
                } else {
                    this.#import(RuntimeLib, "SelectionDef", true)
                    const S = this.#selectR(type)
                    typeValue = this.#subSelectType(this.#selectName(type), S, "{}", "[]")
                    argInfo = `[${argInfo}, ${this.#bareTypename(type)}]`
                    const sfn = `(select: ${typeValue}) => Selection<ST, SV>`

                    builderFns.push(
                        `<ST, SV extends Vars, A>`
                            + `(queryName: string, args: Arguments<A, ${argType}>, select: ${sfn})`
                            + `: BuildReturn<"${name}", ${this.#builderResultType(type, "ST")}, MergeVars<SV, ToVars<${argType}, [], A>>>`
                    )

                    builderFns.push(
                        `<ST, SV extends Vars, A>`
                            + `(args: Arguments<A, ${argType}>, select: ${sfn})`
                            + `: BuildReturn<"${name}", ${this.#builderResultType(type, "ST")}, MergeVars<SV, ToVars<${argType}, [], A>>>`
                    )

                    const builderReturn = this.#subSelectType(
                        this.#selectName(type),
                        S,
                        `ToVars<${argType}, [], A>`,
                        "[]",
                        `never`
                    )
                    builderFns.push(`builder<A>(queryName: string, args: Arguments<A, ${argType}>): ${builderReturn}`)
                    builderFns.push(`builder<A>(args: Arguments<A, ${argType}>): ${builderReturn}`)

                    if (argOptional) {
                        builderFns.push(
                            `<ST, SV extends Vars>`
                                + `(queryName: string, select: ${sfn})`
                                + `: BuildReturn<"${name}", ${this.#builderResultType(type, "ST")}, SV>`
                        )

                        builderFns.push(
                            `<ST, SV extends Vars>`
                                + `(select: ${sfn})`
                                + `: BuildReturn<"${name}", ${this.#builderResultType(type, "ST")}, SV>`
                        )

                        const builderReturn = this.#subSelectType(this.#selectName(type), S, `{}`, "[]", `never`)
                        builderFns.push(`builder(queryName: string): ${builderReturn}`)
                        builderFns.push(`builder(): ${builderReturn}`)
                    }
                }
            } else {
                if (bareIsScalar(type)) {
                    typeValue = this.#typename(type)

                    builderFns.push(`(queryName: string): BuildReturn<"${name}", ${typeValue}, never>`)
                    builderFns.push(`(): BuildReturn<"${name}", ${typeValue}, never>`)
                } else {
                    this.#import(RuntimeLib, "SelectionDef", true)

                    const S = this.#selectR(type)
                    typeValue = this.#subSelectType(this.#selectName(type), S, "{}", "[]")
                    argInfo = this.#bareTypename(type)
                    const sfn = `(select: ${typeValue}) => Selection<ST, SV>`

                    builderFns.push(
                        `<ST, SV extends Vars>`
                            + `(queryName: string, select: ${sfn})`
                            + `: BuildReturn<"${name}", ${this.#builderResultType(type, "ST")}, SV>`
                    )

                    builderFns.push(
                        `<ST, SV extends Vars>`
                            + `(select: ${sfn})`
                            + `: BuildReturn<"${name}", ${this.#builderResultType(type, "ST")}, SV>`
                    )

                    const builderReturn = this.#subSelectType(this.#selectName(type), S, `{}`, "[]", `never`)
                    builderFns.push(`builder(queryName: string): ${builderReturn}`)
                    builderFns.push(`builder(): ${builderReturn}`)
                }
            }

            const builderIName = `${pascalCase(varName)}BuilderFn`
            const builderInterface = [
                `export interface ${builderIName} {`,
                ...builderFns.map(v => `${this.#indent}${v}`),
                `}`
            ]

            const argInfoRes = argInfo ? `, ${argInfo}` : ""

            // const _builderFn = `{ builder: ${builderFn} }`
            result.push(
                ...builderInterface,
                ...this.#comment(description, deprecationReason),
                `export const ${varName} = ${builder}("${name}"${argInfoRes}) as ${builderIName}`
            )
        }

        return result
    }

    #builderResultType(type: GraphQLType, typeVar: string, nullable: boolean = true): string {
        if (isNonNullType(type)) {
            return this.#builderResultType(type.ofType, typeVar, false)
        } else if (isListType(type)) {
            return `Array<${this.#builderResultType(type.ofType, typeVar)}>${nullable ? " | null" : ""}`
        }
        return `${typeVar}${nullable ? " | null" : ""}`
    }

    #typeIntoBuilderOutputFlags(type: GraphQLType): Record<string, any> {
        const flags: Record<string, any> = { nullable: true, many: "none" }
        if (isNonNullType(type)) {
            flags.nullable = false
            type = type.ofType
        }
        if (isListType(type)) {
            if (isNonNullType(type.ofType)) {
                flags.many = "must"
            } else {
                flags.many = "nullable"
            }
        }
        return flags
    }

    #select(type: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType): string[] {
        const result: string[] = []

        this.#import(RuntimeLib, "Vars", true)
        this.#import(RuntimeLib, "Selection", true)

        const fields = isUnionType(type) ? [] : this.#selectFields(type, type.getFields())
        const typeName = this.#selectName(type)

        fields.push(this.#onFns(type).join("\n"))
        const buildFn = this.#buildFn(type).join("\n")
        fields.push(`("$build" extends E ? unknown : ${buildFn})`)

        // const R = isObjectType(type) ? `[...R, "__typename"]` : "R"
        // R extends SelectionDef, V extends Vars, P extends string[], B extends AsBuilder = never, E extends string = never
        result.push(
            ...this.#comment(type.description),
            `export type ${typeName}<${SelectTypeArgs}> = Selection<${this.#bareTypename(type)}<S>, V>`,
            ...fields.map(v => `${this.#indent}& ${v}`)
        )

        return result
    }

    #selectFields(context: GraphQLType, fields: GraphQLFieldMap<any, any>): string[] {
        const result: string[] = []
        for (const { name, args, type, description, deprecationReason } of Object.values(fields)) {
            const blockItems = [
                ...this.#comment(description, deprecationReason, undefined),
                ...this.#selectField(context, name, args, type)
            ]
            const block = ["{", ...blockItems.map(v => `${this.#indent}${this.#indent}${v}`), `${this.#indent}}`].join(
                "\n"
            )

            result.push(`(${JSON.stringify(name)} extends E ? unknown : ${block})`)
        }
        return result
    }

    #selectField(
        context: GraphQLType,
        name: string,
        args: ReadonlyArray<GraphQLArgument>,
        type: GraphQLType
    ): string[] {
        const contextName = this.#selectName(context)
        const result: string[] = []

        this.#import(RuntimeLib, "ExtendSelection", true)
        this.#import(RuntimeLib, "GetSelectionDef", true)

        if (args.length > 0) {
            this.#import(RuntimeLib, "Arguments", true)
            this.#import(RuntimeLib, "ToVars", true)
            this.#import(RuntimeLib, "MergeVars", true)
            const [argumentType, _, argOptional] = this.#argInfoType(args)
            const VP = `[...P, ${JSON.stringify(name)}]`

            if (bareIsScalar(type)) {
                const S = `ExtendSelection<S, ${JSON.stringify(name)}>`
                const V = `MergeVars<V, ToVars<${argumentType}, ${VP}, A>>`
                const E = `E | ${JSON.stringify(name)}`
                const returnType = this.#selectType(contextName, S, V, "P", E)

                result.push(`${name}<A>(args: Arguments<A, ${argumentType}>): ${returnType}`)

                if (argOptional) {
                    const returnType = this.#selectType(contextName, S, "V", "P", E)
                    result.push(`${name}(): ${returnType}`)
                }
            } else {
                const S = `ExtendSelection<S, Record<${JSON.stringify(name)}, GetSelectionDef<ST>>>`
                const V = `MergeVars<MergeVars<V, SV>, ToVars<${argumentType}, ${VP}, A>>`
                const E = `E | ${JSON.stringify(name)}`
                const returnType = this.#selectType(contextName, S, V, "P", E)
                const subs = this.#subSelectType(this.#selectName(type), `["__typename"]`, "{}", `[...P, "${name}"]`)
                const subf = `(select: ${subs}) => Selection<ST, SV>`

                result.push(
                    `${name}<A, ST, SV extends Vars>(args: Arguments<A, ${argumentType}>, select: ${subf}): ${returnType}`
                )

                if (argOptional) {
                    const V = `MergeVars<V, SV>`
                    const returnType = this.#selectType(contextName, S, V, "P", E)
                    result.push(`${name}<ST, SV extends Vars>(select: ${subf}): ${returnType}`)
                }
            }
        } else {
            if (bareIsScalar(type)) {
                const S = `ExtendSelection<S, ${JSON.stringify(name)}>`
                const V = `V`
                const E = `E | ${JSON.stringify(name)}`
                const returnType = this.#selectType(contextName, S, V, "P", E)
                result.push(`${name}: ${returnType}`)
            } else {
                const S = `ExtendSelection<S, Record<${JSON.stringify(name)}, GetSelectionDef<ST>>>`
                const V = `MergeVars<V, SV>`
                const E = `E | ${JSON.stringify(name)}`
                const returnType = this.#selectType(contextName, S, V, "P", E)
                const subs = this.#subSelectType(this.#selectName(type), `["__typename"]`, "{}", `[...P, "${name}"]`)
                const subf = `(select: ${subs}) => Selection<ST, SV>`
                result.push(`${name}<ST, SV extends Vars>(select: ${subf}): ${returnType}`)
            }
        }

        return result
    }

    #onFns(type: GraphQLType): string[] {
        this.#import(RuntimeLib, "ExtendSelection", true)
        this.#import(RuntimeLib, "GetSelectionDef", true)
        this.#import(RuntimeLib, "GetTypeName", true)

        // this.#import(RuntimeLib, "OnFnResult", true)
        const selfT = this.#selectType(
            this.#selectName(type),
            `ExtendSelection<S, { $on: Record<GetTypeName<ST>, GetSelectionDef<ST>> }>`,
            "MergeVars<V, SV>",
            "P",
            "E"
        )

        const onSelf = `$on<ST, SV extends Vars>(fragment: Selection<ST, SV>): ${selfT}`
        const result: string[] = ["/**", " * Constraint type selection", " */", onSelf]

        // TODO: maybe once upon a time
        // const otherSelfT = this.#selectType(this.#selectName(type), "R | SR", "V & SV", "P")
        // const fragmentTypes: string[] = []

        // if (isUnionType(type)) {
        //     for (const entry of this.#expandTypes(type)) {
        //         const entryAny = this.#selectType(this.#selectName(entry), "any", "any", "any")
        //         result.push(`$on<SR, SV extends Vars>(fragment: ${entryAny}): ${otherSelfT}`)
        //         fragmentTypes.push(entryAny)
        //     }
        // } else if (isInterfaceType(type)) {
        //     for (const entry of this.#expandTypes(type)) {
        //         const entryAny = this.#selectType(this.#selectName(entry), "any", "any", "any")
        //         result.push(`$on<SR, SV extends Vars>(fragment: ${entryAny}): ${otherSelfT}`)
        //         fragmentTypes.push(entryAny)
        //     }
        // }

        // if (fragmentTypes.length > 0) {
        //     result.push(`$on<SR, SV extends Vars>(fragments: ${fragmentTypes.join(" | ")}): ${selfT} | ${otherSelfT}`)
        // }

        return ["{", result.map(v => `${this.#indent}${this.#indent}${v}`).join("\n"), `${this.#indent}}`]
    }

    #buildFn(_type: GraphQLType): string[] {
        this.#import(RuntimeLib, "BuildReturn", true)

        // const typeName = this.#bareTypename(type)
        const result: string[] = ["/**", " * Build the typed document node", " */"]
        result.push(
            // `$build: B extends { input: infer BI, output: infer OF extends BuilderOutputFlags, operation: infer OP extends string } ? () => BuildReturn<OP, ResultByOutputFlags<${typeName}<R>, OF>, ToVars<BI, P, V>> : never`
            `$build(): any`
        )
        // result.push(`$build(...args: any[]): any`)

        return ["{", result.map(v => `${this.#indent}${this.#indent}${v}`).join("\n"), `${this.#indent}}`]
    }

    #__typenames(type: GraphQLType): string[] {
        return this.#expandTypes(type).map(v => this.#bareTypename(v))
    }

    #expandTypes(type: GraphQLType): GraphQLType[] {
        if (isUnionType(type)) {
            return Array.from(type.getTypes())
        } else if (isInterfaceType(type)) {
            const result: GraphQLType[] = []
            const impls = this.schema.getImplementations(type)
            for (const t of impls.interfaces) {
                result.push(...this.#expandTypes(t))
            }
            for (const t of impls.objects) {
                result.push(...this.#expandTypes(t))
            }
            return result
        } else if (isListType(type)) {
            return this.#expandTypes(type.ofType)
        } else if (isNonNullType(type)) {
            return this.#expandTypes(type.ofType)
        } else {
            return [type]
        }
    }

    #selectType(name: string, R: string, V: string, P: string, E: string = "never"): string {
        return `${name}<${R}, ${V}, ${P}, ${E}>`
    }

    #selectR(type: GraphQLType): string {
        const bare = this.#bareType(type)
        if (isUnionType(bare)) {
            const allScalars = bare.getTypes().every(t => bareIsScalar(t))
            return allScalars ? "[]" : `["__typename"]`
        } else if (isInterfaceType(bare)) {
            return `["__typename"]`
        } else {
            return `["__typename"]`
        }
    }

    #subSelectType(name: string, S: string, V: string, P: string, E: string = `"$build"`): string {
        return this.#selectType(name, S, V, P, E)
    }

    #argInfoType(args: ReadonlyArray<GraphQLArgument>): [string, string, boolean] {
        this.#import(RuntimeLib, "Variable", true)

        let allOptional = true
        const argKey = args
            .toSorted((a, b) => a.name.localeCompare(b.name))
            .map(v => `${v.name}:${v.type.toString()}`)
            .join(",")

        if (!(argKey in this.#argTypes)) {
            const argName = `Arguments${Object.values(this.#argTypes).length}`
            const result: string[] = [`export type ${argName} = {`]

            for (const { name, type, description, deprecationReason, defaultValue } of args) {
                let fieldType: string
                if (isNonNullType(type)) {
                    allOptional = false
                    fieldType = `: ${this.#typename(type.ofType, false)} | Variable`
                } else {
                    fieldType = `?: ${this.#typename(type, false)} | Variable | null`
                }

                result.push(
                    ...this.#comment(description, deprecationReason, defaultValue).map(v => `${this.#indent}${v}`),
                    `${this.#indent}${name}${fieldType}`
                )
            }
            result.push("}")
            this.#argTypes[argKey] = { name: argName, code: result.join("\n") }
        }

        const argName = this.#argTypes[argKey].name
        const argInfoName = `__${argName}`

        if (!(argKey in this.#argInfoVar)) {
            const vars = args.map(arg => `${arg.name}: ${this.#typeInfo(arg.type).name}`).join(", ")
            this.#argInfoVar[argKey] = { name: argInfoName, code: `{ ${vars} }` }
        }

        return [argName, argInfoName, allOptional]
    }

    #typeInfo(type: GraphQLType, realTypename?: string) {
        realTypename ??= type.toString()
        if (realTypename in this.#typeInfos) {
            return this.#typeInfos[realTypename]
        }
        const varName = `__TypeInfo${Object.keys(this.#typeInfos).length}`
        this.#typeInfos[realTypename] = { name: varName, code: "" }
        const code = this.#typeInfoCode(type, realTypename)
        this.#typeInfos[realTypename].code = code
        return this.#typeInfos[realTypename]
    }

    #typeInfoCode(type: GraphQLType, realTypename?: string): string {
        realTypename ??= type.toString()
        if (isListType(type)) {
            return `{ tn: ${JSON.stringify(realTypename)}, get items() { return ${this.#typeInfo(type.ofType).name} } }`
        } else if (isNonNullType(type)) {
            return this.#typeInfoCode(type.ofType, realTypename)
        } else if (isInputObjectType(type)) {
            const fields = Object.entries(type.getFields()).reduce<string[]>((acc, [name, field]) => {
                acc.push(`${name}: ${this.#typeInfo(field.type).name}`)
                return acc
            }, [])
            return `{ tn: ${JSON.stringify(realTypename)}, get fields() { return { ${fields.join(", ")} } } }`
        } else if (isEnumType(type)) {
            return `{ tn: ${JSON.stringify(realTypename)}, enum: ${this.#bareType(type).name} }`
        } else if (isScalarType(type)) {
            return `{ tn: ${JSON.stringify(realTypename)} }`
        } else if (isObjectType(type) || isInterfaceType(type)) {
            const fields = Object.entries(type.getFields()).reduce<string[]>((acc, [name, field]) => {
                acc.push(`${name}: ${this.#typeInfo(field.type).name}`)
                return acc
            }, [])
            return `{ tn: ${JSON.stringify(realTypename)}, get fields() { return { ${fields.join(", ")} } } }`
        } else if (isUnionType(type)) {
            const types = type.getTypes().map(t => this.#typeInfo(t).name)
            return `{ tn: ${JSON.stringify(realTypename)}, get union() { return [ ${types.join(", ")} ] } }`
        } else {
            return `{ tn: ${JSON.stringify(realTypename)} }`
        }
    }

    // #argumentsType(args: ReadonlyArray<GraphQLArgument>): [string, string, boolean] {
    //     let allOptional = true
    //     const argKey = args
    //         .toSorted((a, b) => a.name.localeCompare(b.name))
    //         .map(v => `${v.name}:${v.type.toString()}`)
    //         .join(",")

    //     if (!(argKey in this.#argumentTypes)) {
    //         const argName = `Arguments${Object.values(this.#argumentTypes).length}`
    //         this.#argumentTypes[argKey] = argName

    //         const result: string[] = [`export type ${argName} = {`]

    //         for (const { name, type, description, deprecationReason, defaultValue } of args) {
    //             let fieldType: string
    //             if (isNonNullType(type)) {
    //                 allOptional = false
    //                 fieldType = `: ${this.#typename(type.ofType, false)}`
    //             } else {
    //                 fieldType = `?: ${this.#typename(type, false)} | null`
    //             }

    //             result.push(
    //                 ...this.#comment(description, deprecationReason, defaultValue).map(v => `${this.#indent}${v}`),
    //                 `${this.#indent}${name}${fieldType}`
    //             )
    //         }

    //         result.push("}")

    //         this.#argumentInfos.push(result.join("\n"))
    //     }

    //     const argInfoName = this.#argsInfo(argKey, args)
    //     return [this.#argumentTypes[argKey], argInfoName, allOptional] as const
    // }

    // #argsInfo(key: string, type: ReadonlyArray<GraphQLArgument>): string {
    //     // const key = type.map(v => `${v.name}:${v.type.toString()}`).join(",")
    //     if (this.#argumentInfosName[key]) {
    //         return this.#argumentInfosName[key]
    //     }

    //     const selfName = `__ArgumentInfo${Object.keys(this.#argumentInfosName).length}`
    //     this.#argumentInfosName[key] = selfName
    //     const result = [`const ${selfName} = { `]

    //     for (const arg of type) {
    //         const name = this.#argInfo(arg.type)
    //         result.push(`${arg.name}: ${name},`)
    //     }

    //     result.push(" }")
    //     this.#argumentInfos.push(result.join(""))

    //     return selfName
    // }

    // #argInfo(type: GraphQLInputType): string {
    //     const typename = type.toString()
    //     if (this.#argumentInfosName[typename]) {
    //         return this.#argumentInfosName[typename]
    //     }
    //     const varName = `__ArgumentInfo${Object.keys(this.#argumentInfosName).length}`
    //     this.#argumentInfosName[typename] = varName

    //     this.#argumentInfos.push(`const ${varName} = ${this.#argInfoCode(type)}`)

    //     return varName
    // }

    // #argInfoCode(type: GraphQLInputType, realTypename?: string): string {
    //     realTypename ??= type.toString()
    //     if (isListType(type)) {
    //         return `{ tn: ${JSON.stringify(realTypename)}, items: () => ${this.#argInfo(type.ofType)} }`
    //     } else if (isNonNullType(type)) {
    //         return this.#argInfoCode(type.ofType, type.toString())
    //     } else if (isInputObjectType(type)) {
    //         const fields = Object.entries(type.getFields()).reduce<string[]>((acc, [name, field]) => {
    //             acc.push(`${name}: ${this.#argInfo(field.type)}`)
    //             return acc
    //         }, [])
    //         return `{ tn: ${JSON.stringify(realTypename)}, fields: () => ({ ${fields.join(", ")} }) }`
    //     } else {
    //         return `{ tn: ${JSON.stringify(realTypename)} }`
    //     }
    // }

    // export interface OrgUnitSelected<R extends SelectionDef> {
    //     id: IsSelected<R, "id", string>,
    //     alma: IsSelectedOn<R, "OrgActivity", "alma", string> | IsSelectedOn<R, "OrgInstitution", "alma", string>,
    //     children: IsSelected<R, "children", OrgUnitSelected<SelectionOf<R, "children">>,
    // }
    // #selectedType(type: GraphQLType): string {
    //     const bareType = this.#bareType(type)
    //     const name = `${this.#typename(bareType, false).replace(/[^a-zA-Z0-9_]/g, "_")}Selected`
    //     if (name in this.#selectedTypes) {
    //         return name
    //     }
    //     this.#selectedTypes[name] = []
    //     this.#selectedTypes[name] = this.#generateSelectedType(bareType, name)
    //     return name
    // }

    // #generateSelectedType(type: GraphQLType, name: string): string[] {
    //     this.#import(RuntimeLib, "SelectionDef", true)
    //     this.#import(RuntimeLib, "IsSelected", true)
    //     this.#import(RuntimeLib, "SubSelection", true)
    //     const bareType = this.#bareType(type)
    //     const result: string[] = []

    //     if (isScalarType(bareType) || isEnumType(bareType)) {
    //         result.push(`export type ${name}<_ extends SelectionDef = []> = ${this.#typename(bareType, false)}`)
    //     } else if (isObjectType(bareType) || isInterfaceType(bareType)) {
    //         const fields: string[] = []

    //         for (const { name: fieldName, type: fieldType } of Object.values(bareType.getFields())) {
    //             if (fieldName === "__typename") {
    //                 continue
    //             }

    //             const resultType = this.#selectedFieldType(fieldType, fieldName)

    //             fields.push(`${fieldName}: IsSelected<R, ${JSON.stringify(fieldName)}, ${resultType}>`)
    //             // } else {
    //             //     fields.push(
    //             //         `${fieldName}: IsSelected<R, ${JSON.stringify(fieldName)}, ${this.#selectedType(fieldType)}<SubSelection<R, ${JSON.stringify(fieldName)}>>>`
    //             //     )
    //             // }
    //         }

    //         result.push(
    //             `export interface ${name}<R extends SelectionDef> {`,
    //             `${this.#indent}__typename: IsSelected<R, "__typename", ${JSON.stringify(this.#bareTypename(type))}>,`,
    //             ...fields.map(v => `${this.#indent}${v},`),
    //             `}`
    //         )
    //     } else {
    //         // throw new Error(`Unsupported type for selected type: ${type.toString()}`)
    //     }

    //     return result
    // }

    // #selectedFieldType(type: GraphQLType, fieldName: string, nullable: boolean = true): string {
    //     if (isScalarType(type) || isEnumType(type)) {
    //         return `${this.#typename(type, false)}${nullable ? " | null" : ""}`
    //     } else if (isListType(type)) {
    //         return `Array<${this.#selectedFieldType(type.ofType, fieldName)}>${nullable ? " | null" : ""}`
    //     } else if (isNonNullType(type)) {
    //         return this.#selectedFieldType(type.ofType, fieldName, false)
    //     } else {
    //         const subSelect = `SubSelection<R, ${JSON.stringify(fieldName)}>`
    //         return `${this.#selectedType(type)}<${subSelect}>${nullable ? " | null" : ""}`
    //     }
    // }

    // #omit(t: string, field?: string): string {
    //     this.#import(RuntimeLib, "SelectedFields", true)
    //     return `Omit<${t}, SelectedFields<R>${field ? ` | "${field}"` : ""} | E>`
    //     // return `Omit<${t}, keyof R | "${field}" | "$build" | "$gql">`
    // }

    #comment(
        text?: string | null,
        deprecationReason?: string | null,
        defaultValue?: unknown,
        extra?: string[]
    ): string[] {
        const result: string[] = []

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

        return result.length === 2 ? [] : result
    }

    #import(_from: string, what: string, isType: boolean, alias?: string) {
        if (!(_from in this.#imports)) {
            this.#imports[_from] = {}
        }

        if (alias != null) {
            this.#imports[_from][`${what} as ${alias}`] = isType
        } else {
            this.#imports[_from][what] = isType
        }
    }
}

function bareIsScalar(type: GraphQLType) {
    if (isListType(type)) {
        return bareIsScalar(type.ofType)
    } else if (isNonNullType(type)) {
        return bareIsScalar(type.ofType)
    }
    return isScalarType(type) || isEnumType(type)
}

function maybeNullable(t: string, nullable: boolean) {
    return nullable ? `${t} | null` : t
}
