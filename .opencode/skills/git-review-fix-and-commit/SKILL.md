---
name: git-review-fix-and-commit
description: Review current git changes, fix issues, validate quality, create small atomic commits, and commit them automatically — following Trunk-Based Development principles.
---

---

# git-review-fix-and-commit (Trunk-Based Development)

Follow Trunk-Based Development (TBD) rules: **short-lived branches (< 24h), small atomic commits, main always releasable, feature flags for incomplete work.**

## Phase 1: Repository Analysis

1. Run `git status` and identify all changed files.
2. Inspect every modified, added, deleted, and renamed file.
3. Understand the purpose of each change.
4. Group related files into logical change sets.
5. **Branch Lifecycle Check** — Run `git log --oneline -1 --format="%cr" HEAD` to check branch age:
   - If branch is older than 24 hours: **WARN** — flag that this branch exceeds TBD max lifetime. Suggest squashing or splitting into smaller chunks.
   - If branch is older than 48 hours: **BLOCK** — do not proceed until user rebases or explains.
6. **PR Size Check** — Count total lines changed across all files:
   - If > 400 lines: **WARN** — recommend splitting into multiple smaller PRs.

Examples:

- Feature implementation
- Bug fix
- Refactor
- Configuration change
- Dependency update
- Documentation update
- Test updates

Do not assume all changes belong in a single commit.

---

## Phase 2: Code Review

For each logical group:

1. Explain what changed.
2. Review for:
   - bugs
   - regressions
   - type errors
   - lint violations
   - dead code
   - security issues
   - performance concerns
   - architectural inconsistencies

3. Verify consistency with:
   - project conventions
   - design patterns
   - coding standards
   - existing architecture

4. Check for deprecated Tailwind CSS v3 class names used in v4 codebase:
   - `bg-gradient-{dir}` → `bg-linear-{dir}`
   - `shadow-[rgba(...)]` → prefer modern shadow syntax
   - Any other v3→v4 class renames flagged by the framework

5. Identify improvements.
6. Apply safe fixes automatically when confidence is high.

---

## Phase 3: Validation (CI Gate)

Run **all** validation commands. In TBD, trunk must always pass CI, so every commit must be validated.

- lint
- typecheck
- tests (unit + integration if available)
- build (verify bundle compiles)

Prefer existing project scripts. If validation fails, **do not proceed** — fix all issues first.

Examples:

- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

or equivalent project commands.

**CI Awareness:**

- If CI config exists (`.github/workflows/`), verify the local state matches what CI would test.
- Run `pnpm build` to ensure the project compiles before committing — a broken build on trunk blocks everyone in TBD.

---

## Phase 4: Failure Handling

If validation fails:

1. Attempt to fix the issue automatically.
2. Re-run validation.

If issues still remain:

STOP.

Provide:

- failing files
- failing commands
- error messages
- attempted fixes
- recommended next actions

Do not create any commits while unresolved issues remain.

---

## Phase 5: Atomic Commit Planning (TBD)

If validation passes:

1. Re-evaluate all changed files.
2. Create a commit plan.
3. Ensure each commit represents exactly **one logical change**.
4. **Prefer smaller commits** — a commit should be independently reviewable and mergable.

Rules:

- Different features = different commits
- Refactors separate from features
- Bug fixes separate from refactors
- Config changes separate from application code
- Documentation separate from implementation
- Tests belong with the feature or fix they validate
- **Incomplete features MUST be behind feature flags** — if code is merged but not ready for users, it must be gated. If no flag exists, flag this as a TBD violation.
- **Each commit should leave trunk in a releasable state** — if a commit breaks trunk, it violates TBD.
- **Prefer 50-200 line changes** per commit. If a change exceeds 400 lines, propose splitting into multiple commits.

If a file appears to belong to multiple commits:

STOP and explain the ambiguity.

Do not guess.

---

## Phase 6: Commit Creation (TBD)

For each approved logical group:

1. Stage only files belonging to that group.
2. Never use:

git add .

3. Generate a **Conventional Commit** message with TBD-savvy scope.

Examples:

feat(patients): add search with feature flag gating

fix(accounting): handle negative transaction amounts

test(digits): add unit tests for digit conversion

ci: add GitHub Actions workflow for trunk checks

chore(deps): update react-router to v7.16

refactor(warehouse): extract inventory validation

4. Ensure the commit message body references any related issue/feature flag.
5. Create the commit.
6. Record:
   - commit hash
   - commit message
   - files included

Repeat until all valid groups are committed.

**TBD Reminder:** Each commit should leave trunk releasable. If a commit depends on a later commit that hasn't been made yet, reconsider the commit boundary.

---

## Phase 7: Final Report

Provide:

### Commit Summary

For each commit:

- commit hash
- commit message
- included files

### Validation Summary

- lint status
- typecheck status
- test status

### Remaining Changes

Show any files that were intentionally left uncommitted.

### Overall Result

Report whether the repository is clean or if additional action is required.
