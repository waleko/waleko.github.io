---
title:  "Budget Internalization: Fixed-Budget RLVR Trades Test-Time Scaling for In-Budget Accuracy"
date:   2026-11-19 22:21:59 +00:00
image: /images/budget-internalization.png
categories: research
author: "Ilia Zavidnyi"
authors: "Ilia Zavidnyi, <strong>Alexander Kovrigin</strong>, Arina Puchkova, Kirill Gelvan, Sergey Titov"
venue: "arXiv preprint"
tldr: "RL with a fixed rollout cap teaches models the cap: they beat the base model near it, but stop improving with more tokens."
arxiv: https://arxiv.org/abs/2611.26172
---
Fixed-budget RLVR makes the rollout cap part of the model's learned behavior. Across Qwen3.5-4B, Gemma4-E2B, and Nemotron-3-Nano-4B, trained models outperform the base near the training budget but lose test-time scaling at larger budgets.
