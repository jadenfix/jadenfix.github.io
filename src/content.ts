// Everything the site says lives here. Numbers are taken from the repos they
// describe; keep them in sync with the GitHub profile README.

export const links = {
  github: 'https://github.com/jadenfix',
  linkedin: 'https://linkedin.com/in/jadenfix',
  email: 'mailto:jadenfix123@gmail.com',
  renderer: 'https://github.com/jadenfix/jadenfix/blob/main/scripts/blackhole.py',
  constellation: 'https://github.com/jadenfix/jadenfix/blob/main/scripts/constellation.py',
};

export type Role = {
  dates: string;
  org: string;
  href?: string;
  tag?: string;
  title: string;
  body: string;
  current?: boolean;
};

export const roles: Role[] = [
  {
    dates: 'Oct 2026 – now',
    org: 'AfterQuery',
    href: 'https://www.afterquery.com',
    title: 'Software Engineer, Platform & Applied AI',
    body: 'Building the post-training data and RL environments frontier models learn from.',
    current: true,
  },
  {
    dates: 'Jun – Oct 2026',
    org: 'Scale AI',
    href: 'https://scale.com',
    title: 'Software Engineer, Agents',
    body: 'Enterprise AI team: generative AI infrastructure and agents on Kubernetes and GCP.',
  },
  {
    dates: 'Jun 2025 – Jun 2026',
    org: 'Roe',
    href: 'https://www.roe-ai.com',
    tag: 'YC',
    title: 'Founding Engineer, then Head of AI Agent Engineering',
    body: 'Production agents for ERP, fraud and compliance work, deployed at banks and Fortune 500 companies in the cloud and on-prem. Wrote the company’s Go SDK.',
  },
  {
    dates: 'Aug 2024 – Jul 2025',
    org: 'Sturdy',
    title: 'Engineer, contract',
    body: 'An AI customer-intelligence platform, built in Go.',
  },
  {
    dates: '2024 – 2025',
    org: 'Cal Poly, San Luis Obispo',
    title: 'M.S.',
    body: 'Came to software through economics and statistics. My undergrad thesis on forecasting bear markets won the Adam Smith Award.',
  },
];

export type Paper = {
  kind: string;
  title: string;
  body: string;
  links: { label: string; href: string }[];
};

export const papers: Paper[] = [
  {
    kind: 'Paper · 2026',
    title: 'Branch-Aware Hindsight Credit Assignment for LLM Agents',
    body: 'Outcome-only credit pays every step of a winning episode the same, so a step that does nothing earns as much as the step that wins, and doing nothing never fails. I call this loop-action bias. On a controlled benchmark, policies trained this way did worse than the prompted baseline (0.24 vs. 0.79 success); scoring each step by what it actually changed brought success to 1.00. On real ALFWorld, branch-aware scoring separates 2.6 to 9.4 times more states than outcome-only, and the gap is widest for the weaker model.',
    links: [
      { label: 'Paper', href: 'https://github.com/jadenfix/CreditAssignment/blob/main/paper/main.pdf' },
      { label: 'Code', href: 'https://github.com/jadenfix/CreditAssignment' },
    ],
  },
  {
    kind: 'In progress',
    title: 'Critique-Transport Smoothing',
    body: 'Can optimal transport toward a critique beat GRPO with a verifier on long-horizon math and code? A JAX framework on Tunix and MaxText, with a harness that refuses to launch unless every baseline gets the same budget.',
    links: [{ label: 'Code', href: 'https://github.com/jadenfix/CreditAssignment-LongHorizon' }],
  },
  {
    kind: 'Thesis · Adam Smith Award',
    title: 'Predictive Stochastic Modeling for Financial Markets',
    body: 'Calling S&P 500 bear markets with Bayesian Markov-switching models and macro-financial indicators.',
    links: [
      {
        label: 'Thesis',
        href: 'https://github.com/jadenfix/Predictive-Stochastic-Modeling-for-Financial-Markets-/blob/main/Predictive_Stochastic_Modeling_for_Financial_Markets.pdf',
      },
      { label: 'Code', href: 'https://github.com/jadenfix/Predictive-Stochastic-Modeling-for-Financial-Markets-' },
    ],
  },
];

export type Layer = {
  label: string;
  items: { name: string; href?: string }[];
  body: string;
};

export const tempera: Layer[] = [
  {
    label: 'See and act',
    items: [{ name: 'tempo', href: 'https://github.com/jadenfix/tempo' }],
    body: 'A browser built for models, not people. Ranked, stable-ID, diff-able page state instead of screenshots; anything derived from a page is tainted and pushed into the sandbox. About 99k lines of Rust across 29 crates.',
  },
  {
    label: 'Run safely',
    items: [
      { name: 'cradle', href: 'https://github.com/jadenfix/cradle' },
      { name: 'tempOS', href: 'https://github.com/jadenfix/tempOS' },
      { name: 'temp.js', href: 'https://github.com/jadenfix/temp.js' },
    ],
    body: 'A capability sandbox where every unproven lane fails closed. Authority, policy and hash-chained receipts at the OS layer. V8 and CPython embedded in one Rust host.',
  },
  {
    label: 'Remember and improve',
    items: [
      { name: 'remi', href: 'https://github.com/jadenfix/remi' },
      { name: 'Palette', href: 'https://github.com/jadenfix/palette' },
    ],
    body: 'Bitemporal memory that answers with provenance and flags contradictions. An eval gate with its own statistics engine (BCa bootstrap, CUPED, exact McNemar, confidence sequences) that answers pass, fail, or inconclusive.',
  },
  {
    label: 'Connect',
    items: [{ name: 'MCP' }, { name: 'workflows' }, { name: 'LLM gateway' }, { name: 'auth' }],
    body: 'A typed Rust MCP framework and gateway benchmarked on 44k-tool retrieval, a deterministic workflow engine, an LLM gateway that reserves budget before every call, and one OAuth 2.1 issuer across the platform.',
  },
  {
    label: 'Settle',
    items: [{ name: 'Arrha', href: 'https://github.com/jadenfix/arrha' }, { name: 'payments' }],
    body: 'A Rust L1 with HotStuff and VRF consensus, BLS batch verification, KZG and a TLA+ spec, about 1,600 tests. Payment orchestration on a double-entry journal.',
  },
  {
    label: 'Reach',
    items: [{ name: 'SDK', href: 'https://github.com/tempera-dev/tempera-sdk' }, { name: 'iOS' }, { name: 'Android' }],
    body: '616 typed operations across 20 products, generated into SDKs for 7 languages from each product’s OpenAPI contract. Native iOS and Android apps.',
  },
  {
    label: 'Domains',
    items: [{ name: 'math' }, { name: 'bio' }, { name: 'CAD' }, { name: 'materials' }, { name: 'risk' }],
    body: 'Domain packs on the same stack, including math results checked in Lean 4.',
  },
];

export const upstream = [
  { repo: 'wild-linker/wild', title: 'Mach-O: emit LC_RPATH load commands', href: 'https://github.com/wild-linker/wild/pull/2679' },
  { repo: 'Farama-Foundation/Gymnasium', title: 'Return False for ragged MultiBinary and MultiDiscrete inputs', href: 'https://github.com/Farama-Foundation/Gymnasium/pull/1753' },
  { repo: 'Farama-Foundation/Minigrid', title: 'Fix MissionSpace validation with overlapping placeholders', href: 'https://github.com/Farama-Foundation/Minigrid/pull/525' },
  { repo: 'NovaSky-AI/SkyRL', title: 'Fix the skycap format spec where it disagrees with the writer', href: 'https://github.com/NovaSky-AI/SkyRL/pull/2425' },
  { repo: 'harbor-framework/harbor', title: 'Fail broken Daytona snapshot builds fast instead of timing out', href: 'https://github.com/harbor-framework/harbor/pull/3494' },
  { repo: 'roe-ai/roe-golang', title: 'The complete Go SDK, +6,136 lines', href: 'https://github.com/roe-ai/roe-golang/pull/1' },
];

export const commits = [
  { sha: '40210c7', repo: 'arrha', text: 'Batch-verify BLS signatures with blst multi-pairing', href: 'https://github.com/jadenfix/arrha/commit/40210c7' },
  { sha: '8618e7a', repo: 'arrha', text: 'Constant-time audit of the VRF and KES code', href: 'https://github.com/jadenfix/arrha/commit/8618e7a' },
  { sha: 'e07d8a7', repo: 'palette', text: 'A CI gate that’s allowed to say inconclusive, and how many more cases it needs', href: 'https://github.com/jadenfix/palette/commit/e07d8a7' },
  { sha: '2df8415', repo: 'rusty', text: 'Editing the test guard to pass is a fail, not a pass', href: 'https://github.com/jadenfix/rusty/commit/2df8415' },
  { sha: 'ad8e6d7', repo: 'spacewind', text: 'Fix the plasma solve where the electric field crosses zero', href: 'https://github.com/jadenfix/space-simulation-engine/commit/ad8e6d7' },
];
