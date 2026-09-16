---
title: "AlphaGo: Search, Value, and Policy Networks in One Competitive Loop"
slug: "alphago-mastering-go"
description: "Silver et al. combined SL policy nets, a value net, RL self-play, and Monte Carlo tree search to beat a top human at Go. What to steal for decision systems that are not board games."
publishedAt: "2026-11-27"
category: "Machine Learning"
tags:
  - Machine Learning
  - Reinforcement Learning
  - Search
  - Research
sources:
  - title: "Mastering the game of Go with deep neural networks and tree search"
    author: "David Silver et al."
    publisher: "Nature 2016"
    url: "https://www.nature.com/articles/nature16961"
---

Go's branching factor made brute-force search look hopeless. AlphaGo's 2016 Nature system did not "just deep learn the policy." Silver and colleagues trained a policy network from human games to predict moves, trained a value network to predict winners, improved a policy with self-play RL, and at match time ran Monte Carlo tree search (MCTS) guided by those nets: the policy biases expansion, the value (and rollouts, in that version) evaluates leaves. The match against Lee Sedol was a systems demo of *search plus learned priors*, not of a single forward pass.

AlphaGo Zero later dropped human SL. The 2016 paper is still the clearer engineering story for mixed imitation, value, and search. If you only remember "AI beat Go," you will try to copy a policy net into a domain that needed the tree.

## Search is the product at decision time

The trained nets are fast heuristics. MCTS spends test-time compute to clean up. That split is the borrow for compilers, chip placement, theorem proving, and some robotics stacks: learn a cheap prior, search when the stake is a move. If you cannot search (10 ms hard realtime with no simulator), you are in a different paper. If you can simulate, not using search is leaving Elo on the table.

Self-play needs a closed, perfect-information game with a clear winner. Customer support is not that. Imitation plus a value head without a legal simulator will not yield AlphaGo. The environment is the unstated eighth author.

## Multiple networks, multiple failures

SL policy can clone human conventions (including mistakes). RL can find stronger, uglier moves. Value can be miscalibrated in rare board patterns. MCTS hyperparameters (simulations per move) are a strength slider you will pay for in GPUs. Match conditions (time control) are part of the system. Quoting "superhuman" without the search budget is marketing.

## A worked non-game transfer

You have a warehouse robot with a decent simulator. Imitate operator trajectories (SL policy), learn a value for "task success within timeout," run a short-horizon tree of macro-actions at decision points. If the simulator is wrong about friction, search amplifies the lie. Invest in the model of the world as much as in the net. That is AlphaGo's real lesson for industry.

## Failure modes

**Policy-only serving** when the paper's strength was MCTS.

**Self-play in a misspecified MDP** (reward hacking).

**Using human SL forever** so the agent never exceeds the demonstrator.

**Ignoring compute at test time** in a bake-off against a system that searched 100k nodes.


## Evaluation protocol is part of strength

Elo depends on time control, hardware, and whether the opponent is another searcher. A policy-net-only bot is a different system than the Nature match stack. When you analogize to your domain, write the test-time compute in the SLA. A nightly batch job can afford 10,000 simulations; an interactive tool may afford 50. Train the nets for the budget you will actually run, or you will overfit to an MCTS that production turned off. Self-play logs should be sampled like production traffic: the ugly games are where the value net is lying.

## What you can borrow

- Combine a learned policy prior, a learned value, and test-time search when you have a simulator and a discrete action tree.
- Use human data as a bootstrap, not as a ceiling, if self-play is valid.
- Treat search budget as a first-class performance axis.
- Do not AlphaGo a problem without a faithful environment model.
- Skip MCTS when you must emit an action in one forward pass; train that policy honestly for that constraint.
