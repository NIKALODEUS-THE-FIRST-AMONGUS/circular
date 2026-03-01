# Pre-Commit Linting Rule

Always run `npm run lint` before completing any task to ensure code quality.

## Rule
Before marking any task as complete or submitting changes:
1. Run `npm run lint`
2. Fix all ESLint errors
3. Verify the command exits with code 0 (no errors)

## Why
- Maintains code quality
- Catches common errors early
- Ensures consistent code style
- Prevents broken builds

## When to Skip
Never skip this step unless explicitly instructed by the user.
