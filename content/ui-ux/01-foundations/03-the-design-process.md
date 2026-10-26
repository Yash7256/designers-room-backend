# The design process, start to finish

*The loop designers actually use, without the poster version.*

## TL;DR

The design process is not a straight line. It is a loop: understand, define, sketch, test, refine. You move back and forth as you learn. The goal is not to follow the steps perfectly. The goal is to reduce uncertainty before you spend too much time polishing the wrong thing.

---

## Chapter 1: Understand the problem before you solve it

The first move is not to open a design tool. It is to understand what is actually going on.

### Start with the person and the situation

A useful way to begin:

- Who is this for?
- What are they trying to do?
- Where are they when they do it?
- What happens today when they try?
- What does "better" look like for them?

You do not need a formal research study to answer these. You need to be specific.

### Look for the real problem

People often describe a solution when you ask them about a problem.

"I need a button here" might mean:
- I could not find the action.
- I did not know it was allowed.
- I was afraid it would do something wrong.
- I expected it in a different place.

If you design the button, you might solve the wrong problem. If you ask why, you might find that the person needs a clearer label, a confirmation, or a different flow entirely.

### Collect constraints early

Constraints are not obstacles to design. They are the material.

Ask:

- What must be true for this to ship?
- What can we not change?
- What is the deadline?
- What does the business need?
- What does the technical system allow?

A design that ignores constraints is a sketch of a wish.

---

## Chapter 2: Define the problem in a way you can test

"Define" does not mean writing a long document. It means turning a vague mess into a specific problem.

### A useful problem statement

A problem statement should be specific enough to guide decisions and open enough to allow multiple solutions.

Example:

> New users abandon onboarding because they do not understand why we need their company size, and the form gives no explanation until after they submit.

That statement tells you:
- Who: new users.
- When: onboarding.
- What: abandonment.
- Why: unclear value and late explanation.

It does not tell you the solution. Good.

### Write down your assumptions

Every problem statement contains assumptions. List them.

- We assume company size is required at this step.
- We assume users do not know why we ask.
- We assume the explanation is missing, not just hard to find.

Then decide which assumptions are worth testing first.

### Set a success signal

What would tell you the problem is smaller?

- Fewer people drop off at this step.
- Fewer support messages about company size.
- More people finish onboarding without asking for help.
- People can explain why the field exists.

A success signal keeps you honest. It also makes it harder to fall in love with a solution that looks nice but does not help.

---

## Chapter 3: Sketch and test before you polish

This is where most beginners spend too little time and too much time at once.

Too little time exploring. Too much time polishing the first idea.

### Diverge before you converge

Generate more than one option. Not because you will use them all, but because the second and third options teach you what the first one assumed.

Try:

- The simplest possible version.
- The version for the busiest person.
- The version for the most anxious person.
- The version that removes a step entirely.

You are not looking for the prettiest sketch. You are looking for the idea that best answers the problem.

### Choose the cheapest useful test

You do not need a polished prototype to learn something.

- A paper sketch can test whether the flow makes sense.
- A clickable low-fidelity prototype can test whether people find the next step.
- A single screen with real copy can test whether the words are clear.
- A conversation with five people can test whether the problem is real.

Match the fidelity to the question. If you are testing the flow, do not spend a day on the shadow.

### Watch what people do, not just what they say

When someone says "this is clear," ask them to use it. When they hesitate, that is data. When they click the wrong thing, that is data. When they ask a question you thought the screen answered, that is data.

Do not defend the design during the test. You are there to learn.

---

## Chapter 4: Refine, ship, and learn again

The process does not end when the design is approved. It ends when the problem is smaller.

### Refine the smallest useful thing

After testing, you will have a list of issues. Not all of them matter equally.

Prioritise:

1. Problems that block the main task.
2. Problems that cause fear or mistrust.
3. Problems that create extra work for support.
4. Problems that are annoying but survivable.

Fix the blockers first. Polish later.

### Handoff is part of design

A design is not finished when the file looks good. It is finished when the team can build it and the person can use it.

Good handoff includes:

- The states: empty, loading, error, success, disabled.
- The edge cases: long names, no data, slow network.
- The intent: why this layout, what should happen on tap.
- The constraints: what can change and what cannot.

### Measure the outcome

After launch, ask:

- Did the success signal move?
- What did we learn that we did not know before?
- What would we do differently next time?

If the answer is "nothing," you probably did not define a testable problem.

### The loop continues

The process is not a certificate. It is a habit.

Understand → define → sketch → test → refine → ship → learn → understand again.

You will be better at some steps than others. That is fine. The goal is to notice which step you skip.

---

## Common mistakes

**Mistake 1: Falling in love with the first idea.** The first idea is a starting point, not a verdict.

**Mistake 2: Skipping definition.** Without a clear problem, every critique becomes a matter of taste.

**Mistake 3: Testing too late.** Polishing before testing makes feedback expensive and personal.

**Mistake 4: Testing the wrong thing.** A beautiful prototype cannot tell you whether the flow makes sense if the flow is already assumed.

**Mistake 5: Treating launch as the finish line.** The real learning often starts after launch.

---

## Try it

Pick one screen you use daily. Run the loop on paper:

1. What problem does this screen solve?
2. Who has that problem?
3. What is one assumption the screen makes?
4. Sketch two different ways to solve it.
5. Ask someone which one they would try first, and why.

That is the process. It does not need to be bigger than that to be real.
