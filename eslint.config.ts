import path from "node:path"
import { fileURLToPath } from "node:url"

import { includeIgnoreFile } from "@eslint/compat"
import markdown from "@eslint/markdown"
import jsStylistic from "@stylistic/eslint-plugin-js"
import tsStylistic from "@stylistic/eslint-plugin-ts"
import type { Linter } from "eslint"
import jsoncPlugin from "eslint-plugin-jsonc"
import prettierPluginConfig from "eslint-plugin-prettier/recommended"
import unusedImportsPlugin from "eslint-plugin-unused-imports"
import tslint from "typescript-eslint"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const gitignorePath = path.resolve(__dirname, ".gitignore")

export const PROJECT_ABBREV = "rege"

export function flatten(configs: Linter.Config[]): Linter.Config {
    return configs.reduce((dst, curr) => {
        const { rules, ...others } = curr
        return { ...dst, ...others, rules: { ...dst.rules, ...rules } }
    }, {})
}

export function workspaceGlob(directory: string, pattern: string): string {
    const root = path.resolve(__dirname, directory)
    if (path.relative(root, process.cwd()).startsWith("..")) {
        return nglob(path.join(directory, pattern))
    } else {
        return pattern
    }
}

function nglob(g: string): string {
    return g.replace(/\\/g, "/")
}

// const allowFromTSConfig = Object.entries(tsconfig.compilerOptions.paths)
//     .reduce<string[]>((dst, [_, v]) => {
//         dst.push(...v.map(v => `!${v}`))
//         dst.push(...v.filter(v => !/.+\..{2,5}$/.test(v)).map(v => `!${v.replace(/\/$/, "")}/**`))
//         return dst
//     }, [])
//     .filter((v, i, a) => a.findIndex(value => value === v) === i)

// // eslint-disable-next-line unused-imports/no-unused-vars
// const gitIgnores = includeIgnoreFile(gitignorePath).ignores!

/* ! DO NOT EDIT ! */

export default [
    // XXX: Valamiért szerintem full bugos az unignore pattern, addig viszont jobb, ha nincs semmi ignorálva
    // https://github.com/eslint/eslint/issues/19471
    // {
    //     ignores: [...gitIgnores, ...allowFromTSConfig],
    //     name: "GIT / .gitignore"
    // },
    includeIgnoreFile(gitignorePath),
    {
        ...flatten(jsoncPlugin.configs["flat/prettier"]),
        name: "JSONC / prettier"
    },
    {
        ...flatten(markdown.configs.recommended),
        name: "Markdown / recommended",
        language: "markdown/gfm",
        processor: "markdown/markdown"
    },
    {
        name: "Markdown / code-blocks",
        files: ["**/*.md/**"],
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    impliedStrict: true
                }
            }
        }
    },
    {
        ...prettierPluginConfig,
        name: "Prettier / common",
        files: ["**/*.{ts,tsx,json,jsonc,json5,yml,yaml,toml,md}"],
        ignores: ["**/*.toml"],
        rules: {
            ...prettierPluginConfig.rules,
            "prettier/prettier": [
                "warn",
                {
                    semi: false,
                    trailingComma: "none",
                    arrowParens: "avoid",
                    quoteProps: "consistent",
                    bracketSpacing: true,
                    bracketSameLine: true,
                    htmlWhitespaceSensitivity: "ignore",
                    embeddedLanguageFormatting: "auto",
                    experimentalTernaries: false,
                    experimentalOperatorPosition: "start",
                    plugins: ["@trivago/prettier-plugin-sort-imports"],

                    // IMPORT SORT
                    importOrderSeparation: true,
                    importOrderSortSpecifiers: true,
                    importOrderCaseInsensitive: true,
                    importOrderParserPlugins: ["typescript", "decorators-legacy"],
                    importOrderImportAttributesKeyword: "with",
                    importOrderGroupNamespaceSpecifiers: true,
                    importOrder: ["^node:.*?", "^@angular/", "^rxjs", "<THIRD_PARTY_MODULES>", "^@rege/*", "^[./]"]
                }
            ]
        }
    },
    ...tslint
        .config({
            name: "Typescript / overrides",
            extends: [tslint.configs.strictTypeChecked],
            files: ["**/*.ts", "**/*.tsx"],
            plugins: {
                "@stylistic/js": jsStylistic,
                "@stylistic/ts": tsStylistic,
                "unused-imports": unusedImportsPlugin
            },
            languageOptions: {
                // globals: globals.node,
                parserOptions: {
                    projectService: true
                    // tsconfigRootDir: import.meta.dirname,
                }
            },
            linterOptions: {
                reportUnusedDisableDirectives: "error",
                reportUnusedInlineConfigs: "error"
            },
            rules: {
                // COMMON
                // "indent": ["error", 4, { SwitchCase: 1, offsetTernaryExpressions: false }],
                // "@stylistic/ts/indent": ["error", 4, { SwitchCase: 1, offsetTernaryExpressions: true }],
                "arrow-body-style": ["error", "as-needed"],
                "eqeqeq": ["error", "always", { null: "ignore" }],
                "yoda": ["error", "never", { exceptRange: true }],
                "no-alert": "error",
                "prefer-arrow-callback": "error",
                "no-empty": [
                    "error",
                    {
                        allowEmptyCatch: true
                    }
                ],

                "no-unused-vars": "off",
                "@typescript-eslint/no-unused-vars": "off",
                "unused-imports/no-unused-imports": "error",
                "unused-imports/no-unused-vars": [
                    "error",
                    {
                        vars: "all",
                        args: "after-used",
                        argsIgnorePattern: "^_",
                        caughtErrors: "all",
                        caughtErrorsIgnorePattern: "^ignore",
                        destructuredArrayIgnorePattern: "^_",
                        ignoreRestSiblings: true,
                        ignoreClassWithStaticInitBlock: true
                    }
                ],

                // JAVASCRIPT
                "@stylistic/js/max-len": ["warn", { code: 120 }],
                "@stylistic/js/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
                "@stylistic/js/multiline-ternary": "off",

                // TYPESCRIPT
                "@stylistic/ts/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
                "@stylistic/ts/quote-props": ["error", "consistent-as-needed"],
                "@stylistic/ts/multiline-ternary": "off",

                "@typescript-eslint/no-explicit-any": "off",
                "@typescript-eslint/no-non-null-assertion": "off",
                "@typescript-eslint/no-for-in-array": "error",
                "@typescript-eslint/no-extraneous-class": "off",
                "@typescript-eslint/no-unnecessary-type-parameters": "off",
                "@typescript-eslint/no-confusing-void-expression": [
                    "error",
                    {
                        ignoreArrowShorthand: true,
                        ignoreVoidOperator: true
                    }
                ],
                "@typescript-eslint/array-type": [
                    "error",
                    {
                        default: "array-simple",
                        readonly: "generic"
                    }
                ],
                "@typescript-eslint/prefer-optional-chain": [
                    "error",
                    {
                        allowPotentiallyUnsafeFixesThatModifyTheReturnTypeIKnowWhatImDoing: false,
                        requireNullish: true
                    }
                ],
                "@typescript-eslint/restrict-template-expressions": [
                    "error",
                    {
                        allowNumber: true,
                        allowBoolean: true,
                        // Tricky, maybe a bug, but without this option, not accept this:
                        // const key: "key-name1" | "key-name2" = "key-name1"
                        // const tpl = `something: ${key}`
                        allowNever: true
                    }
                ],
                "@typescript-eslint/no-unnecessary-condition": [
                    "error",
                    {
                        allowConstantLoopConditions: "only-allowed-literals"
                    }
                ],
                "@typescript-eslint/unbound-method": [
                    "error",
                    {
                        ignoreStatic: true
                    }
                ],
                "@typescript-eslint/no-unsafe-assignment": "off",
                "@typescript-eslint/no-unsafe-return": "off"
            }
        })
        .map(value => {
            const parts = value.name!.split(/\s*\/\s*/)
            value.name = `${parts[0]} / ${parts[parts.length - 1]}`
            return value
        })
].filter((v, i, a) => a.findIndex(value => value.name === v.name) === i) as Linter.Config[]
