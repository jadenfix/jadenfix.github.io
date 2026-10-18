---
title: "Critique-Transport Smoothing: Improving Credit Assignment in LLMs via Latent Trajectory Alignment"
date: 2026-10-17
summary: Can a critique that names the wrong steps be turned into a dense training signal, by transporting the model's hidden trajectory toward a critique-edited copy of itself?
status: in progress
---

The question is narrow: does critique-localized latent trajectory alignment improve delayed credit assignment beyond a strong GRPO plus verifier baseline on long-horizon reasoning tasks? If the answer is no, I want the framework to say so cleanly.

## Why outcome-only GRPO struggles

GRPO samples a group of answers, scores each one, and gives every token of an answer the same group-relative advantage. On a 30-step proof or program, one wrong carry at step 9 earns the same penalty as the 29 steps that were fine. The gradient has to find the step that mattered across many samples, and longer horizons need more of them. A natural-language critique often already knows: "steps 9 to 11 carry a wrong partial sum forward." Outcome rewards throw that information away.

## What CTS adds

CTS keeps the GRPO objective and adds an auxiliary loss in latent space. Each training example is a quadruple: prompt `x`, flawed attempt `y0`, critique `f`, corrected revision `y1`.

- Project the hidden states of `y0` into a small trajectory, `R = P_phi(h_1:T)`.
- An energy critic `E_psi(r_t, e_f)` scores each step against the critique embedding. One gradient step down that energy gives a pseudo-target, `R* = R - eta * grad_R U(R, f)`. The edit moves the steps the critique implicates and leaves the rest of the trajectory as its own target.
- Align `R` toward `R*` with an entropic Sinkhorn divergence. Each state gets a time coordinate, `(1 - alpha) * r_t ⊕ alpha * t/(T - 1)`, so the transport plan respects order and a step pays to borrow credit from one far away in time. Unbalanced transport, through OTT-JAX, lets a revision that drops steps shed mass instead of paying to move it.

The full objective is `L = L_GRPO + λ1 * L_align(R, R*) + λ2 * L_decode(y1 | x, y0, f) + λ3 * L_energy`. The decode anchor keeps the latent edits tied to text; the contrastive energy term trains the critic to score failed trajectories above corrected ones.

The demo above runs the alignment term on real artifacts from the repo. The repo's own local command (`cts.train.main method=cts task=fixtures_math backend=local_nano`, two optimizer steps on the five training fixtures) trains the nano-LM, projection, critique embedding and energy critic; the demo then reads out the 86-step trajectory for one failing attempt, the critic's per-step energies, and `R*` from `edit_trajectory`. Your browser solves the Sinkhorn divergence on the full 32-dimensional states, balanced or unbalanced, and checks the loss, plan and per-step gradients against OTT-JAX at 24 settings. What the numbers show is a pipeline close to initialization: the critic's highest energies sit on prompt bytes, the edit is about 1e-4 per step, and the alignment signal is spread evenly rather than on the bytes the revision fixes.

## The experiment

The baseline ladder is fixed in advance: **B0** SFT on revisions, **B1** DPO, **B2** GRPO with outcome-only reward, **B3** GRPO with a verifier, **B4** GRPO with the critique as an extra reward, **B5** CTS. B3 is the bar that matters. Tasks are GSM8K for math and APPS for code, with MBPP for smoke tests. Ablations are single config flips, such as swapping Sinkhorn for L2 or soft-DTW or freezing the energy critic.

Every run in a sweep must share one fairness fingerprint: base checkpoint hash, training tokens, optimizer steps, prompt template hash, decode temperature, verifier, revision budget, and test-time compute. `assert_consistent` refuses to launch a matrix if any cell differs. The code is JAX throughout: a nano model for laptops, Tunix and MaxText for TPUs.

## What is established, and what is not

Established: the losses, methods, and fairness guard are implemented and unit-tested, the OTT-JAX balanced and unbalanced paths are tested, and a two-step CPU run on fixtures shows the CTS update executing end to end with a finite loss. On the latents from that run, the true divergence between `R` and `R*` is about 5e-8, below what the default float32 call with 50 Sinkhorn iterations can resolve (it returns -4.5e-7 here), and at the default epsilon of 0.1 OTT's balanced solver does not reach a 1e-11 tolerance within 20,000 iterations, because the plan is nearly a permutation.

Not established: whether CTS beats B3, or anything else, on GSM8K or APPS. No result in the repo is a paper result. The fixture run uses a tiny randomly initialized model, and the matrix script does not yet evaluate trained checkpoints. Until real checkpoint inference and held-out references are wired up and run, the honest claim is that the experiment is built, not that it has worked.

[Code on GitHub](https://github.com/jadenfix/CreditAssignment-LongHorizon)
