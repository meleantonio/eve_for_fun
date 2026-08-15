# ALFRED payroll vintages: the wrong print

## Named object

St. Louis Fed **ALFRED** vintage history for **PAYEMS** (All Employees: Total Nonfarm),
series page: https://alfred.stlouisfed.org/series?seid=PAYEMS

We work the **first release** versus **today’s revised** level for a fixed observation month.
This is not a synthetic two-regressor toy panel. It is the print markets trade.

## Stake

Nonfarm payrolls move rates, equities, and policy narratives on release morning. If your
pipeline silently substitutes the **current vintage** for the **release-day vintage**, every
event study, high-frequency identification, and “surprise” series you build is mis-measured.
The stake is a wrong employment change (thousands of jobs) on a named month.

## Naive path

Naive approach: hit the modern FRED endpoint for PAYEMS, take the latest value for month
\(T\), and treat it as “the print.” That number is usually a **revision**, not the first print.

Run `python tutorial.py` and read `NAIVE_WRONG_PRINT`. On the sample month baked into the
script, the naive path reports a **wrong** month-on-month change relative to the first-release
vintage. The script prints both numbers and exits non-zero if you assert they are equal —
they are not.

**Examine** the PAYEMS series page. **eXplain** why a revised level is the wrong object for
a release-morning surprise. **Output prediction:** before running, write down whether you
expect first-release ΔPAYEMS to match today’s vintage ΔPAYEMS for the same month (it should
not, in general).

## Technique

Use ALFRED vintage dates: observe PAYEMS for month \(T\) as it stood on vintage \(v\)
(first release), then compare to the same observation month under a later vintage.
`tutorial.py` downloads JSON from the public FRED/ALFRED API (API key via `FRED_API_KEY`,
or the script falls back to a recorded fixture slice committed beside the tutorial for smoke).

Steps you own (do not outsource the organisation of this code):

1. Resolve the observation month and the first-release vintage date.
2. Pull the value at that vintage; compute the month-on-month change.
3. Pull today’s vintage for the same observation month; compute the naive change.
4. Diff them — that diff is the revision error your naive path ships.

**Probe** what happens if you align on `realtime_start` incorrectly. **Link to economics:**
this is the same object used in high-frequency monetary identification and macro surprise
regressions (e.g. payroll surprises vs. expectations). **Recreate** with `python tutorial.py`.
**Extend:** swap in `UNRATE` or a CPI series and repeat the first-vs-current vintage check.

## You will get this wrong

- Using FRED’s current series as if it were ALFRED first-release.
- Aligning on seasonally-adjusted vs. not, or on period end dates vs. vintage timestamps.
- Treating “latest available month” as “last month’s print” across early-morning API pulls.
- Caching a JSON blob and forgetting it is vintage-specific.
- Asserting equality of naive and first-release changes “for simplicity” in a tutorial.

## Controversy

Applied work disagrees on how aggressively to vintage-match: some papers insist on pure
first-release surprises; others argue that revisions are part of the information set for
slower-frequency designs. There is also disagreement about whether ALFRED’s vintage grid
is fine enough for every release cycle and how to handle redefinitions of PAYEMS. Pick a
rule, state it, and do not paper over it with a synthetic demo.

## References

- ALFRED PAYEMS: https://alfred.stlouisfed.org/series?seid=PAYEMS
- FRED API docs: https://fred.stlouisfed.org/docs/api/fred/
- Croushore & Stark on real-time data analysis (vintage error as first-class object)
