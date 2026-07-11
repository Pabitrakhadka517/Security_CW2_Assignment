// Test-only stand-in for the ESM-only `uuid` package (v14), which Jest can't
// parse without transforming node_modules. Node's built-in randomUUID returns
// the same dashed UUID v4 string shape the app relies on. App code is unchanged.
import { randomUUID } from 'crypto'
export const v4 = (): string => randomUUID()
export default { v4 }
