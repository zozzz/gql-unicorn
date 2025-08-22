export interface UnicornConfig {
    scalars?: ScalarMap
    headers?: Record<string, string>
}

export type ScalarFromPackage = {
    import: string
    from: string
    alias?: string
}

export type ScalarAlias = string

export type ScalarMap = Record<string, ScalarFromPackage | ScalarAlias>
