---
title: Ks all the way down
date: 2026-10-18
summary: Two new grads, same major, same year. One signs for $480k, the other sends four hundred applications. The new-grad market is K-shaped, and so is every level above and below it. A small model of how the Ks compound, and what it's doing to San Francisco.
read: 9 min
---

Two new grads, same major, same year. One signs an offer from an AI lab or a trading firm worth more than most of their professors make. The other sends four hundred applications for entry-level analyst roles and hears back from six. Both did what they were told. They're in the same job market on paper and in two different ones in reality.

People call this K-shaped: one arm going up, the other going down, from the same starting point. What I keep noticing is that it isn't one K. It's a K inside a K inside a K, and the way they stack is the most important thing about them.

## The floor hasn't moved

Start with the boring middle, because that's where most people are. The New York Fed tracks the median wage of recent college grads, ages 22 to 27, working full time. In real terms, meaning adjusted for what money actually buys:

| year | median recent-grad pay, in 2026 dollars |
|---|---|
| 1990 | $60,000 |
| 2000 | $57,900 |
| 2010 | $58,500 |
| 2019 | $58,500 |
| 2025 | $61,900 |

Thirty-five years, roughly flat. The paycheck number went up from about $24k to $60k, and prices went up with it. Computer science is better off: NACE projects a $81,535 starting base for the class of 2026, and the NY Fed puts early-career CS pay at $87k. But "starting salary in the seventies or eighties" has been the story for a long time while rent, tuition and everything else ran ahead.

## The ceiling has

Now the other arm. Entry-level software engineer pay on Levels.fyi, total comp, self-reported:

| company | entry-level total comp |
|---|---|
| Citadel | $502k |
| Anthropic | $483k |
| Hudson River Trading | $410k |
| Jane Street | $370k |
| OpenAI | $249k |
| Google | $214k |
| Meta | $187k |
| JPMorgan | $113k |
| Ford | $97k |

(Self-reported medians at each company's lowest listed level, so a few of these may include people a year or two in.)

A software engineer at Ford and one at a top trading firm hold the same job title and the same degree, and one makes about five times the other in year one. Not long ago the spread between a solid enterprise job and a hot startup was a nice-to-have. Now "software engineer" isn't a salary. It's a distribution with a very long right tail.

## The timeline isn't the population

Here's the survivor bias. On X it looks like every CS kid grinds LeetCode, interns at a FAANG by junior year and signs a big offer. The US produces about 110,000 CS bachelor's degrees a year. LinkedIn found 55% of CS grads from 2023 and 2024 started in roles other than software engineering. SignalFire estimated new grads were about 7% of Big Tech hires, with new-grad hiring down roughly half from before the pandemic. And in the NY Fed's latest numbers, computer science has a 7.0% unemployment rate and computer engineering 7.8%, higher than art history at 6.7%.

The people you see posting offers are real. They're also the top of a very tall K, and the timeline only shows you the arm that's going up.

## The other arm

I watched this up close in my master's. People in my program were smart and did everything right, and still couldn't land entry-level data science or analytics roles, or white-collar work at all. They weren't failing at anything. They were applying into a funnel where a thousand applicants hit the same posting, a screener reads them before a person does, and the junior tasks the job used to be built from are exactly the ones a model now does first. That's the [hiring slowdown for young workers](#/blog/productivity-and-the-missing-plugs) the research keeps finding, seen from the inside. It's a hard place to stand, and the people standing there deserve a lot more sympathy than the timeline gives them.

The typical profiles on each arm are not about worth. Upper arm: a top program or some unusual proof of skill, like research, open source or competition results, an internship early, a city where the jobs are, and someone who'll vouch for you. Lower arm: a strong student at a school recruiters don't visit, a degree aimed at the entry-level work AI touches first, applications through portals, and nobody inside to forward a name. Same effort, different starting branch.

## Ks inside Ks

Zoom out and the same shape repeats at every level. Here's one path, from the world's median income down to an entry-level offer at an AI lab:

| step | income | jump |
|---|---|---|
| world median, per person | $3,440 | |
| US median, per person | $26,300 | 7.7x |
| US median full-time worker | $66,620 | 2.5x |
| early-career CS grad | $87,000 | 1.3x |
| US entry-level software engineer | $155,000 | 1.8x |
| Google, entry level | $214,000 | 1.4x |
| Anthropic, entry level | $483,000 | 2.3x |

(The first two rows are in purchasing-power dollars and the rest are US dollars, so read it as a shape, not an exact ledger.) No single jump is enormous. Multiply them and the top is about 140 times the world median. That's how a top earner at an AI lab gets there: the top arm of the country K, the region K, the city K, the industry K, the niche K, the company K and the role K, one after another.

To see what that does, I wrote a toy. Seven levels, each one a K whose upper arm pays some multiple of the lower arm. Two things fall out.

**Small widenings compound.** If each K pays 1.5x on the upper arm, someone on the top of all seven makes 17 times someone on the bottom of all seven. Widen every K by just 13%, to 1.7x, and that spread becomes 41 times. Nobody's K got dramatically wider. They all got a little wider, and the product exploded.

**Persistence empties the middle.** The Ks aren't independent coin flips. Landing on an upper arm makes the next upper arm likelier: a good school gets you the internship, which gets you the job, which gets you the city. In the model, that persistence is the whole story:

| how much one K predicts the next | on the top arm of every K | their share of all income | in the middle |
|---|---|---|---|
| not at all | 0.8% | 4% | 55% |
| moderately | 5.9% | 24% | 37% |
| strongly | 18.9% | 57% | 22% |

As advantage starts to predict advantage, the middle hollows out and the top takes most of the income. That's what a K-shaped economy looks like from a distance: not a few lucky people, but many small branchings that keep sorting people the same way.

## Why the top pays so much

From inside an AI lab, the math is simple. Scale VP surveyed startups in 2026 and found they spend about $1,040 a month per engineer on AI coding tools on average, with a small share of companies spending over $2,000. The engineer costs $20k to $40k a month or more. When one person directing agents can do what a team used to, the expensive thing is judgment, and paying a lot for the best judgment is the cheap decision.

That also means fewer seats. Jobs in computer systems design are down about 5% since late 2022, and the information sector about 11%, while tech layoffs ran past 120,000 in both 2025 and the first eight months of 2026. Meanwhile the total number of software developers grew, from 1.53 million to 1.69 million, because the work spread into every industry. The work is everywhere. The pay is concentrating.

## San Francisco, where the Ks land

SF is where this is easiest to see. Information and professional services are 27% of jobs in the city. Average pay in the information sector is $376k, and in computer systems design $501k. In accommodation and food it's $49k. Since 2019, the city has lost 32% of its retail jobs and 23% of its restaurant and hotel jobs, and its population is down 6% since 2020.

Here's what that means for a family of four, two parents and two kids, one in childcare, paying the median $6,020 a month for a two-bedroom. I took federal and California taxes, rent, childcare after SF's own subsidies, health insurance, and a flat $30k for food, transit and everything else:

| household income | take-home | childcare after subsidy | left after essentials |
|---|---|---|---|
| $60,000 | $57,080 | $0 | −$51,010 |
| $70,000 | $64,062 | $0 | −$45,028 |
| $120,000 | $101,203 | $0 | −$7,887 |
| $250,000 | $180,099 | $13,188 | +$57,821 |

The $120k family is about $37k a year better off than the $70k family and about $66k worse off than the $250k one. It lives a lot closer to the first. California agrees: by the state's 2026 limits, $120k for a family of four in SF is officially "low income," the line sits at $168,100, and MIT's living wage for this family is $203,808. SF's free childcare runs all the way to $178,300, which is generous, and it's also a sign of how far up the middle has been pushed. In practice nobody in the first three rows pays market rent for long. They double up, commute in from far away, or leave.

So the city sorts. The people who make a place worth living in, cooks, teachers, nurses, artists, builders and the person who runs the corner store, get priced to the edges. A 2015 survey of SF artists found more than 70% had been or were being displaced, and that was before this cycle. Construction and retail run on workers who commute in. Do we want a city that's 100% tech workers? I don't think even the tech workers do. Most of us came for a city, not a campus.

## Where is it okay to fall?

Nobody lands on the upper arm of every K, so the useful question is which ones you can afford to fall on.

The model gives a clean answer. Falling on a K costs you a multiplier, but a multiplier is survivable. Falling on a K that changes your odds on the next Ks compounds. Living in Oakland instead of SF costs you a branch. In the model, someone who took the upper arm on five of seven Ks still out-earns about three quarters of people, and sits less than 3x below the very top. Where you live mostly changes the multiplier. Your first job, how fast you're learning and who will vouch for you change the odds of every K after them.

So fall on the Ks that only cost you money, and fight for the ones that change your odds. Take the cheaper city and keep the steep learning curve. Take the less famous company if the people there will make you better. The ones that compound are the ones to protect, at the top and at the bottom.

The downstream effects worry me more than any one number here: more concentration, a thinner middle, and cities that only work for one arm. Technology has always made some Ks wider. What's new is how many there are and how tightly they stack. I don't think the answer is to pretend the top arm doesn't exist. It's to make the early Ks, school and the first job and the first city, less predictive of the rest, so where you start stops deciding where you end up.

The model and the budget script are in [/data/econ](https://github.com/jadenfix/jadenfix.github.io/tree/main/public/data/econ), with sources.
