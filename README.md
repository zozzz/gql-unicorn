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

const articlesQuery = queryArticles({filter: { title "..." }}, q => q.id
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

#### Builder

```typescript
import { queryUsers } from "genrated-pacakge-name"

const GetUserBuilder = queryUsers.builder().id

const GetUsersWithName = GetUserBuilder.name.$build()
const PFragment = Pagination.fragment(q => q.offset.limit)
const GetUsersWithPganination = GetUserBuilder.$on(PFragment).$build()
```

#### Selected type

```typescript
import { queryUsers, $, type TypeOf, type Selected } from "genrated-pacakge-name"

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
import { createUser } from "genrated-pacakge-name"

const CreateUser = createUser({ name: "Some User Name" }, q => q.id.name)
```


### Type Check

```typescript
import { Worker } from "genrated-pacakge-name"

if (Worker.is(user)) {
    // only usable fields is selected worker fields
}
```

#### Special Types

```typescript
import { queryUsers, type TypeOf,  type VarOf, $ } from "genrated-pacakge-name"

const GetUser = queryUsers({id: $("userId")}, q => q.id.name)
type User = TypeOf<typeof GetUser> // Selected<User, ["id", "name"]>
type UserVars = VarOf<typeof GetUser> // { userId: string }
```

### Variables

```typescript
import { $, $$, queryUsers, UserFilter } from "genrated-pacakge-name"

const q = queryUsers(
    { filter: $("filterVar"), offset: $("offsetVar"), count: $("countVar") }
    q => q.id.name
)
type _User = TypeOf<typeof q> // Selected<User, ["id", "name"]>
type _UserVars = VarOf<typeof q> // {filterVar: string, offsetVar: number, countVar: number}

// or simplified version, $$ extends to something similar:
// { filter: $("filter"), offset: $("offset"), count: $("count") }
const q = queryUsers($$, q => q.id.name)

// or with shorthands
const q = queryUsers(
    { filter: $("filterVar"), offset: $$, count: $$ },
    q => q.id.name
)
type _UserVars = VarOf<typeof q> // {filterVar: string, offset: number, count: number}

const q = queryUsers(
    $$,
    q => q.id.articles({ count: $$ }, q => q.id.title)
)
// { filter: $("filter"), offset: $("offset"), count: $("count"), articles__count: $("articles__count") }
type _UserVars = VarOf<typeof q>
```

## Compatibility

* Compatible with every packages that ghandle [TypedDocumentNode](https://the-guild.dev/graphql/codegen/plugins/typescript/typed-document-node)

    To create `TypedDocumentNode` use `$build` function

* Compatible with every packages that handle GraphQL queries in string format

    To create GraphQL string use `$gql` function

## TODO

* find a way to replace `$$` with `$`, or something more intuitive than `$$`
* find a way to use `$.varName` instead `$("varName")`
* handle aliases: `queryUsers(q => q.id("userId").attr("name", { name: "name" }, q => q.value).attr("age", { name: "age" }, q => q.value))`
