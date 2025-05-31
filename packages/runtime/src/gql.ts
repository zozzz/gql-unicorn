import { type Operation } from "./operation"

// q = Operation |
export function toTypedDocument(q: any, v: any) {}

/**
 * ```typescript
 * // single
 * gql(Mut.saveUser($, q => q.id), {...userData})
 * // multiple
 * gql([
 *   gql(Mut.saveUser($, q => q.id), {...userData}),
 *   gql(Mut.saveUser($, q => q.id), {...userData}),
 * ])
 * ```
 */
export function gql<T extends Operation<any, infer V, boolean>>(q: T, v: V) {}
