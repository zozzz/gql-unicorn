export const VARIABLE = Symbol("VARIABLE")
export const OPERATION = Symbol("OPERATION")
export const SELECTION = Symbol("SELECTION")
export const PATH = Symbol("PATH")
export const TARGET = Symbol("TARGET")
export const TYPENAME = Symbol("TYPENAME")

export function checker<T>(sym: symbol) {
    return (val: any): val is T => val != null && sym in val
}
