const SELECT_TOKEN = Symbol("SELECT_TOKEN")

export type Select = {
    [SELECT_TOKEN]: true
}

export function isSelect(value: any): value is Select {
    return SELECT_TOKEN in value
}

// TODO:. maybe fragment is same: Query.users()("id", Type.Manager("manager_field"))
export function select<T>(builder: SelectBuilder<T>) {
    return new Proxy(builder, SelectProxy)
}

const SelectProxy = {}

export type SelectBuilder<T> = {}

export function builder<T>() {
    const builder = function () { }
    return builder as unknown as SelectBuilder<T>
}
