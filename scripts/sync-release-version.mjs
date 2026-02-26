import fs from "node:fs";
import path from "node:path";

const rootPkgPath = path.resolve("package.json");
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
const version = process.argv[2] ?? rootPkg.version;

if (!version) {
  console.error("Usage: node scripts/sync-release-version.mjs <version>");
  console.error("   Or set \"version\" in root package.json and run without arguments.");
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/.test(version)) {
  console.error(`Invalid semver version: '${version}'`);
  process.exit(1);
}

const publishablePackageJsonPaths = [
  "packages/tool-contracts/package.json",
  "packages/runtime-client/package.json",
  "packages/vite-plugin/package.json",
  "packages/next-plugin/package.json",
  "refract-plugins/tailwind-editor-action/package.json"
];

for (const relativePath of publishablePackageJsonPaths) {
  const absolutePath = path.resolve(relativePath);
  const pkg = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  pkg.version = version;
  fs.writeFileSync(absolutePath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`updated ${relativePath} -> ${version}`);
}
