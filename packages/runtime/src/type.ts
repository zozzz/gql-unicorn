import { select, type Select } from "./select"

// Better name
export type GqlType = Record<string, unknown> & { __typename: string }
export type TypeMap = Record<string, GqlType>

export type TypeMapWithExtra<T extends TypeMap> = {
    [K in keyof T]: Select<T[K], []> & TypeExtra<T[K]>
}

export interface TypeExtra<T> {
    is<V, X = T extends V ? V : never>(val: V): val is V & X
}

export function typeFactory<T extends TypeMap>() {
    return new Proxy({}, TypeProxy) as TypeMapWithExtra<T>
}

const TypeProxy = {
    get(target: any, prop: string, _receiver: any) {
        const s = select(prop) as Select<any, any> & TypeExtra<any>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        s.is = ((val: any) => val != null && val.__typename === prop) as any
        return s
    }
}

// export function builder<T>() {
//     return {}
// }
