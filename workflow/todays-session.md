# Today's Session Workflow

Use this every time you train.

## Before the session

1. Open `state/current-state.json`.
2. Read:
   - `current_week`
   - `next_session`
   - the matching section inside `next_targets`
3. Open `plan/8-week-plan.md` for the full day template.
4. Do a quick recovery check and note:
   - running and padel in the last 24 to 48 hours
   - whether yesterday was a high-step/all-day walking day
   - leg readiness score (1-5)
5. Run the session using today's targets.

### Lower-day adjustment rules (hybrid weeks)

- Trigger a light lower day if any of these are true:
  - hard run or hard padel in the last 24 hours
  - high-step/all-day walking the prior day
  - leg readiness is 1 to 2
- Light lower day format:
  - do the first 2 lower-body lifts only
  - reduce each by 1 work set
  - keep about 2 to 3 reps in reserve
  - finish with calves or abs only if energy is good
- If leg readiness is 4 to 5 and no hard lower-body sport in the last 24 hours, run the normal Lower A/B target.

## During the session

- Keep the session inside 30 to 45 minutes on normal days.
- Full-coverage days can run up to about 50 minutes.
- Prioritize the first 4 exercises if time is tight.
- Stay mostly 1 to 3 reps shy of failure, except when pushing the last set of the main lift.

## After the session

1. Create a new file in `logs/` using `logs/session-log-template.md`.
2. Record exact set-by-set performance.
3. Update `state/current-state.json` using these rules:
   - If you hit the top of the rep range on all work sets with clean form, progress the next target slightly.
   - If you improved only some sets, keep the same target and try to beat total reps next time.
   - If recovery was poor or form slipped badly, hold the target steady.
  - If a lower day was done in light format due to running/padel/walking fatigue, do not progress lower targets from that session.
4. Advance `next_session` to the next item in the rotation.
5. Update `last_completed_session`, `last_completed_session_date`, and `completed_sessions_this_cycle`.

## Default decision rules for next-session targets

- Bench press example:
  - If you get `15, 15, 15` with `2 x 19.5 kg`, next time keep the same load and make it harder with `3-1-1` tempo or a 1-second pause.
  - If you get `15, 14, 12`, keep the same setup and aim to add reps next time.
  - If you get `12, 10, 8` because recovery was poor, keep the target flat next time.

- Split squat, lunge, row, and RDL example:
  - First add reps inside the target range.
  - When the range is topped out cleanly, add tempo or pauses before adding extra sets.

- Accessory example:
  - Once you top out the range, keep the load and slow the eccentric or shorten rest slightly.

## What I should do for you in future chats

When you come back, I should:

1. read `state/current-state.json`
2. read your most recent relevant log in `logs/`
3. tell you exactly what today's session is
4. after you report results, update the next targets conservatively