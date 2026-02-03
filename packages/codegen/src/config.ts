export interface UnicornConfig {
    scalars?: ScalarMap
    headers?: Record<string, string>
    /**
     * Enable generation of type information for runtime usage
     * @default true
     */
    typeinfo?: boolean
}

export type ScalarFromPackage = {
    import: string
    from: string
    alias?: string
}

export type ScalarAlias = string

export type ScalarMap = Record<string, ScalarFromPackage | ScalarAlias>
