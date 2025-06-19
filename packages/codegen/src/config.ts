export interface UnicornConfig {
    scalars?: ScalarMap
    headers?: Record<string, string>
}

export type ScalarFromPackage = {
    import: string
    alias?: string
    package: string
}

export type ScalarAlias = string

export type ScalarMap = Record<string, ScalarFromPackage | ScalarAlias>
