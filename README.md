# Graphql Unicorn

Name of this package is a combination of `GraphQl` + `unicorn` (beacuse this is a 🦄 )

> [!IMPORTANT]
> Currently in development, this info is potentially wrong or incomplete.

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

Query.articles().id.name.tags({count: $.count}, q => q.id.name).another_field.$on(fragment).$on(Type.Blog.some_field)

Query.articles().id.name.tags({count: $.count}, q => q.id.name).author(q => q.id.name)
```

#### TODO Selected

```typescript
import { Query, $ } from "genrated-pacakge-name"

const GetUser = Query.users({id: $("userId")}).id.name.articles(q => q.id.name)
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

if (Type.Worker.is(user)) {
    // ...
}
```

#### Special Types

```typescript
import { Query, Type, TypeOf, $ } from "genrated-pacakge-name"

const GetUser = Query.users({id: $("userId")})("id", "name")
type User = TypeOf<typeof GetUser>
```

### Variables

```typescript
import { $, Query, UserFilter } from "genrated-pacakge-name"

const q = Query.users({ filter: $("filterVar"), offset: $("offsetVar"), count: $("countVar") }).id.name
type Variables = {filterVar: UserFilter, offsetVar: number, countVar: number}

// or simplified version (this is the default, so it can simplify more to: Query.users()...)
const q = Query.users($).id.name
type Variables = {filter: UserFilter, offset: number, count: number}

// or with shorthands
const q = Query.users({ filter: $("filterVar"), offset: $, count: $ }).id.name.
type Variables = {filterVar: UserFilter, offset: number, count: number}

const q = Query.users($).id.articles({count: $}, q => id.title)
type Variables = {filter: UserFilter, offset: number, count: number, articles__count: number}
```

## Compatibility

- [Apollo Client](https://www.apollographql.com/docs/react)

And maybe others that handle [TypedDocumentNode](https://the-guild.dev/graphql/codegen/plugins/typescript/typed-document-node)
