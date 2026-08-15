# Goal Loop for Economic Research

## Overview
This tutorial shows how to use a goal loop with an LLM.

## Why economists should care
Economists can automate literature reviews and coding.

## Prerequisites
Python 3.10+, an API key, and curiosity.

## The technique in plain language
You set a goal; the model loops until the goal is met.

## Step-by-step (with code)

```python
# generate.sh wraps this demo
import numpy as np
from sklearn.linear_model import LinearRegression

x1 = np.random.normal(size=100)
x2 = np.random.normal(size=100)
y = 1 + 2 * x1 + 0.5 * x2 + np.random.normal(size=100)
# Fit toy OLS: y ~ x1 + x2
LinearRegression().fit(np.c_[x1, x2], y)
raise NotImplementedError("wire up the agent loop")
```

Open `policy_report.pdf` as a pseudo-application for a ministry briefing.

## Econ use case walkthrough
Imagine forecasting GDP with the loop.

## Pitfalls and when not to use this
Hallucinations; cost.

## References
- https://example.com/goal-loop

If you want, I can also draft a second repo on Claude goal loops for econ research.
