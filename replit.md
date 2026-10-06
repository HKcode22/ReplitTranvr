# Project instructions

## Git and read-only safety

- Do not run `git add`, `git commit`, or `git push` unless the current user request explicitly asks for that specific action. A request to implement, fix, or test code does not authorize any of them, and authorization for one does not authorize the others.
- For read-only requests such as inspection, diagnosis, or reporting, do not edit files or run scripts or commands that mutate project, Git, database, or other external state. Use read-only operations only; ask before any necessary mutation.
- These rules apply to explicit actions run by the Agent. Replit may create platform-managed automatic checkpoints independently; this instruction cannot disable or change that behavior.
