const generateModule = require("@babel/generator");
const { parse } = require("@babel/parser");
const traverseModule = require("@babel/traverse");
const t = require("@babel/types");

const generate = getDefaultExport(generateModule);
const traverse = getDefaultExport(traverseModule);

module.exports = function refractJsxInstrumentationLoader(source, inputSourceMap) {
  const callback = this.async();
  const resourcePath = (this.resourcePath || "").split("?")[0];

  if (!isJsxLikeFile(resourcePath) || resourcePath.includes("/node_modules/")) {
    callback(null, source, inputSourceMap);
    return;
  }

  let ast;
  try {
    ast = parse(source, {
      sourceType: "module",
      plugins: getParserPlugins(resourcePath)
    });
  } catch {
    callback(null, source, inputSourceMap);
    return;
  }

  let didMutate = false;
  const normalizedFile = normalizeSourceFile(resourcePath, this.rootContext || process.cwd());

  traverse(ast, {
    JSXOpeningElement(pathRef) {
      const { node } = pathRef;
      const start = node.loc && node.loc.start;
      if (!start) {
        return;
      }

      appendAttribute(node, "data-tool-file", normalizedFile);
      appendAttribute(node, "data-tool-line", String(start.line));
      appendAttribute(node, "data-tool-column", String(start.column + 1));
      didMutate = true;
    }
  });

  if (!didMutate) {
    callback(null, source, inputSourceMap);
    return;
  }

  const output = generate(
    ast,
    {
      retainLines: true,
      sourceMaps: true
    },
    source
  );

  callback(null, output.code, output.map || inputSourceMap || null);
};

function isJsxLikeFile(resourcePath) {
  return /\.(js|jsx|ts|tsx)$/.test(resourcePath);
}

function getParserPlugins(resourcePath) {
  if (resourcePath.endsWith(".tsx")) {
    return ["jsx", "typescript"];
  }

  if (resourcePath.endsWith(".ts")) {
    return ["typescript"];
  }

  return ["jsx"];
}

function normalizeSourceFile(resourcePath, root) {
  const normalizedPath = toPosixPath(resourcePath);
  const normalizedRoot = toPosixPath(root);

  if (normalizedPath.startsWith(normalizedRoot)) {
    const relativePath = normalizedPath.slice(normalizedRoot.length).replace(/^\//, "");
    return `/${relativePath}`;
  }

  return normalizedPath;
}

function appendAttribute(node, name, value) {
  const exists = node.attributes.some(
    (attribute) =>
      attribute.type === "JSXAttribute" &&
      attribute.name &&
      attribute.name.type === "JSXIdentifier" &&
      attribute.name.name === name
  );

  if (exists) {
    return;
  }

  node.attributes.push(t.jsxAttribute(t.jsxIdentifier(name), t.stringLiteral(value)));
}

function toPosixPath(inputPath) {
  return String(inputPath).replace(/\\/g, "/");
}

function getDefaultExport(moduleValue) {
  if (
    typeof moduleValue === "object" &&
    moduleValue !== null &&
    Object.prototype.hasOwnProperty.call(moduleValue, "default")
  ) {
    return moduleValue.default;
  }

  return moduleValue;
}
