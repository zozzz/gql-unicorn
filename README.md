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
import { Query, Type, $ } from "genrated-pacakge-name"

const fragment = Type.News.author(q => q.id.name)
const on = Type.Blog.some_field

Query.articles().id.name.tags({count: $.count}, q => q.id.name).another_field[fragment][on]

Query.articles().id.name.tags({count: $.count}, q => q.id.name).author(q => q.id.name)
```

#### TODO Selected

```typescript
import { Query, $ } from "genrated-pacakge-name"

const GetUser = Query.users({id: $("userId")}).id.name.articles(q => q.id.name)
type SUser = Selected<User, ["id", "name", {"articles": ["id", "name"]}]>
// SUser = {id: string; name: string; articles: {id: string; name: string}[]}
```

#### Nested args

```typescript
import { Query, $ } from "genrated-pacakge-name"

const GetUser = Query.users({paging: {offset: $("offset"), limit: $("limit")}}).id.name
const xxx = GetUser.$build({offset: 0, limit: 10})

// alternatives
const GetUser = Query.users({paging: $}).id.name
const xxx = GetUser.$build({paging: {offset: 0, limit: 10}})

// shothand 1
const GetUser = Query.users($).id.name
const xxx = GetUser.$build({paging: {offset: 0, limit: 10}})

// shothand 2
const GetUser = Query.users().id.name
const xxx = GetUser.$build({paging: {offset: 0, limit: 10}})

```


### Mutation

```typescript
import { Mutation, $ } from "genrated-pacakge-name"

const CreateUser = Mutation.createUser()("id", "name")
const xxx = CreateUser({ /* ... */ })
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
import { $, Query } from "genrated-pacakge-name"

const q = Query.users({ filter: $("filter"), offset: $("offset"), count: $("count") }).id.name.$build({filter: { name: "..." }, offset: 0, count: 10})
// or simplified version (this is the default, so it can simplify more to: Query.users()...)
const q = Query.users($).id.name.$build({filter: { name: "..." }, offset: 0, count: 10})
// or with shorthands
const q = Query.users({ filter: $, offset: $, count: $ }).id.name.$build({filter: { name: "..." }, offset: 0, count: 10})
// works with nested args too
const q = Query.users({ filter: { is_active: true, name: $ }, offset: $, count: $ }).id.name.$build({filter: { name: "..." }, offset: 0, count: 10})
```

## Compatibility

- [Apollo Client](https://www.apollographql.com/docs/react)

And maybe others that handle [TypedDocumentNode](https://the-guild.dev/graphql/codegen/plugins/typescript/typed-document-node)
