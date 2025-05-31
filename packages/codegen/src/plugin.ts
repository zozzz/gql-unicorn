import { type PluginFunction, type Types } from "@graphql-codegen/plugin-helpers"
import { GraphQLSchema } from "graphql"

import type { UnicornPluginConfig } from "./config"

export const plugin: PluginFunction<UnicornPluginConfig, Types.ComplexPluginOutput> = (
    schema: GraphQLSchema,
    documents: Types.DocumentFile[],
    config: UnicornPluginConfig
) => {}
