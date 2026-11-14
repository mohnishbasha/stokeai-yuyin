# Single entry point for building and deploying Yuyin (ARCHITECTURE 16.1).
# Scripts under scripts/ do the work; this file names it. Run `make help` for the target list.
# Help text comes from the `## ` comment on each target line.

SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

VERSION   ?= $(shell tr -d '[:space:]' < VERSION)
REGISTRY  ?= ghcr.io/mohnishbasha
PLATFORMS ?= linux/arm64,linux/amd64
ENGINE    ?= fake
NAMESPACE ?= yuyin
VALUES    ?= values-kind.yaml
export VERSION REGISTRY PLATFORMS ENGINE NAMESPACE VALUES

UV := $(shell command -v uv 2>/dev/null)
later = @echo "make $@: available from Sprint $(1)"

##@ Build

.PHONY: setup
setup: ## install toolchains and dependencies, fetch test models
	scripts/setup.sh

.PHONY: build
build: ## build everything (debug)
	cargo build --workspace --locked
	bun run build

.PHONY: build-release
build-release: ## build everything (release profile)
	cargo build --workspace --locked --release
	bun run build

.PHONY: build-gateway
build-gateway: ## cargo build -p yuyin-gateway --release
	cargo build -p yuyin-gateway --locked --release

.PHONY: build-console
build-console: ## bun run --cwd apps/console build
	bun run --cwd apps/console build

.PHONY: build-docs
build-docs: ## bun run --cwd apps/docs build
	bun run --cwd apps/docs build

.PHONY: build-sdk
build-sdk: ## build TypeScript and Python SDK packages
	bun run --cwd packages/sdk-ts build
ifneq ($(UV),)
	uv build --project packages/sdk-python --out-dir packages/sdk-python/dist
else
	@echo "make build-sdk: uv not found, skipping the Python SDK"
endif

.PHONY: build-cli
build-cli: ## bun build --compile for the host platform -> dist/cli/yuyin
	$(call later,8)

.PHONY: build-cli-all
build-cli-all: ## CLI binaries for all platforms
	$(call later,8)

.PHONY: build-mcp
build-mcp: ## build the MCP server package
	bun run --cwd packages/mcp build

.PHONY: build-wasm
build-wasm: ## build yuyin-count-wasm for the console
	$(call later,4)

.PHONY: models
models: ## scripts/fetch-models.sh with checksum verification
	scripts/fetch-models.sh

.PHONY: dist-selfhost
dist-selfhost: ## self-host tarball with checksums
	$(call later,7)

##@ Verify

.PHONY: lint
lint: ## cargo fmt and clippy, eslint and prettier, OpenAPI lint
	cargo fmt --all --check
	cargo clippy --workspace --all-targets --locked -- -D warnings
	bun run lint
	bun run lint:openapi

.PHONY: type-check
type-check: ## TypeScript type check for every package
	bun run type-check

.PHONY: test
test: ## Rust, TypeScript, and Python unit tests
	cargo test --workspace --locked
	bun run test
ifneq ($(UV),)
	uv run --project packages/sdk-python --frozen pytest -q packages/sdk-python/tests
else
	@echo "make test: uv not found, skipping the Python SDK tests"
endif

.PHONY: check-versions
check-versions: ## every manifest matches VERSION
	scripts/check-versions.sh

.PHONY: golden
golden: ## text normalisation golden corpus
	$(call later,1)

.PHONY: e2e
e2e: ## end-to-end tests (needs Docker)
	@for t in tests/scaffold/e2e_*.sh; do bash "$$t"; done

.PHONY: bench
bench: ## benchmark harness
	$(call later,3)

.PHONY: check
check: lint type-check test check-versions ## lint + type-check + test + check-versions (what CI runs)

##@ Local deploy

.PHONY: dev
dev: ## native: Postgres, Valkey, stripe-mock in Compose; gateway on the host
	scripts/dev.sh

.PHONY: run-selfhost
run-selfhost: ## native: release gateway in self-host mode with a dev licence
	$(call later,7)

.PHONY: up
up: ## full stack in containers from locally built images
	$(call later,4)

.PHONY: down
down: ## stop and remove the Compose stack
	scripts/dev.sh --stop

.PHONY: logs
logs: ## follow logs
	$(call later,4)

.PHONY: smoke
smoke: ## run tests/smoke against whatever is running (URL from YUYIN_SMOKE_URL)
	bash tests/smoke/run.sh

##@ Containers (OCI)

.PHONY: image
image: ## build all images for the host architecture, load into the local daemon
	$(call later,0 (S0-T13))

.PHONY: image-multiarch
image-multiarch: ## buildx build linux/amd64 + linux/arm64 (no load)
	$(call later,0 (S0-T13))

.PHONY: image-push
image-push: ## push multi-arch images, sign, attach SBOM and provenance
	$(call later,6)

.PHONY: image-scan
image-scan: ## vulnerability scan, fail on high or critical
	$(call later,6)

.PHONY: models-artifact
models-artifact: ## package models as an OCI artifact and push
	$(call later,6)

##@ Kubernetes (Helm)

.PHONY: helm-lint
helm-lint: ## helm lint + template with every values profile + schema validation
	$(call later,3)

.PHONY: helm-package
helm-package: ## package the chart and push it to GHCR as an OCI artifact
	$(call later,11)

.PHONY: kind-up
kind-up: ## create a local kind cluster with ingress and metrics
	$(call later,3)

.PHONY: kind-load
kind-load: ## load locally built images into kind
	$(call later,3)

.PHONY: helm-install
helm-install: ## helm upgrade --install into the current kube context
	$(call later,3)

.PHONY: helm-test
helm-test: ## helm test + smoke suite through the ingress
	$(call later,3)

.PHONY: helm-uninstall
helm-uninstall: ## remove the release
	$(call later,3)

.PHONY: kind-down
kind-down: ## delete the local cluster
	$(call later,3)

##@ Help

.PHONY: help
help: ## list every target
	@awk 'BEGIN {FS = ":.*## "} \
	  /^##@/ {printf "\n%s\n", substr($$0, 5); next} \
	  /^[a-zA-Z0-9_-]+:.*## / {printf "  make %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
