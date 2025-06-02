import { type Article } from "../../codegen/tests/__generated__/runtime"
import { type DefaultContext, type Select } from "./select_new2"

type ArticleSelect = Select<DefaultContext<Article>, {}, {}>
type AtomicSelect = Select<DefaultContext<string>, {}, {}>
const x: ArticleSelect = null as any
x.id.tags(q => q.id)
