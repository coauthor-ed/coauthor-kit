# Epidemiology: the subject card

Briefs quote this card when the prompt names it. Adds to the kit; a profile card or hard rule wins over it.

1. Notation and units. Counts are whole people. Every rate states numerator, denominator, multiplier and period: "12 new cases per 1,000 person-years", "per 100,000 population per year". Proportions as % or a decimal, said which. Ratios (risk ratio, odds ratio, rate ratio) have no unit and are given to 2 decimal places.
2. Core terms. Incidence (new cases in a period, over the population at risk or person-time) vs prevalence (all existing cases at a point or period, over the whole population). Risk (cumulative incidence) vs rate (per person-time) vs odds (cases over non-cases). Risk ratio = relative risk; say which name the course uses and keep it. Attack rate is a risk, not a rate: say so once.
3. Data conventions. A 2x2 table: exposure in rows (exposed first), outcome in columns (outcome present first), cells a, b, c, d, margins shown. Risk ratio = [a/(a+b)] / [c/(c+d)]; odds ratio = ad/bc. A 95% confidence interval is given with its ratio: "RR 1.8 (95% CI 1.2 to 2.7)". Epidemic curve: cases by date of onset, bars touching, x-axis in days or weeks with the bin width stated, y-axis "number of cases".
4. Misconceptions (each worth a predict slide or a distractor).
   - Prevalence and incidence are the same thing; high prevalence means many new cases.
   - The odds ratio equals the risk ratio (true only when the outcome is rare).
   - A ratio of 1 means "no cases"; a CI that crosses 1 still "shows an effect".
   - Association means causation; a confounder is "just another cause".
   - A case-control study gives incidence or risk directly.
   - A bigger count means a bigger risk (no denominator).
   - An epidemic curve's peak is the day most people were infected.
5. Figures. Epidemic curve: histogram with a time axis (`briefs/stage3/chart.md`, `histogramSvg`). A population with k of n affected: `dotsSvg` (chart.md), never drawn people. 2x2 table: a markdown table, or the kit's Table part when the slide highlights or fills cells (once `briefs/stage3/INDEX.md` lists it). Study design (cohort, case-control, cross-sectional, trial): a flow (`briefs/stage3/boards.md`, FlowBoard). Risk over time or dose: a line trace (chart.md).
6. Questions (`docs/question-bank-generation.md` 3.4, 8.1).
   - Compute a rate, risk, odds, RR, OR or attributable fraction: `numeric-value@1`, unit and denominator in the stem, tolerance per 3.4.
   - Fill a 2x2 table from margins, then RR or OR: `comprehension-set@1`, table recipe (8.1).
   - Read an epidemic curve (peak week, likely exposure window, point vs propagated source): `comprehension-set@1` or `mcq-single@2` with the curve as an `image` or `simulation`, never `graph`.
   - Interpret a CI or a ratio in words: `mcq-single@2` or `semantic-descriptive@1` (rubric points: direction, size, uncertainty, no causal claim).
   - Choose a study design for a question: `mcq-single@2` or `match-categorize@1`.
7. Sources and ethics. Real outbreak and survey data: cite agency, year, report and table (NFHS, IDSP, WHO, a paper). Never real patient names, dates of birth, villages small enough to identify someone, or line lists of real people: aggregate, or label illustrative line lists "Case 1, Case 2". Small cells (fewer than 5) in a real table: say so or merge.
8. Glossary. incidence, prevalence, risk, rate, odds, person-time, risk ratio, odds ratio, attributable fraction, confidence interval, confounding, bias, cohort study, case-control study, cross-sectional study, randomised controlled trial, epidemic curve, attack rate, case definition, population at risk.
9. Make it vivid. Students rate this subject dry; the audience card's Appeal item holds in full. Visual metaphors that work:
   - People before cells: a population of dots that sorts into the 2x2 cells as exposure and outcome are revealed; letters a, b, c, d only after.
   - Direction of inquiry: a timeline the learner scrubs; cohort runs forward from exposure, case-control runs back from disease.
   - A ratio as two bars or two dot groups side by side, the ratio reading large between them; 1.0 as a marked line.
   - Bias as a tilted net: a sample drawn from the town with an adjustable tilt; the ratio drifts from the truth as the tilt grows.
   - Confounding as a split: one crude table splits into strata and the effect shrinks or vanishes in front of the learner.
   - Rare-disease assumption: a slider for how common the outcome is; OR and RR bars drift apart.
   - Outbreaks: an epidemic curve that fills day by day; the learner guesses the exposure window before the reveal.
   - A computed measure (risk, odds, RR, OR, attributable fraction): worked rows with stacked fractions and an entry check (`docs/numericals.md` 2), e.g. `Odds of smoking = 33 / 2 = 16.5`, `OR = (14 x 51) / (9 x 6) = 13.2`. A 2x2 to read by column: `ruleTableHtml` with `pick: 'col'`.
   - Not a scene: a case card that only pins a number the prose states; give it as a takeaway or pull quote.
   Real cases carry the stakes (thalidomide, DES, Snow's pump, smoking and lung cancer): open on the people affected, then the question.
10. Lessons the owner's review taught (analytical-epidemiology, 2026-11):
   - Case-control: the apparent risk 14/(14+8k) changes with the number of controls per case, so it is not a property of the exposure; compare exposure rates (cases vs controls) and the odds ratio, which stay put. Show both live as the control ratio moves, and say it plainly.
   - Exposure rate: define it the first time with the slide's numbers ("14 of 20 cases smoked: 70 per cent").
   - P value: a shuffle test on the slide's own study. People move into new Cases/Controls boxes (each keeps their exposure), the shuffled gap is a subtraction on screen, each gap drops as a dot on a number line with the real gap as a line, then "3 of 100 = 0.03 = P value". Not a histogram of a derived quantity first.
   - A table of a hypothetical town: show how it is built (population, exposed share fixed, risk p and RR x p, then a, b, c, d lettered like the cells), lines updating with the slider.
   - Confounding and matching: one encoding in every view (colour = case, fill = exposure, a corner mark = the confounder); four groups labelled in words with "k of n" shares; matching on the confounder = a good use; matching on the exposure under test = a wrong move, said why ("the study can no longer see it").
   - A running invented case (a plant, a town) uses everyday words that mean one thing: "tank", not "reactor".
   - A detective frame ("Senior investigator", case files) needs a prologue lesson that sets it up; otherwise the role confuses.
