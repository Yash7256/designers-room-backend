# Grids & spacing

*Why some screens feel off, and how invisible guides fix it.*

## TL;DR

A grid decides where things can go. A spacing scale decides how far apart they sit. Pick both once and your layouts stop feeling random.

---

## Chapter 1: Why does it look off? (It's the gaps)

You have seen a screen and thought "something's off", but could not say what. The colors were fine. The text was fine. The buttons were fine. Nine times out of ten, it is the spacing: 13 pixels here, 22 there, 9 somewhere else.

Our eyes are excellent at noticing inconsistency, even when we cannot explain it. That is why messy gaps feel cheap and consistent ones feel professional. The content can be identical. The feeling changes because the distances change.

This is frustrating for beginners because spacing is invisible until it is wrong. Nobody praises a 24-pixel gap. But everybody feels a page where every gap is a different number.

### The problem with choosing every gap by hand

When you place each element by eye, you make the same decision fifty times. Should this be 18 or 20? Is this close enough? By the end, you have fifty slightly different answers and no rule.

A system fixes that. Instead of deciding every gap from scratch, you decide a small set of allowed distances once. Then you reuse them.

In real life: think of a thali. Every compartment has a fixed place and a consistent size. Nobody reads a rulebook, but you instantly know where the dal goes. A grid does the same thing for a screen.

---

## Chapter 2: The grid: columns, gutters and margins

A layout grid is a set of invisible guides that your content snaps to. It has three parts.

- **Columns:** vertical slices of the page. Content spans one or more columns.
- **Gutters:** the gaps between columns, so things do not touch.
- **Margins:** the space between your content and the edge of the screen.
- **Snapping:** placing things on the grid so edges line up without you having to eyeball it.

Columns are the structure. Gutters keep the structure from turning into a wall of touching boxes. Margins give the whole layout room to breathe at the edges.

### Why 12 columns?

A 12-column grid is popular on desktop because 12 divides neatly into halves, thirds, quarters and sixths. You can build a two-column layout, a three-column card row, or a layout where the main content takes eight columns and the sidebar takes four.

Phones often use fewer columns, like 4. That is a common choice, not a rule. The right number is the one that makes your content easy to place.

These are common choices, not laws. A marketing page might use 6 columns. A dashboard might use 16. The grid exists to help you make decisions, not to win an argument.

### Turning on a grid in Figma

In Figma you can turn on a layout grid on any frame. Set the count, the gutter and the margin. Then place elements so their edges sit on the columns.

You do not have to fill every column. Empty columns are allowed. The grid is a set of guides, not a cage.

The real benefit is not that the screen looks "gridded". It is that you stop nudging things by one pixel and hoping.

---

## Chapter 3: A spacing scale: choose your gaps once

Instead of picking a new gap every time, choose a small set of allowed values and only use those. This is called a spacing scale.

Many designers use multiples of 8: 8, 16, 24, 32, 48, 64. Sometimes they add 4 for tiny gaps. It is a habit, not a law, but it works well for three reasons:

1. **Fewer decisions.** You do not have to invent a number for every gap.
2. **Consistent results.** The same relationship gets the same distance.
3. **Easy handoff.** Developers can turn your values into variables instead of guessing.

### A simple three-step scale

1. **Small gap (about 8):** between things that belong together, like a label and its field.
2. **Medium gap (about 16 to 24):** between groups inside a card.
3. **Large gap (about 32 and up):** between sections of a page.

That is enough for most screens. You can add a 4 for icon-to-label gaps and a 48 or 64 for big section breaks. What matters is that the list is short and you stick to it.

### The one rule that makes it work

Space inside a group should be smaller than the space around it. That is what tells people "these things belong together".

A label sits 8 pixels from its input and 24 pixels from the next field. The eye reads the pair instantly. If every gap is 16, the label could belong to the field above or below. The person has to think.

Spacing is not decoration. It is grouping.

---

## Chapter 4: White space is not wasted space

When a screen feels cramped, beginners often squeeze in more: more text, more boxes, more dividers. The fix is usually the opposite. Give things room.

White space, also called negative space, is not empty. It is what lets the important things stand out. A headline with room around it feels confident. A button with space around it is easier to find. A form with generous gaps is easier to complete.

### Do not be afraid of scrolling

People scroll all the time. A calm screen that scrolls beats a crowded screen that does not. The fold is not a deadline. It is just a line in the viewport.

If you are debating whether to add another divider line, try adding space instead. Dividers add visual noise. Space adds clarity.

### White space is also a layout tool

Space can separate sections without a border. It can group a title with its paragraph without a box. It can make a primary action feel primary without making it bigger.

When in doubt, add space instead of another divider line.

---

## Common mistakes

**Mistake 1: Eyeballing every gap.** Your eye is good at spotting inconsistency and bad at producing consistency. Use a scale.

**Mistake 2: Using ten different spacing values on one screen.** A scale with ten values is not a scale. It is a list of exceptions.

**Mistake 3: Cramming everything in to avoid scrolling.** Scrolling is normal. Squeezing is not.

**Mistake 4: Treating the grid as a prison.** Break it on purpose, but rarely. If everything is off-grid, the grid is not doing its job.

**Mistake 5: Making every gap the same.** Equal spacing between everything means nothing is grouped. Vary the gap to show relationships.

---

## Try it

In Figma, make a frame 1440 wide and turn on a 12-column layout grid.

- [ ] Place three cards so each snaps to the grid.
- [ ] Set every gap to 24.
- [ ] Change one gap to 17 and notice how wrong it feels. That feeling is your eye learning.

Then set the gaps back to 24 and compare the two versions side by side. The difference is small in numbers and large in feeling.
