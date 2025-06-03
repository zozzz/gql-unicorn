export interface UnicornConfig {
    scalars?: ScalarMap
}

export type ScalarFromPackage = {
    import: string
    alias?: string
    package: string
}

export type ScalarAlias = string

export type ScalarMap = Record<string, ScalarFromPackage | ScalarAlias>
