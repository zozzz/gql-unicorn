/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { UnionToIntersection } from "utility-types"

import type { Input, Operation, Params, ParamsInput, ToVars } from "./operation"
import { checker, PATH, SELECTION, TARGET, TYPENAME } from "./symbols"
import type { GqlType } from "./type"

type SObject = Record<string, unknown>
type Vars = Record<string, any>

export type Select<
    T extends GqlType,
    P extends string[],
    S extends SObject,
    V extends Vars,
    E extends keyof SelectBase<any, V>
> = Omit<SelectBase<S, V>, E> & Selectable<T, P, S, V, E>
type Root = Record<"__typename", string>
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type SelectRoot<T extends GqlType> = Select<T, [], Root, {}, never>
type SubSelect<T extends GqlType, P extends string[], V extends Vars> = Select<T, P, Root, V, "$build">

// export type Selected<T extends GqlType, S extends Selection> = {}

interface SelectBase<S extends SObject, V extends Vars> {
    [TYPENAME]?: string
    [SELECTION]: Array<string | Select<any, any, any, any, any>>
    [PATH]: string[]
    $build: undefined extends ParamsInput<V>
        ? (vars?: ParamsInput<V>) => Selection<S, never>
        : (vars: ParamsInput<V>) => Selection<S, V>
}

type Selectable<
    T extends GqlType,
    P extends string[],
    S extends SObject,
    V extends Vars,
    E extends keyof SelectBase<any, V>
> = Omit<_Selectable<S, RemapKeys<T, P, S, V, E>>, "__typename">
type _Selectable<S extends SObject, R> = UnionToIntersection<
    {
        [K in keyof R]: K extends keyof S ? never : Record<K, R[K]>
    }[keyof R]
>

type RemapKeys<
    T extends GqlType,
    P extends string[],
    S extends SObject,
    V extends Vars,
    E extends keyof SelectBase<any, V>
> = {
    [K in keyof T]: K extends "__typename"
        ? never
        : T[K] extends Function
          ? never
          : K extends string
            ? T[K] extends Operation<infer I, infer O>
                ? O extends Array<infer OO>
                    ? OO extends GqlType
                        ? OperationSelect<T, P, S, V, E, I, OO, K, true>
                        : never
                    : O extends GqlType
                      ? OperationSelect<T, P, S, V, E, I, O, K, false>
                      : never
                : T[K] extends Array<infer I>
                  ? I extends GqlType
                      ? TypeSelect<T, P, S, V, E, I, K, true>
                      : never
                  : T[K] extends GqlType
                    ? TypeSelect<T, P, S, V, E, T[K], K, false>
                    : Select<T, P, S & Record<K, T[K]>, V, E>
            : never
}

export type TypeSelect<
    T extends GqlType,
    P extends string[],
    S extends SObject,
    V extends Vars,
    E extends keyof SelectBase<any, V>,
    I extends GqlType,
    K extends string,
    IsArray extends boolean
> = <TS extends SObject, TV extends Vars>(
    q: (q: SubSelect<I, [...P, K], V>) => Select<I, any, TS, TV, any>
) => Select<T, P, S & Record<K, IsArray extends true ? TS[] : TS>, V & TV, E>

export type OperationSelect<
    T extends GqlType,
    P extends string[],
    S extends SObject,
    V extends Vars,
    E extends keyof SelectBase<any, V>,
    I extends Input,
    O extends GqlType,
    K extends string,
    IsArray extends boolean
> = <TS extends SObject, TV extends Vars, A extends Params<I>>(
    params: A,
    q: (q: SubSelect<O, [...P, K], V>) => Select<O, any, TS, TV, any>
) => Select<T, P, S & Record<K, IsArray extends true ? TS[] : TS>, V & TV & ToVars<I, [...P, K], A>, E>

export const isSelect = checker<Select<any, any, any, any, any>>(SELECTION)

// TODO:. maybe fragment is same: Query.users()("id", Type.Manager("manager_field"))
export function select<T extends GqlType>(path: string[], typename?: string) {
    return new Proxy(new ProxyTarget(path, typename), ProxyHandler) as unknown as SelectRoot<T>
}

class ProxyTarget implements SelectBase<any, any> {
    [PATH]: string[];
    [TYPENAME]?: string;
    [SELECTION]: SelectBase<any, any>[typeof SELECTION] = []

    constructor(path: string[], typename?: string) {
        this[PATH] = path
        this[TYPENAME] = typename
    }

    $build(vars?: object) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return new Selection((this as unknown as any)[TARGET] as ProxyTarget, vars)
    }
}

export class Selection<S extends SObject, V extends Vars> {
    #s?: S
    #v?: V

    readonly #doc: ProxyTarget
    readonly #vars?: object
    constructor(doc: ProxyTarget, vars?: object) {
        this.#doc = doc
        this.#vars = vars
    }

    [Symbol.toPrimitive](hint: string) {
        if (hint !== "string") {
            return null
        }

        const fields = []
        for (const field of this.#doc[SELECTION]) {
            if (typeof field === "string") {
                fields.push(field)
            }
        }

        return `{${fields.join(",")}}`
    }
}

const ProxyHandler = {
    get: (target: ProxyTarget, key: string | symbol, receiver: any) => {
        console.log("get", target, key, receiver)
        if (key in target) {
            return target[key as keyof ProxyTarget]
        }

        if (key === TARGET) {
            return target
        }

        target[SELECTION].push(key)

        return receiver
    }
}
