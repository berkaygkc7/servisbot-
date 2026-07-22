const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// projectRoot is always mobile/ (the directory containing this config)
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Explicitly set the project root so Metro uses mobile/ even when
// invoked from a different CWD (e.g., Gradle running assembleRelease)
config.projectRoot = projectRoot;

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
