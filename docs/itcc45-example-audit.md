# ITCC45 example audit

The production portfolio contains 18 examples selected from 24 candidates. The
machine-readable decision record is
[`tests/itcc45-example-audit.json`](../tests/itcc45-example-audit.json).

## Rubric and release rule

Each candidate receives 0 (miss), 1 (partial), or 2 (pass) for concept clarity,
misconception exposure, observable cause and effect, transfer value,
distinctness, and source/diagram readability. A retained example must have no
zero and a total of at least 10/12. Every topic must retain a low-context entry
and a transfer example; a third example is kept only for a distinct, high-risk
misconception.

## Iterations

1. **Baseline shell audit:** the six original engines and examples passed their
   deterministic checks, but several practice misconceptions were absent from
   the synchronized lab: class/instance shadowing, shared mutable class state,
   recursive setters, name-mangling, missing `super()`, abstraction before ABC,
   and type-switching mistaken for polymorphism.
2. **Contrast audit:** optional Attempt/Repair timeline segments and semantic
   concept annotations were added. Error examples remain valid Python programs;
   they catch the expected failure before walking through the repair.
3. **Pruning:** Rectangle, clinic-ticket reassignment, bank withdrawal,
   inheritance Shape, standalone bank-transfer failure, and polymorphic Shape
   candidates were removed because they repeated stronger retained evidence or
   blurred boundaries between topics.
4. **Source/model synchronization audit:** every retained `print()` statement
   now owns an explicit timeline step, rendered output is append-only, and
   object fields appear only after the assignment being explained. The Classes
   introduction separately traces class members, `self` assignments,
   `Student.school`, the `describe()` call and return, and the final print.
   Minimum, midpoint, maximum, and quote-containing inputs are executed for all
   18 activities, so 72 Python programs must match their guided timelines.

## Remaining limits

The scores are a novice-comprehension proxy, not evidence from actual students.
The classroom pilot worksheet should be used before treating timing or wording
as settled. Multiple inheritance, detailed MRO, protocols, dataclasses, and
advanced dunder methods remain deliberately outside this portfolio.
