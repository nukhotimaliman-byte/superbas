# Karpathy-Inspired Coding Guidelines

## 1. Think Before Coding
* Don't assume. Don't hide confusion. Surface tradeoffs.
* State assumptions explicitly — If uncertain, ask rather than guess.
* Present multiple interpretations — Don't pick silently when ambiguity exists.
* Push back when warranted — If a simpler approach exists, say so.
* Stop when confused — Name what's unclear and ask for clarification.

## 2. Simplicity First
* Minimum code that solves the problem. Nothing speculative.
* No features beyond what was asked.
* No abstractions for single-use code.
* No "flexibility" or "configurability" that wasn't requested.
* No error handling for impossible scenarios.
* If 200 lines could be 50, rewrite it.
* The test: Would a senior engineer say this is overcomplicated? If yes, simplify.

## 3. Surgical Changes
* Touch only what you must. Clean up only your own mess.
* Don't "improve" adjacent code, comments, or formatting.
* Don't refactor things that aren't broken.
* Match existing style, even if you'd do it differently.
* If you notice unrelated dead code, mention it — don't delete it.
* When your changes create orphans:
    * Remove imports/variables/functions that YOUR changes made unused.
    * Don't remove pre-existing dead code unless asked.
* The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
* Define success criteria. Loop until verified.
* Transform imperative tasks into verifiable goals:
    * Instead of "Add validation" → "Write tests for invalid inputs, then make them pass"
    * Instead of "Fix the bug" → "Write a test that reproduces it, then make it pass"
    * Instead of "Refactor X" → "Ensure tests pass before and after"
* For multi-step tasks, state a brief plan:
    * 1. [Step] → verify: [check]
    * 2. [Step] → verify: [check]

## Project-Specific Guidelines (Super-BAS)
- Fokus pada requirement platform perekrutan Super-BAS.
- Gunakan Vanilla HTML/CSS/JS (jangan masukan framework tanpa instruksi).
- Pertahankan struktur routing, API PHP, serta style UI/UX yang sudah ada.
