import type { Vars } from "./var"

type Result = Record<string, any>

interface SelectArticle<P extends string[], R extends Result, V extends Vars> {
    id: Omit<SelectArticle<P, R & Record<"id", string>, V>, keyof R | "id">
    title: Omit<SelectArticle<P, R & Record<"title", string>, V>, keyof R  | "title">
    tags: (q: (q: SelectTag<P, R, V>) => any) => Omit<SelectArticle<P, R & Record<"tags", string>, V>, keyof R  | "tags">
}

type Article<K> = SelectArticle<any, any, any>

interface SelectTag<P extends string[], R extends Result, V extends Vars> {
    id: Omit<SelectTag<C, R & Record<"id", string>, V>, keyof R | "id">
    tag: Omit<SelectTag<C, R & Record<"tag", string>, V>, keyof R  | "tag">
}

/**
 * ```ts
 * Query.articles(...).id.name.tags(...).$build()
 * Query.users().$on(Type.Worker.workplace.organizations({count: 1}, q => q.id.name)).$build()
 * ```
 */


const alma: SelectArticle<null, {}, {}>
const query = alma.id.title.tags(q => q.id.tag)

type ArticleXXX = TypeOf<typeof query>

function doSomething(article: Article<["id", "name", {tags: ["id"]}]>) {
    article.id
}

function doSomething2(article: ArticleXXX) {
    article.id
}

interface Selectable<P extends string[], R extends Result, V extends object> {}

type User = {
    __typename: "User"
    id: string
    creator: User
    someStat: number
    tags: Tag[]
}

interface Context<P, T, N> {}
type AnyContext = Context<any, any, any>

interface SelectUser<P extends string[], R extends Result, V extends object> extends Selectable<P, R, V> {
    id: AtomicField<User, "id", P, R, V>
    creator: TypeField<User, "creator", P, R, V>
    someStat: AtomicOperation<User, "someStat", {statName: string}, P, R, V>
    tags: TypeOperation<User, "tags", {count: number}, P, R, V>
}

type Tag = {
    __typename: "Tag"
    id: string
    tag: string
}

interface SelectTag<P extends string[], R extends Result, V extends object> extends Selectable<P, R, V> {
    id: AtomicField<this, "id", string>
    tag: AtomicField<this, "tag", string>
}

interface Worker {}

type AtomicField<C, N extends string, P extends string[], R extends Result, V extends object> = unknown
type TypeField<C, N extends string, P extends string[], R extends Result, V extends object> = unknown
type AtomicOperation<C, N extends string, Input, P extends string[], R extends Result, V extends object> = unknown
type TypeOperation<C, N extends string, Input, P extends string[], R extends Result, V extends object> = unknown


type UserQ = SelectUser<[], {}, {}>
const userq: UserQ = null as any
userq.
