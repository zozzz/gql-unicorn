import { getSchema, transform } from "@gql-unicorn/codegen"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

const argv = yargs(hideBin(process.argv))
    .command("gql-unicorn", "Generate the required files")
    .option("schema", {
        alias: "s",
        type: "string",
        description: "Path to the GraphQL schema / URL for introspection",
        required: true
    })
    .option("output", {
        alias: "o",
        type: "string",
        description: "Path to the output file",
        required: true
    })
    .parse()

async function main(args: typeof argv) {
    const { schema, output } = args as {
        schema: string
        output: string
    }
    const gqlSchema = await getSchema(schema, {})
    const result = transform(gqlSchema)
    await Bun.write(output, result)
}

await main(argv)
