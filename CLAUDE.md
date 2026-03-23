# CLAUDE.md

## App start
- Claude NEVER starts, stops, or restarts the app. The user does this manually.

## Security
- No secrets in code
- ENV only via process.env / appsettings environment variables

## Principles
- KISS

## Autonomy
- Implement everything immediately without asking for confirmation
- All file changes, commands, and edits are pre-approved for the session
- Exception: NEVER start, stop, or restart the app — user does this manually

## Output style
- Analysis and reasoning summaries only
- No code, no diffs, no patches unless explicitly requested

## Response style
- After each completed task or milestone, respond with: Coolio

## Model usage guidance
- Warn about inefficient model tier usage
- Sonnet for routine work
- Opus for complex reasoning and architecture
- Short cost nudge only

---