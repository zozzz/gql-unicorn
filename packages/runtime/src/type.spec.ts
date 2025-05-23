/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { expect, test } from "bun:test"

import { type Operation } from "./operation"
import { type Selected } from "./select"
import { typeFactory } from "./type"

type User = {
    __typename: "User"
    id: string
    name: string
    roles: Role[]
    articles: Operation<{ count: number }, Article[]>
}

type Article = {
    __typename: "Article"
    id: string
    name: string
}

type Role = {
    __typename: "Role"
    id: string
    name: string
}

type TypeMaps = {
    User: User
}

const Type = typeFactory<TypeMaps>()

test("simple type select", () => {
    expect(Type.User.build()).toBe("User{}")
    expect(Type.User("id", "name").build()).toBe("User{id,name}")
    expect(Type.User("id")("name").build()).toBe("User{id,name}")
})

test("nested type select", () => {
    expect(Type.User.build()).toBe("User{}")
    expect(Type.User("id", "name").build()).toBe("User{id,name}")
    expect(Type.User("id")("name").build()).toBe("User{id,name}")
})

test("type is", () => {
    expect(Type.User.is({ __typename: "User" })).toBe(true)
    expect(Type.User.is({ __typename: "Article" })).toBe(false)
    expect(Type.User.is(null)).toBe(false)
    expect(Type.User.is(undefined)).toBe(false)
    expect(Type.User.is("xyz")).toBe(false)

    const user: Selected<User, "id"> = { id: "..." }
    if (Type.User.is(user)) {
        user.id
    }
})
