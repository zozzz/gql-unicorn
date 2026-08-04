import { checker, VARIABLE } from "./symbols"

// export type Variable<N extends string> = VarRef<"$"> | VarRef<N>

export interface Variable<N extends string = string> {
    readonly [VARIABLE]: N
}

export type StripVariable<T> = T extends infer U ? (U extends Variable ? never : U) : never

// export type VarRef<N> = { [VARIABLE]: N }

export const isVariable = checker<Variable>(VARIABLE)

export function variableName(obj: Variable): string | undefined {
    return obj[VARIABLE]
}

// TODO: implement `$.varName` syntax, but currently is not possible i think
// the problem is i can't retrive variable name in this way
// so i need a type like this: Variable<VTYPE, "varName">
// with function call is easy: $("varName"), but is 3 bytes longer, and uglier i think
/**
 * Variable alias
 *
 * @example
 * ```typescript
 * Query.user({id: $("userId")})
 * ```
 */
export const $ = <N extends string>(name: N) => ({ [VARIABLE]: name }) as Variable<N>

export const $$ = { [VARIABLE]: "$" } as const

export type Vars = Record<string, any>

export type MergeVars<V1, V2> = [keyof V2] extends [never] ? V1 : [keyof V1] extends [never] ? V2 : V1 & V2
