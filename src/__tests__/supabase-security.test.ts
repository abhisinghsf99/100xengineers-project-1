import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

function getFilesRecursively(dir: string, extensions: string[]): string[] {
  const files: string[] = []
  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath, extensions))
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath)
    }
  }
  return files
}

describe("supabase security", () => {
  it("no file in src/app/ or src/components/ imports from @supabase/supabase-js directly", () => {
    const srcDir = path.resolve(__dirname, "..")
    const dirsToCheck = [
      path.join(srcDir, "app"),
      path.join(srcDir, "components"),
    ]
    const extensions = [".ts", ".tsx", ".js", ".jsx"]

    const violations: string[] = []

    for (const dir of dirsToCheck) {
      const files = getFilesRecursively(dir, extensions)
      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8")
        if (content.includes("@supabase/supabase-js")) {
          const relativePath = path.relative(srcDir, file)
          violations.push(relativePath)
        }
      }
    }

    expect(
      violations,
      `These files import @supabase/supabase-js directly (should only be in lib/):\n${violations.join("\n")}`
    ).toEqual([])
  })
})
