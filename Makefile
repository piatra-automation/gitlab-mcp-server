# GitLab MCP Server Makefile
.PHONY: help build test clean install dev watch publish publish-dry-run dxt-pack dxt-test check-npm bump-patch bump-minor bump-major

# Default target - show help
help:
	@echo "GitLab MCP Server - Available targets:"
	@echo "  make install       - Install dependencies"
	@echo "  make build         - Build the TypeScript project"
	@echo "  make watch         - Build and watch for changes"
	@echo "  make dev           - Run development server"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make test          - Run tests (if available)"
	@echo "  make dxt-pack      - Create DXT extension package"
	@echo "  make dxt-test      - Test DXT with debug logging"
	@echo "  make publish       - Build and publish to npm"
	@echo "  make publish-dry   - Dry run of npm publish"
	@echo "  make bump-patch    - Bump patch version (1.4.0 -> 1.4.1)"
	@echo "  make bump-minor    - Bump minor version (1.4.0 -> 1.5.0)"
	@echo "  make bump-major    - Bump major version (1.4.0 -> 2.0.0)"

# Install dependencies
install:
	npm install

# Build the project
build:
	npm run build

# Watch mode for development
watch:
	npm run watch

# Run development server
dev:
	npm start

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf *.dxt
	rm -rf node_modules/.cache

# Run tests (placeholder - add actual test command when tests are available)
test:
	@echo "No tests configured yet"
	# npm test

# Create DXT package
dxt-pack: build
	npm run dxt:pack

# Test DXT with debug logging
dxt-test:
	npm run dxt:test

# Check if logged into npm
check-npm:
	@npm whoami || (echo "Error: Not logged into npm. Run 'npm login' first." && exit 1)

# Bump patch version
bump-patch:
	npm version patch --no-git-tag-version
	@echo "Version bumped. Remember to update src/index.ts with the new version."

# Bump minor version
bump-minor:
	npm version minor --no-git-tag-version
	@echo "Version bumped. Remember to update src/index.ts with the new version."

# Bump major version
bump-major:
	npm version major --no-git-tag-version
	@echo "Version bumped. Remember to update src/index.ts with the new version."

# Dry run publish to see what would be published
publish-dry-run: check-npm build
	npm publish --dry-run

# Main publish target
publish: check-npm
	@echo "=== GitLab MCP Server NPM Publish ==="
	@echo "Current version: $$(node -p "require('./package.json').version")"
	@echo ""
	@echo "Pre-publish checklist:"
	@echo "  1. Have you committed all changes?"
	@echo "  2. Have you updated the version in package.json?"
	@echo "  3. Have you updated the version in src/index.ts?"
	@echo "  4. Have you tested the build?"
	@echo ""
	@read -p "Continue with publish? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo ""
	@echo "Step 1/4: Cleaning previous build..."
	$(MAKE) clean
	@echo ""
	@echo "Step 2/4: Installing dependencies..."
	$(MAKE) install
	@echo ""
	@echo "Step 3/4: Building project..."
	$(MAKE) build
	@echo ""
	@echo "Step 4/4: Publishing to npm..."
	npm publish --access public
	@echo ""
	@echo "✅ Successfully published version $$(node -p "require('./package.json').version") to npm!"
	@echo ""
	@echo "Post-publish steps:"
	@echo "  1. Create a git tag: git tag v$$(node -p "require('./package.json').version")"
	@echo "  2. Push the tag: git push origin v$$(node -p "require('./package.json').version")"
	@echo "  3. Create a GitLab release if desired"
	@echo "  4. Update the DXT package if needed: make dxt-pack"

# Quick publish (skips confirmation)
publish-quick: check-npm clean install build
	npm publish --access public
	@echo "✅ Published version $$(node -p "require('./package.json').version") to npm!"