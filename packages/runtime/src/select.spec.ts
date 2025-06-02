import { type AFC, DistanceUnit, type Location, type UserChangeEvent } from "../../codegen/tests/__generated__/runtime"
import { Flag, type Select } from "./select"

type AFCS = Select<AFC, {}, {}, Flag.AutoTn | Flag.Buildable, []>
type AtomicSelect = Select<string, {}, {}, Flag.AutoTn | Flag.Buildable, []>
type UC = Select<UserChangeEvent, {}, {}, Flag.AutoTn | Flag.Buildable, []>
type LOC = Select<Location, {}, {}, Flag.AutoTn | Flag.Buildable, []>
const x: AFCS = null as any
x.distance({ lat: 1, lng: 2, unit: DistanceUnit.METRIC }).id.hqName

const loc: LOC = null as any
