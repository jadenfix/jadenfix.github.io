/**
 * benchmarks/stochastic/v1/tasks.yaml from jadenfix/CreditAssignment, transcribed
 * field for field (train + eval splits). Defaults follow EdgeManifest /
 * StateManifest in src/creditlab/core/manifest_models.py.
 */

export type Edge = {
  next: string;
  obs: string;
  terminal?: boolean;
  success?: boolean;
  progress: number; // progress_delta
  label: string; // branch_label
  deadEnd?: boolean;
  enabling?: boolean;
  recovery?: boolean;
  signals?: Record<string, number>; // verifier_signals
  p?: number; // success_probability (default 1.0)
  failNode?: string; // failure_node (default: stay)
  failObs?: string;
};

export type StateDef = {
  phase: string;
  mode: string;
  progress: number;
  fields: Record<string, string | number>; // abstract_fields
  oracle?: string;
  edges: Record<string, Edge>;
};

export type Task = {
  id: string;
  split: 'train' | 'eval';
  family: string;
  pivotal: string; // metadata.pivotal_branch
  states: Record<string, StateDef>;
};

const done = (family: string, progress: number, mode: 'success' | 'failure'): StateDef => ({
  phase: 'done',
  mode,
  progress,
  fields: { family },
  edges: {},
});

/* ── stochastic gate chain: four gates, each unlock succeeds with p = 0.75 ── */
function gateTask(id: string, split: 'train' | 'eval'): Task {
  const f = 'stoch_gate';
  const g = (gate: number, progress: number, next: string, retreatTo: string | null, extra: Partial<Edge> = {}): StateDef => ({
    phase: 'gate',
    mode: `gate_${gate}`,
    progress,
    fields: { family: f, gate },
    oracle: 'unlock_gate',
    edges: {
      unlock_gate: {
        next,
        obs: `Gate ${gate} opens.`,
        progress: 1,
        label: 'pivotal',
        signals: { gate_progress: 1 },
        p: 0.75,
        failObs: 'The lock resists. The gate stays shut.',
        ...extra,
      },
      rattle_gate: { next: gate === 1 ? 'start' : `gate_${gate}`, obs: 'Rattling does nothing.', progress: 0, label: 'stall' },
      ...(retreatTo
        ? { retreat: { next: retreatTo, obs: `You retreat to gate ${gate - 1}.`, progress: -1, label: 'regression' } }
        : {
            force_gate: { next: 'jammed', obs: 'The gate jams.', progress: -1, label: 'dead_end', deadEnd: true },
          }),
    },
  });
  return {
    id,
    split,
    family: f,
    pivotal: 'unlock_gate',
    states: {
      start: g(1, 0, 'gate_2', null),
      gate_2: g(2, 1, 'gate_3', 'start'),
      gate_3: g(3, 2, 'gate_4', 'gate_2'),
      gate_4: g(4, 3, 'success', 'gate_3', { terminal: true, success: true, progress: 2, label: 'success' }),
      jammed: {
        phase: 'trap',
        mode: 'jammed',
        progress: -1,
        fields: { family: f, gate: 0 },
        oracle: 'reset_gate',
        edges: {
          reset_gate: { next: 'start', obs: 'You unjam and reset.', progress: 1, label: 'recovery', recovery: true, signals: { repair_quality: 1 } },
          give_up: { next: 'failure', obs: 'You give up.', terminal: true, progress: -1, label: 'failure', deadEnd: true },
        },
      },
      success: done(f, 5, 'success'),
      failure: done(f, -2, 'failure'),
    },
  };
}

/* ── stochastic shopping ── */
function shopTask(id: string, split: 'train' | 'eval'): Task {
  const f = 'stoch_shop';
  const s = (phase: string, mode: string, progress: number, sub: string, oracle: string, edges: Record<string, Edge>): StateDef => ({
    phase,
    mode,
    progress,
    // abstract_fields carries its own `phase`, which overrides the node phase in the abstract state
    fields: { family: f, phase: sub },
    oracle,
    edges,
  });
  return {
    id,
    split,
    family: f,
    pivotal: 'search_target',
    states: {
      start: s('browse', 'search', 0, 'search', 'search_target', {
        search_target: { next: 'results', obs: 'Search returns relevant results.', progress: 1, label: 'pivotal', signals: { query_quality: 1 }, p: 0.7, failNode: 'noisy_results', failObs: 'Search returns mostly irrelevant results.' },
        browse_featured: { next: 'start', obs: 'Featured items are irrelevant.', progress: 0, label: 'stall' },
      }),
      noisy_results: s('browse', 'noisy_results', 0, 'noisy_results', 'open_target', {
        open_target: { next: 'product', obs: 'Found the right product in noisy results.', progress: 1, label: 'product_match', signals: { selection_quality: 1 }, p: 0.6, failNode: 'wrong_product', failObs: 'Opened the wrong product.' },
        refine_search: { next: 'start', obs: 'Going back to search.', progress: 0, label: 'recovery', recovery: true },
      }),
      results: s('browse', 'results', 1, 'results', 'open_target', {
        open_target: { next: 'product', obs: 'Opened the correct product.', progress: 1, label: 'product_match', signals: { selection_quality: 1 }, p: 0.85, failNode: 'wrong_product', failObs: 'Opened a similar but wrong product.' },
        refine_search: { next: 'results', obs: 'Refining an already good search.', progress: 0, label: 'stall' },
      }),
      product: s('decide', 'product', 2, 'product', 'add_to_cart', {
        add_to_cart: { next: 'cart', obs: 'Added to cart.', progress: 1, label: 'cart', signals: { cart_quality: 1 } },
        compare_prices: { next: 'product', obs: 'No cheaper options found.', progress: 0, label: 'stall' },
      }),
      wrong_product: s('decide', 'wrong_product', 0, 'wrong_product', 'go_back', {
        go_back: { next: 'start', obs: 'Returned to search.', progress: 0, label: 'recovery', recovery: true, signals: { recovery_quality: 1 } },
        add_to_cart: { next: 'failure', obs: 'Bought the wrong product.', terminal: true, progress: -1, label: 'failure', deadEnd: true },
      }),
      cart: s('purchase', 'cart', 3, 'cart', 'checkout', {
        checkout: { next: 'success', obs: 'Purchase complete.', terminal: true, success: true, progress: 2, label: 'success', signals: { purchase_quality: 1 } },
        continue_shopping: { next: 'start', obs: 'Went back to search for no reason.', progress: -2, label: 'regression' },
      }),
      success: done(f, 5, 'success'),
      failure: done(f, -1, 'failure'),
    },
  };
}

/* ── stochastic navigation ── */
function navTask(id: string, split: 'train' | 'eval'): Task {
  const f = 'stoch_nav';
  const s = (phase: string, mode: string, progress: number, oracle: string, edges: Record<string, Edge>): StateDef => ({
    phase,
    mode,
    progress,
    fields: { family: f, phase },
    oracle,
    edges,
  });
  return {
    id,
    split,
    family: f,
    pivotal: 'navigate_target',
    states: {
      start: s('navigate', 'hallway', 0, 'navigate_target', {
        navigate_target: { next: 'target_room', obs: 'You reach the target room.', progress: 1, label: 'pivotal', signals: { navigation_quality: 1 }, p: 0.8, failObs: 'You take a wrong turn.' },
        navigate_other: { next: 'wrong_room', obs: 'You enter the wrong room.', progress: -1, label: 'dead_end', deadEnd: true },
        look_around: { next: 'start', obs: 'You look around the hallway.', progress: 0, label: 'stall' },
      }),
      wrong_room: { ...s('navigate', 'wrong_room', -1, 'navigate_target', {
        navigate_target: { next: 'target_room', obs: 'You find the correct room.', progress: 2, label: 'recovery', recovery: true, signals: { recovery_quality: 1 }, p: 0.8, failObs: 'Still lost.' },
        wait: { next: 'wrong_room', obs: 'Waiting changes nothing.', progress: 0, label: 'stall' },
      }), fields: { family: f, phase: 'wrong_room' } },
      target_room: s('acquire', 'at_target', 1, 'pick_target', {
        pick_target: { next: 'carrying', obs: 'You pick up the object.', progress: 1, label: 'enabling', enabling: true, signals: { acquire_quality: 1 }, p: 0.85, failObs: 'The object slips.' },
        pick_distractor: { next: 'failure', obs: 'You picked the wrong object.', terminal: true, progress: -1, label: 'failure', deadEnd: true },
        look_around: { next: 'target_room', obs: 'Nothing changes.', progress: 0, label: 'stall' },
      }),
      carrying: s('deliver', 'carrying', 2, 'deliver_target', {
        deliver_target: { next: 'success', obs: 'Object delivered.', terminal: true, success: true, progress: 2, label: 'success', signals: { delivery_quality: 1 }, p: 0.9, failObs: 'Wrong spot.' },
        drop_target: { next: 'target_room', obs: 'You drop the object.', progress: -1, label: 'regression' },
        look_around: { next: 'carrying', obs: 'Looking around.', progress: 0, label: 'stall' },
      }),
      success: done(f, 4, 'success'),
      failure: done(f, -2, 'failure'),
    },
  };
}

/* ── stochastic evidence cascade (train only, as in the manifest) ── */
function cascadeTask(id: string): Task {
  const f = 'stoch_cascade';
  const s = (phase: string, mode: string, progress: number, stage: number, oracle: string, edges: Record<string, Edge>): StateDef => ({
    phase,
    mode,
    progress,
    fields: { family: f, stage },
    oracle,
    edges,
  });
  return {
    id,
    split: 'train',
    family: f,
    pivotal: 'gather_evidence',
    states: {
      start: s('gather', 'stage_1', 0, 1, 'gather_evidence', {
        gather_evidence: { next: 'stage_2', obs: 'First evidence gathered.', progress: 1, label: 'enabling', enabling: true, signals: { evidence_quality: 1 }, p: 0.75, failObs: 'Inconclusive.' },
        review_notes: { next: 'start', obs: 'Notes have nothing new.', progress: 0, label: 'stall' },
        guess: { next: 'failure', obs: 'Guessing without evidence fails.', terminal: true, progress: -1, label: 'premature', deadEnd: true },
      }),
      stage_2: s('gather', 'stage_2', 1, 2, 'gather_evidence', {
        gather_evidence: { next: 'stage_3', obs: 'Second evidence gathered.', progress: 1, label: 'enabling', enabling: true, signals: { evidence_quality: 1 }, p: 0.75, failObs: 'Inconclusive.' },
        review_notes: { next: 'stage_2', obs: 'Nothing new in notes.', progress: 0, label: 'stall' },
        guess: { next: 'weak_answer', obs: 'Partial guess is incomplete.', progress: 0, label: 'premature' },
      }),
      stage_3: s('synthesize', 'stage_3', 2, 3, 'synthesize', {
        synthesize: { next: 'success', obs: 'Correct answer.', terminal: true, success: true, progress: 2, label: 'success', signals: { evidence_quality: 1 }, p: 0.8, failObs: 'Synthesis was flawed.' },
        review_notes: { next: 'stage_3', obs: 'Notes exhausted.', progress: 0, label: 'stall' },
        guess: { next: 'weak_answer', obs: 'Guessing with partial evidence.', progress: 0, label: 'premature' },
      }),
      weak_answer: s('partial', 'weak_answer', 0, 0, 'revise', {
        revise: { next: 'stage_2', obs: 'Revising approach.', progress: 1, label: 'recovery', recovery: true, signals: { repair_quality: 1 } },
        submit_weak: { next: 'failure', obs: 'Weak answer fails.', terminal: true, progress: -1, label: 'failure', deadEnd: true },
      }),
      success: done(f, 4, 'success'),
      failure: done(f, -2, 'failure'),
    },
  };
}

/** Manifest order matters: rollouts cycle tasks[i % len] (RolloutEngine.collect). */
export const TRAIN_TASKS: Task[] = [
  gateTask('stoch_gate_train_01', 'train'),
  shopTask('stoch_shop_train_01', 'train'),
  navTask('stoch_nav_train_01', 'train'),
  cascadeTask('stoch_cascade_train_01'),
];

export const EVAL_TASKS: Task[] = [
  gateTask('stoch_gate_eval_01', 'eval'),
  shopTask('stoch_shop_eval_01', 'eval'),
  navTask('stoch_nav_eval_01', 'eval'),
];

/** Same task with every unlock_gate edge set to probability p (the demo slider). */
export function withGateP(task: Task, p: number): Task {
  const states: Record<string, StateDef> = {};
  for (const [k, st] of Object.entries(task.states)) {
    const edges: Record<string, Edge> = {};
    for (const [a, e] of Object.entries(st.edges)) edges[a] = a === 'unlock_gate' ? { ...e, p } : e;
    states[k] = { ...st, edges };
  }
  return { ...task, states };
}
