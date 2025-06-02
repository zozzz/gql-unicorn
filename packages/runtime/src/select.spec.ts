import { $, Fragment, type Node, Query } from "../../codegen/tests/__generated__/runtime"
import type { Interface } from "./type"

type ChildTypes<T> = T extends Interface<infer b, infer C> ? ChildTypes<C> : T

type Child = ChildTypes<Node>

const UserFragmanet = Fragment.User.id.name.articles({ count: $ }, q => q.id)
const ArticleFragment = Fragment.Article.id.title
const x = Query.nodes.$on(UserFragmanet).$on(ArticleFragment)
type XXXX = typeof x extends { $build: infer X } ? X : never
