import { type Article } from "../../codegen/tests/__generated__/runtime"
import { type Select, SelectFlags } from "./select_new"

type ArticleSelect = Select<null, Article, {}, {}, SelectFlags.Buildable | SelectFlags.WithTn>
const x: ArticleSelect = null as any
x.tags
