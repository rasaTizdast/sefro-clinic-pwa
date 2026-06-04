---
name: git-review-fix-and-commit
description: Review current git changes, fix issues, validate quality, create logical commit groups, and commit them automatically when validation passes.
---

---

# git-review-fix-and-commit

When invoked, follow this workflow:

## Phase 1: Repository Analysis

1. Run git status and identify all changed files.
2. Inspect every modified, added, deleted, and renamed file.
3. Understand the purpose of each change.
4. Group related files into logical change sets.

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

## Phase 3: Validation

Run relevant validation commands based on the repository:

- lint
- typecheck
- tests

Prefer existing project scripts.

Examples:

- npm run lint
- npm run typecheck
- npm run test

or equivalent project commands.

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

## Phase 5: Atomic Commit Planning

If validation passes:

1. Re-evaluate all changed files.
2. Create a commit plan.
3. Ensure each commit represents exactly one logical change.

Rules:

- Different features = different commits
- Refactors separate from features
- Bug fixes separate from refactors
- Config changes separate from application code
- Documentation separate from implementation
- Tests belong with the feature or fix they validate

If a file appears to belong to multiple commits:

STOP and explain the ambiguity.

Do not guess.

---

## Phase 6: Commit Creation

For each approved logical group:

1. Stage only files belonging to that group.
2. Never use:

git add .

3. Generate a Conventional Commit message.

Examples:

feat(auth): add password reset flow

fix(api): handle missing user profile

refactor(dashboard): simplify chart state management

docs(readme): update installation guide

4. Create the commit.
5. Record:
   - commit hash
   - commit message
   - files included

Repeat until all valid groups are committed.

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
