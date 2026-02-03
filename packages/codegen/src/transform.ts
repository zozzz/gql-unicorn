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
    type GraphQLNonNull,
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

const SelectTypeArgs = `R extends SelectionDef, V extends Vars, P extends string[], B extends AsBuilder = never, E extends string = never`

class Transformer {
    readonly #scalarMap: ScalarMap
    readonly #typeMap: Record<string, string> = {}
    readonly #parts: string[] = []
    readonly #indent = "    "
    readonly #imports: Record<string, Record<string, boolean>> = {}

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
        const builders: string[] = [`type AsBuilder = { input: Input; output: any; operation: string }`]

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
        this.#import(RuntimeLib, "Input", true)
        this.#import(RuntimeLib, "TypeInfo", true)

        const tiFowardDefs: string[] = []
        const tiDefs: string[] = []
        const argTypes: string[] = []
        const tiTypes: string[] = []

        for (const { name, code } of Object.values(this.#typeInfos)) {
            tiFowardDefs.push(`const ${name} = {} as TypeInfo`)
            tiDefs.push(`assign(${name}, ${code})`)
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

        const typeInfos =
            argTypes.length > 0 || tiTypes.length > 0
                ? [...tiFowardDefs, `const assign = Object.assign`, ...tiDefs, ...argTypes, ...tiTypes]
                : []

        this.#parts.unshift(...Banner, ...this.#generateImports(), ...this.#enums, ...typeInfos)
        return [
            ...this.#parts,
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

    #typename(type: GraphQLType, nullable: boolean = true): string {
        if (isListType(type)) {
            return maybeNullable(`Array<${this.#typename(type.ofType)}>`, nullable)
        } else if (isNonNullType(type)) {
            return this.#typenameOfNonNull(type)
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

    #typenameOfNonNull(type: GraphQLNonNull<GraphQLType>): string {
        return this.#typename(type.ofType, false)
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

    #generateObject(type: GraphQLObjectType, name: string): string[] {
        if (this.config.typeinfo) {
            this.#typeInfoVar[type.name] = this.#typeInfo(type).name
        }

        return [
            ...this.#comment(type.description),
            `export type ${name} = {`,
            `${this.#indent}__typename: ${JSON.stringify(this.#bareType(type).name)}`,
            ...this.#generateObjectFields(type, type.getFields()),
            `}`,
            ...this.#generateTypeBuilder(type)
        ].filter(Boolean)
    }

    #generateObjectFields(context: GraphQLType, fields: GraphQLFieldMap<any, any>): string[] {
        const result: string[] = []
        for (const [name, { type, description, deprecationReason }] of Object.entries(fields)) {
            result.push(
                ...this.#generateField(context, name, type, description, deprecationReason, null).map(
                    v => `${this.#indent}${v}`
                )
            )
        }
        return result
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
        return [
            ...this.#comment(type.description),
            `export type ${name} = {`,
            ...this.#generateInputFields(type.getFields()),
            `}`
        ]
    }

    #generateInputFields(fields: GraphQLInputFieldMap): string[] {
        const result: string[] = []
        for (const [name, { type, description, deprecationReason, defaultValue }] of Object.entries(fields)) {
            if (name === "__typename") {
                continue
            }
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
        const ft = isNonNullType(type)
            ? `: ${this.#typename(type.ofType, false)}`
            : `?: ${this.#typename(type, false)} | null`
        result.push(`${name}${ft}`)
        return result
    }

    #generateInterface(type: GraphQLInterfaceType, name: string): string[] {
        const types = this.#__typenames(type)
        const comment = this.#comment(type.description)
        return [...comment, `export type ${name} = ${types.join(" | ")}`, ...this.#generateTypeBuilder(type)]
    }

    #generateUnion(type: GraphQLUnionType, name: string): string[] {
        const types = this.#__typenames(type)

        return [
            ...this.#comment(type.description),
            `export type ${name} = ${types.join(" | ")}`,
            ...this.#generateTypeBuilder(type)
        ]
    }

    #rootBuilder(context: GraphQLObjectType, prefix: string, builder: string): string[] {
        const result: string[] = []

        for (const { name, args, type, description, deprecationReason } of Object.values(context.getFields())) {
            const varName = prefix && prefix.length > 0 ? `${prefix}${pascalCase(name)}` : camelCase(name)
            let argType: string = "undefined"
            let argInfo: string | undefined
            let argOptional: boolean
            let typeValue: string = "any"
            let builderT: string = "any"
            let builderFn: string | undefined

            this.#import(RuntimeLib, "BuildReturn", true)

            if (args.length > 0) {
                ;[argType, argInfo, argOptional] = this.#argInfoType(args)
                if (bareIsScalar(type)) {
                    typeValue = this.#typename(type)
                    const args = `ArgsParam<${argType}, AA>`
                    const optArgs = argOptional ? " | [string] | []" : ""
                    // <AA extends Arguments<A>>(...args: [string, AA] | [AA]): BuildReturn<T, {} & ToVars<A, [], AA>>
                    builderT =
                        `<AA extends Arguments<${argType}>>(...args: [string, ${args}] | [${args}]${optArgs}) `
                        + `=> BuildReturn<"${name}", ${typeValue}, never, {} & ToVars<${argType}, [], AA>>`
                } else {
                    this.#import(RuntimeLib, "SelectionDef", true)

                    const R = this.#selectR(type)
                    typeValue = this.#subSelectType(this.#selectName(type), R, "{}", "[]")
                    argInfo = `[${argInfo}, ${this.#bareTypename(type)}]`
                    const sfn = `(select: ${typeValue}) => Selection<any, SS, SV>`
                    const args = `ArgsParam<${argType}, AA>`
                    const optArgs = argOptional ? ` | [string, ${sfn}] | [${sfn}]` : ""

                    builderT =
                        `<SS extends SelectionDef, SV extends Vars, AA extends Arguments<${argType}>>`
                        + `(...args: [string, ${args}, ${sfn}] | [${args}, ${sfn}]${optArgs}) `
                        + `=> BuildReturn<"${name}", ${this.#typename(type)}, SS, SV & ToVars<${argType}, [], AA>>`

                    const builderFnRet = this.#selectType(
                        this.#selectName(type),
                        R,
                        "AA",
                        "[]",
                        `{ input: ${argType}, output: ${this.#typename(type)}, operation: "${name}" }`
                    )
                    const builderFnOptArgs = argOptional ? ` | [string] | []` : ""
                    builderFn = `<AA extends Arguments<${argType}>>(...args: [string, ${args}] | [${args}]${builderFnOptArgs}) => ${builderFnRet}`
                }
            } else {
                if (bareIsScalar(type)) {
                    typeValue = this.#typename(type)

                    builderT = `(name?: string) => BuildReturn<"${name}", ${typeValue}, never, never>`
                } else {
                    this.#import(RuntimeLib, "SelectionDef", true)

                    // const R = this.#rootBuilderResult(type)
                    const R = this.#selectR(type)
                    typeValue = this.#subSelectType(this.#selectName(type), R, "{}", "[]")
                    argInfo = this.#bareTypename(type)
                    const sfn = `(select: ${typeValue}) => Selection<any, SS, SV>`

                    builderT =
                        `<SS extends SelectionDef, SV extends Vars, >`
                        + `(...args: [string, ${sfn}] | [${sfn}])`
                        + `=> BuildReturn<"${name}", ${this.#typename(type)}, SS, SV>`
                }
            }

            const argInfoRes = argInfo ? `, ${argInfo}` : ""

            const _builderFn = `{ builder: ${builderFn} }`
            result.push(
                ...this.#comment(description, deprecationReason),
                `export const ${varName} = ${builder}("${name}"${argInfoRes}) as (${builderT})${builderFn ? ` & ${_builderFn}` : ""}`
                // `export const ${varName} = ${builder}("${name}"${argInfoRes}) as (${builderT})`
            )
        }

        return result
    }

    #select(type: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType): string[] {
        const result: string[] = []

        this.#import(RuntimeLib, "Vars", true)
        this.#import(RuntimeLib, "Selection", true)

        const fields = isUnionType(type) ? [] : this.#selectFields(type, type.getFields())

        fields.push(...this.#onFns(type))
        fields.push(...this.#buildFn())

        // const R = isObjectType(type) ? `[...R, "__typename"]` : "R"
        result.push(
            ...this.#comment(type.description),
            `export interface ${this.#selectName(type)}<${SelectTypeArgs}> `
                + `extends Selection<${this.#bareTypename(type)}, R, V> {`,
            ...fields.map(v => `${this.#indent}${v}`),
            `}`
        )

        return result
    }

    #selectFields(context: GraphQLType, fields: GraphQLFieldMap<any, any>): string[] {
        const result: string[] = []
        for (const { name, args, type, description, deprecationReason } of Object.values(fields)) {
            result.push(
                ...this.#comment(description, deprecationReason, undefined),
                ...this.#selectField(context, name, args, type)
            )
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
        if (args.length > 0) {
            this.#import(RuntimeLib, "Arguments", true)
            this.#import(RuntimeLib, "ArgsParam", true)
            this.#import(RuntimeLib, "ToVars", true)
            const [argumentType, _, argOptional] = this.#argInfoType(args)
            const VP = `[...P, ${JSON.stringify(name)}]`

            if (bareIsScalar(type)) {
                const R = `ExtendSelection<R, ${JSON.stringify(name)}>`
                const V = `V & ToVars<${argumentType}, ${VP}, A>`
                const returnType = this.#omit(this.#selectType(contextName, R, V, "P", "B", "E"), name)
                const args = `ArgsParam<${argumentType}, A>`
                const qm = argOptional ? "?" : ""
                result.push(`${name}<A extends Arguments<${argumentType}>>(args${qm}: ${args}): ${returnType}`)
            } else {
                const R = `ExtendSelection<R, Record<${JSON.stringify(name)}, SR>>`
                const V = `V & SV & ToVars<${argumentType}, ${VP}, A>`
                const returnType = this.#omit(this.#selectType(contextName, R, V, "P", "B", "E"), name)
                const subs = this.#subSelectType(this.#selectName(type), `["__typename"]`, "{}", `[...P, "${name}"]`)
                const subf = `(select: ${subs}) => Selection<ST, SR, SV>`
                const args = `ArgsParam<${argumentType}, A>`
                const optArgs = argOptional ? ` | [${subf}]` : ""
                result.push(
                    `${name}<A extends Arguments<${argumentType}>, ST, SR extends SelectionDef, SV extends Vars>(...args: [${args}, ${subf}]${optArgs}): ${returnType}`
                )
            }
        } else {
            if (bareIsScalar(type)) {
                const R = `ExtendSelection<R, ${JSON.stringify(name)}>`
                const V = `V`
                const returnType = this.#omit(this.#selectType(contextName, R, V, "P", "B", "E"), name)
                result.push(`${name}: ${returnType}`)
            } else {
                const R = `ExtendSelection<R, Record<${JSON.stringify(name)}, SR>>`
                const V = `V & SV`
                const returnType = this.#omit(this.#selectType(contextName, R, V, "P", "B", "E"), name)
                const subs = this.#subSelectType(this.#selectName(type), `["__typename"]`, "{}", `[...P, "${name}"]`)
                const subf = `(select: ${subs}) => Selection<ST, SR, SV>`
                result.push(`${name}<ST, SR extends SelectionDef, SV extends Vars>(select: ${subf}): ${returnType}`)
            }
        }
        return result
    }

    #onFns(type: GraphQLType): string[] {
        this.#import(RuntimeLib, "MergeSelection", true)
        // this.#import(RuntimeLib, "OnFnResult", true)
        const selfT = this.#omit(
            this.#selectType(
                this.#selectName(type),
                `MergeSelection<R, ExtendSelection<SR, "__typename">>`,
                "V & SV",
                "P",
                "B",
                "E"
            )
        )
        const onSelf = `$on<SR extends SelectionDef, SV extends Vars>(fragment: Selection<${this.#bareTypename(type)}, SR, SV>): ${selfT}`
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

        return result
    }

    #buildFn(): string[] {
        this.#import(RuntimeLib, "BuildReturn", true)
        const result: string[] = ["/**", " * Build the typed document node", " */"]
        result.push(
            `$build: B extends { input: infer BI, output: infer BO, operation: infer OP extends string } ? () => BuildReturn<OP, BO, R, ToVars<BI, P, V>> : never`
        )

        return result
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

    #selectType(name: string, R: string, V: string, P: string, B: string = "never", E: string = "never"): string {
        return `${name}<${R}, ${V}, ${P}, ${B}, ${E}>`
    }

    #selectR(type: GraphQLType): string {
        const bare = this.#bareType(type)
        if (isUnionType(bare)) {
            return "[]"
        } else if (isInterfaceType(bare)) {
            return "[]"
        } else {
            return `["__typename"]`
        }
    }

    #subSelectType(name: string, R: string, V: string, P: string): string {
        return this.#selectType(name, R, V, P, "never", `"$build"`)
    }

    #argInfoType(args: ReadonlyArray<GraphQLArgument>): [string, string, boolean] {
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
                    fieldType = `: ${this.#typename(type.ofType, false)}`
                } else {
                    fieldType = `?: ${this.#typename(type, false)} | null`
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
            return `{ tn: ${JSON.stringify(realTypename)}, items: ${this.#typeInfo(type.ofType).name} }`
        } else if (isNonNullType(type)) {
            return this.#typeInfoCode(type.ofType, realTypename)
        } else if (isInputObjectType(type)) {
            const fields = Object.entries(type.getFields()).reduce<string[]>((acc, [name, field]) => {
                acc.push(`${name}: ${this.#typeInfo(field.type).name}`)
                return acc
            }, [])
            return `{ tn: ${JSON.stringify(realTypename)}, fields: { ${fields.join(", ")} } }`
        } else if (isEnumType(type)) {
            return `{ tn: ${JSON.stringify(realTypename)}, enum: ${this.#bareType(type).name} }`
        } else if (isScalarType(type)) {
            return `{ tn: ${JSON.stringify(realTypename)} }`
        } else if (isObjectType(type) || isInterfaceType(type)) {
            const fields = Object.entries(type.getFields()).reduce<string[]>((acc, [name, field]) => {
                acc.push(`${name}: ${this.#typeInfo(field.type).name}`)
                return acc
            }, [])
            return `{ tn: ${JSON.stringify(realTypename)}, fields: { ${fields.join(", ")} } }`
        } else if (isUnionType(type)) {
            const types = type.getTypes().map(t => this.#typeInfo(t).name)
            return `{ tn: ${JSON.stringify(realTypename)}, union: [ ${types.join(", ")} ] }`
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

    #omit(t: string, field?: string): string {
        this.#import(RuntimeLib, "SelectedFields", true)
        return `Omit<${t}, SelectedFields<R>${field ? ` | "${field}"` : ""} | E>`
        // return `Omit<${t}, keyof R | "${field}" | "$build" | "$gql">`
    }

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
