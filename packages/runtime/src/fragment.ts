// TODO: DELETE ALL
import { type Select } from "./select"
import { checker, FRAGMENT } from "./symbols"
import type { SimpleType } from "./type"

export type Fragment = Select<any, any, any, any> & { [FRAGMENT]: true }

export const isFragment = checker<Fragment>(FRAGMENT)

export function fragment<T extends SimpleType, N extends string>(name: N): Select<T, [N], {}, {}> {
    return null as unknown as any
}
