import { checker, VARIABLE } from "./symbols"

// export type Variable<T, N extends string | undefined> = {
//     [VAR_NAME]: N
// } & (N extends undefined ? T & { [K in string]: Variable<T, K> } : T & Variable<T, N>)

export type Variable<N extends string | undefined> = N extends undefined
    ? (<K extends string>(k: K) => Variable<K>) & { [VARIABLE]: undefined }
    : { [VARIABLE]: N }

export const isVariable = checker<Variable<any>>(VARIABLE)

// export type Var<N extends string, T> = T & {
//     [VAR_NAME]: N
// }

// export const isVar = checker<Var<any, any>>(VAR_NAME)
// export const isVarToken = checker<VarToken>(VAR_TOKEN)

// TODO: implement `$.varName` syntax, but currently is not possible i think
// the problem is i can't retrive variable name in this way
// so i need a type like this: Variable<VTYPE, "varName">
// with function call is easy: $("varName"), but is 3 bytes longer, and uglier i think
export const $ = ((name: string) => ({ [VARIABLE]: name })) as Variable<undefined>
$[VARIABLE] = undefined
