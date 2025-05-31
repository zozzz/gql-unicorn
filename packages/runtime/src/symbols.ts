export const VARIABLE = Symbol("VARIABLE")
export const OPERATION = Symbol("OPERATION")
export const SELECTION = Symbol("SELECTION")
export const PATH = Symbol("PATH")
export const TARGET = Symbol("TARGET")
export const TYPENAME = Symbol("TYPENAME")
export const FRAGMENT = Symbol("FRAGMENT")
export const UNION = Symbol("UNION")
export const INTERFACE = Symbol("INTERFACE")
export const CONTEXT = Symbol("CONTEXT")

export function checker<T>(sym: symbol) {
    return (val: any): val is T => val != null && Object.prototype.hasOwnProperty.call(val, sym)
}

export type Is<K extends symbol, T> = T extends { [k in K]: any } ? true : false
