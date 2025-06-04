# GraphQL Unicorn [![npm version](https://badgen.net/npm/v/@gql-unicorn/runtime)](https://npm.im/@gql-unicorn/runtime) [![npm downloads](https://badgen.net/npm/dm/@gql-unicorn/runtime)](https://npm.im/@gql-unicorn/runtime)

Name of this package is a combination of `GraphQl` + `unicorn` (beacuse this is a 🦄 )

> [!IMPORTANT]
> Currently in development, this info is potentially wrong or incomplete.

> [!NOTE]
> Generates types from GraphQL schema and a very minimal runtime information from schema for builder.

## Install

```bash
npm install @gql-unicorn/cli --save-dev
npm install @gql-unicorn/runtime --save
```

## Usage

### Query

```typescript
import { Query, Type, Fragment, $ } from "genrated-pacakge-name"

const fragment = Fragment("fragmentName").News.author(q => q.id.name)

Query.articles()
    .id
    .name
    .tags({count: $.count}, q => q.id.name)
    .another_field
    .$on(fragment)
    .$on(Type.Blog.some_field)
    .$build()

Query.articles()
    .id
    .name
    .tags({count: $.count}, q => q.id.name)
    .author(q => q.id.name)
    .$build()
```

#### TODO Selected

```typescript
import { Query, $ } from "genrated-pacakge-name"

const GetUser = Query.users({id: $("userId")})
    .id
    .name
    .articles(q => q.id.name)
    .$build()

type SUser = Selected<User, ["id", "name", {"articles": ["id", "name"]}]>
// SUser = {id: string; name: string; articles: {id: string; name: string}[]}
```


### Mutation

```typescript
import { Mutation, $ } from "genrated-pacakge-name"

const CreateUser = Mutation.createUser({...}).id.name
```


### Type Check

```typescript
import { Type } from "genrated-pacakge-name"

if (Type.Worker.$is(user)) {
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
