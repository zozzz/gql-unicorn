import type { OpMutation, OpQuery } from "./operation"
import { operations } from "./operation"

type User = {
    __typename: "User"
    id: string
    name: string
    roles: Role[]
    articles: OpQuery<{ count: number }, Article[]>
}

type MultipleOp = {
    __typename: "MultipleOp"
    roles: OpQuery<{ filter?: { name: string }; offset?: number }, Role[]>
    articles: OpQuery<{ count: number }, Article[]>
}

type Article = {
    __typename: "Article"
    id: string
    name: string
    author: OpQuery<{ id: string }, User>
}

type Role = {
    __typename: "Role"
    id: string
    name: string
}

type Queries = {
    users: OpQuery<never, User[]>
    getUserById: OpQuery<{ id: string }, User>
}

type UserInput = {
    name: string
    roles: RoleInput[]
}

type RoleInput = RoleInputNew | RoleInputFilter

type RoleInputNew = {
    name: string
}

type RoleInputFilter = {
    filter: { id?: string; name?: string }
}

type Mutations = {
    saveUser: OpMutation<UserInput, User>
}

const Query = operations<Queries>()
const Mut = operations<Mutations>()
