# doc-for-agent (Skill)

This repository has doc-for-agent installed as an AI agent skill.
The system uses doc-for-agent to manage its dual-layer documentation (human `docs/` and agent contexts `AGENTS/`).

## Execution Rules

1. **When to run**: AFTER you make significant code changes, refactor a subsystem, or modify the project's architecture, you MUST run the `docagent refresh` command to update the local context, silently without waiting for the user to ask.
2. **Command to run**:
   ```bash
   docagent refresh --output-mode quad
   ```
   (If the user's workspace is missing the `docagent` command, instruct them to install it globally via `npm install -g doc-for-agent`.)

3. **Behavior**: This will scan the repository state and correctly format the findings into the `AGENTS/` directory, maintaining the synchronization between code execution and the documented "truth". Do NOT invent or hallucinate documentation; ALWAYS rely on the `docagent` to regenerate the baseline.

4. **Checks**: Before concluding a large refactor task, run `docagent doctor` to ensure the documentation structure is healthy.
