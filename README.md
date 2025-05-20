# Graphql TypeScript Builder

## Install

```bash
npm install @gqltb/cli --save-dev
npm install @gqltb/runtime --save
```

## Usage

### Query

```typescript
import { Query, Type, $ } from "genrated-pacakge-name"

const GetUser = Query.users({id: $("userId")})("id", "name")
const xxx = GetUser({ userId: "..." })
const yyy = GetUser("extra_field")({ userId: "..." })

const UserWithWorkers = Query.users({id: $("userId")})("id", Type.Worker("worker_field"))

const ArticleWithTags = Query.articles()("id", Type.Article.tags({count: 10}))
```

#### Nested args

```typescript
import { Query, $ } from "genrated-pacakge-name"

const GetUser = Query.users({paging: {offset: $("offset"), limit: $("limit")}})("id", "name")
const xxx = GetUser({offset: 0, limit: 10})
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

## Compatibility

- [Apollo Client](https://www.apollographql.com/docs/react)

And maybe others that handle [TypedDocumentNode](https://the-guild.dev/graphql/codegen/plugins/typescript/typed-document-node)
