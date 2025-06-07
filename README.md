# GraphQL Unicorn [![npm version](https://badgen.net/npm/v/@gql-unicorn/runtime)](https://npm.im/@gql-unicorn/runtime) [![npm downloads](https://badgen.net/npm/dm/@gql-unicorn/runtime)](https://npm.im/@gql-unicorn/runtime)

Generates types from GraphQL schema and a very minimal tree shakeable runtime information from schema for builder.

Name of this package is a combination of `GraphQl` + `unicorn` (beacuse this is a 🦄 )

> [!IMPORTANT]
> Currently in development, this info is potentially wrong or incomplete.

## Install

```bash
npm install @gql-unicorn/cli --save-dev
npm install @gql-unicorn/runtime --save
```

## Usage

> [!IMPORTANT]
> Don't rebind any function, this lib uses `Proxy` and if you rebind a function it will break.

### Query

```typescript
import { queryArticles, Blog, News $ } from "genrated-pacakge-name"

const fragment = News.$fragment("fragmentName", q => q.author(q => q.id.name))

const articlesQuery = queryArticles({filter: ...}, q => q.id
    .name
    .tags({count: $("count")}, q => q.id.name)
    .another_field
    .$on(fragment)
    .$on(Blog(q => q.some_field.author(q => q.id.name)))
)

async function doSomething() {
    const result = await someLibThatExecGql(articlesQuery)
    for (const article of result) {
        doSomethingWithArticle(article)
    }
}

function doSomethingWithArticle(article: TypeOf<typeof articlesQuery>[number]) {}

function doSomethingWithFragment(fragment: TypeOf<typeof fragment>) {}

```

#### Selected type

```typescript
import { queryUsers, $, type TypeOf } from "genrated-pacakge-name"

const GetUser = queryUsers({id: $("userId")}, q => q.id
    .name
    .articles(q => q.id.name)
)

type SUser = Selected<User, ["id", "name", { articles: ["id", "name"] }]>
type SUserInfer = TypeOf<typeof GetUser> // === SUser

// TODO: currently not working
type SUserWithAlias = Selected<User, [{ id: "userId" }, "name", { articles: ["id", "name"] }]>
```


### Mutation

```typescript
import { mutationCreateUser } from "genrated-pacakge-name"

const CreateUser = mutationCreateUser({...}).id.name
```


### Type Check

```typescript
import { Worker } from "genrated-pacakge-name"

if (Worker.$is(user)) {
    // ...
}
```

#### Special Types

```typescript
import { Query, Type, TypeOf, VarOf, $ } from "genrated-pacakge-name"

const GetUser = Query.users({id: $("userId")})("id", "name")
type User = TypeOf<typeof GetUser>
type UserVars = VarOf<typeof GetUser>
```

### Variables

```typescript
import { $, Query, UserFilter } from "genrated-pacakge-name"

const q = Query.users({ filter: $("filterVar"), offset: $("offsetVar"), count: $("countVar") })
    .id
    .name
    .$build()
type Variables = {filterVar: UserFilter, offsetVar: number, countVar: number}

// or simplified version (this is the default, so it can simplify more to: Query.users()...)
const q = Query.users($)
    .id
    .name
    .$build()
type Variables = {filter: UserFilter, offset: number, count: number}

// or with shorthands
const q = Query.users({ filter: $("filterVar"), offset: $, count: $ })
    .id
    .name
    .$build()
type Variables = {filterVar: UserFilter, offset: number, count: number}

const q = Query.users($)
    .id
    .articles({count: $}, q => id.title)
    .$build()
type Variables = {filter: UserFilter, offset: number, count: number, articles__count: number}
```

## Compatibility

* Compatible with every packages that ghandle [TypedDocumentNode](https://the-guild.dev/graphql/codegen/plugins/typescript/typed-document-node)

    To create `TypedDocumentNode` use `$build` function

* Compatible with every packages that handle GraphQL queries in string format

    To create GraphQL string use `$gql` function

## TODO

* nested variables:
    ```ts
    queryUsers({filter: { id: $("userId"), name: $ /*filter__id*/ }})
    ```
    ```gql
    query (userId: ID!, $filter__id: String) {
        users(filter: { id: $userId, name: $filter__id })
    }
    ```

* find a way to replace `$$` with `$`, or something more intuitive than `$$`
* find a way to use `$.varName` instead `$("varName")`
* redesign select result, to not building an object on the fly, instead use `Pick<User, "__typename", "id", "name">`
  when subselect is happened: `Pick<User, "__typename", "id", "name"> & Record<"articles", Array<Pick<Article, "__typename", "id", "title">>>`
* handle aliases: `queryUsers(q => q.id("userId").parent("userParent", q => q.id))`
