# How To Use This Training Agent

This agent is here to make your training simple.

You do not need to manage the program manually. Your job is to ask what to do, do the session, then report what actually happened.

## What to do before a workout

Open chat in this workspace and ask a simple question like:

- `What should I do today?`
- `What is today's session?`
- `Give me today's workout.`

If you want live step-by-step guidance with timers, ask:

- `What am I doing today?`

Then open `app/index.html` and use the Live Workout Guide.

If useful, also include any context that affects the session:

- how much time you have
- whether you feel fresh, average, or tired
- any pain or limitation today
- whether you want the full session or just the priority lifts

Example:

```text
What should I do today? I have 25 minutes and feel a bit tired.
```

The agent should then give you:

- today's session type
- the exercises in order
- your target load, sets, reps, tempo, and rest
- any practical note for deload week, performance week, or fatigue

## What to do during the workout

Train the session and keep simple notes.

You only need to capture the things that matter:

- reps achieved on each work set
- any change in tempo, pause, or range of motion
- whether form was solid
- whether something felt unusually easy, hard, or painful

You do not need to write a long summary during training.

## What to do after the workout

Come back to chat and report what you actually did.

Keep it short and concrete. A plain-language message is fine.

Example:

```text
I did Push today.
Bench press 19.5 kg each hand: 15, 14, 12.
One-arm overhead press 12.5 kg: 10, 9, 8 each side.
Incline press 12.5 kg each hand: 14, 12.
Lateral raise 8 kg: 15, 13.
Triceps extension 12.5 kg: 12, 11.
Felt fine overall. About 30 minutes.
Please log this and update the next-session targets.
```

The last line matters if you want the files updated. If you want the agent to persist the result, say something explicit like:

- `Please log this and update the files.`
- `Record this and update my next targets.`
- `Use this as the latest source of truth.`

## What the agent should do after you report results

The agent should:

- summarize what you achieved
- decide whether next time should progress, hold steady, or slightly back off
- keep progression conservative
- update the saved training state when you ask it to maintain the files

## How progression should feel

This system should not aggressively force progress.

In general:

- if you are still building reps inside the target range, keep the setup the same and beat it next time
- if you clearly topped out the range with clean reps, make the next session slightly harder
- if load is limited, progression should usually come from reps first, then tempo, pauses, range of motion, unilateral work, or rest control
- if recovery, technique, or pain is poor, hold steady instead of forcing progression

## Good default prompts to use

- `What should I do today?`
- `Give me today's session in a short format.`
- `I only have 20 minutes. Trim today's session to the priorities.`
- `I did today's workout. Please log this and update the next targets.`
- `I missed a few days. What should I do next?`
- `I feel run down today. Should I still do the planned session?`
- `This movement is too easy with my dumbbells. How should I progress it without overcomplicating things?`

## If you are restarting after a gap

If you have missed several sessions or feel detrained, tell the agent that directly.

Example:

```text
I have not trained for 9 days. What should I do today?
```

The agent should respond conservatively, not as if nothing happened.

## If something hurts

Say what movement hurts and where.

Example:

```text
Reverse lunges are irritating my right knee today. What should I swap or reduce?
```

The agent should keep the plan practical and avoid inventing unnecessary complexity.

## The simplest way to use this system

Use this rhythm every time:

1. Ask: `What should I do today?`
2. Do the workout.
3. Report the actual results.
4. Ask the agent to log it and update the next targets.

That is enough to keep the system working.