# Grids & spacing

*Why some screens feel off, and how invisible guides fix it.*

## TL;DR

A grid decides where things can go. A spacing scale decides how far apart they sit. Pick both once and your layouts stop feeling random.

---

## Chapter 1: Why does it look off? (It's the gaps)

You've seen a screen and thought "something's off", but couldn't say what. The colors were fine. The text was fine. Nine times out of ten, it's the spacing: 13 pixels here, 22 there, 9 somewhere else.

Our eyes are good at noticing inconsistency, even when we can't explain it. That's why messy gaps feel "cheap" and consistent ones feel "professional". Same content, different feeling.

**In real life:** A thali. Every compartment has a fixed place and a consistent size. Nobody reads a rulebook, but you instantly know where the dal goes. A grid does the same thing for a screen.

---

## Chapter 2: The grid: columns, gutters and margins

A layout grid is a set of invisible guides that your content snaps to. It has three parts.

- **Columns:** Vertical slices of the page. Content spans one or more columns.
- **Gutters:** The gaps between columns, so things don't touch.
- **Margins:** The space between your content and the edge of the screen.
- **Snapping:** Placing things on the grid so edges line up without you having to eyeball it.

A 12-column grid is a popular choice on desktop because 12 divides neatly into halves, thirds, quarters and sixths. Phones often use fewer columns, like 4. These are common choices, not rules. In Figma you can turn on a layout grid on any frame.

---

## Chapter 3: A spacing scale: choose your gaps once

Instead of picking a new gap every time, choose a small set of allowed values and only use those. This is called a spacing scale.

Many designers use multiples of 8 (8, 16, 24, 32, 48, 64), sometimes with 4 for tiny gaps. It's a habit, not a law, but it works well: fewer decisions for you, consistent results, and easy numbers to hand to developers.

1. **Small gap (about 8):** Between things that belong together, like a label and its field.
2. **Medium gap (about 16 to 24):** Between groups inside a card.
3. **Large gap (about 32 and up):** Between sections of a page.

One rule makes all of this work: space inside a group should be smaller than the space around it. That's what tells people "these things belong together".

---

## Chapter 4: White space is not wasted space

When a screen feels cramped, beginners often squeeze in more. The fix is usually the opposite: give things room. White space (also called negative space) isn't empty. It's what lets the important things stand out.

And don't be scared of scrolling. People scroll all the time. A calm screen that scrolls beats a crowded screen that doesn't.

When in doubt, add space instead of another divider line.

---

## Common mistakes

- Eyeballing every gap
- Using ten different spacing values on one screen
- Cramming everything in to avoid scrolling
- Treating the grid as a prison. Break it on purpose, but rarely

---

## Try it (20 min)

- [ ] In Figma, make a frame 1440 wide and turn on a 12-column layout grid.
- [ ] Place three cards so each snaps to the grid.
- [ ] Set every gap to 24.
- [ ] Change one gap to 17 and notice how wrong it feels. That feeling is your eye learning.
