const VAR_TOKEN = Symbol("VAR_TOKEN")

export type Var = {
    [VAR_TOKEN]: true
}

export function isVar(value: any): value is Var {
    return VAR_TOKEN in value
}

/**
 * @example
 * ```typescript
 * const GetUser = Query.users({id: $("userId")}).select("id", "name", ...)
 * GetUser({userId: 1})
 * ```
 */
export function $(name: string) {

}
