export class CodegenError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "CodegenError"
    }
}

export class FetchError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "FetchError"
    }
}
