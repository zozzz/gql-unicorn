import { checker, VARIABLE } from "./symbols"

// export type Variable<N extends string> = VarRef<"$"> | VarRef<N>

export interface Variable<N extends string = string> {
    readonly [VARIABLE]: N
}

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
