# Alignment & proximity

*Put related things close together and line things up. That's most of the fix.*

## TL;DR

Put related things close together and line things up. Do just those two and most "messy" screens fix themselves.

---

## Chapter 1: Same stuff, very different cupboard

Two cupboards hold exactly the same clothes. In one, everything is folded by type: shirts here, jeans there. In the other, everything is thrown in. The contents are identical, but only one of them is usable at 8 a.m. when you are late.

Screens work exactly the same way. Often you do not need to change what is on the screen at all. You just need to arrange it.

This is good news. It means "messy" is usually not a content problem, a color problem or a talent problem. It is a grouping problem. The same elements can feel chaotic or calm depending on how close they are and what edges they share.

### Mess is often just missing structure

When a screen feels noisy, look for these signals:

- Everything is the same distance from everything else.
- Edges do not line up.
- Borders are doing the work that space should do.
- Related items are scattered.
- Unrelated items are crowded together.

None of those require new content. They require a few layout decisions.

### Two ideas do most of the work

The Gestalt school of psychology studied how people group what they see. Two of its findings are especially useful for interfaces:

1. **Proximity:** things that are close together look like they belong together.
2. **Alignment:** things that share an edge look related and orderly.

You can use both without adding a single box, line or color.

---

## Chapter 2: Proximity: close means "these belong together"

A group of psychologists in early 20th-century Germany, known as the Gestalt school, studied how people group what they see. One of their findings, usually called proximity, is simple: things that are close together look like they belong together.

This is why a label sits right above its own input field, closer to it than to the field above. If the gaps are equal, people have to guess.

### Distance is a relationship

You are already an expert at this outside design. On a fridge, magnets about the same topic end up clustered. On a desk, the things you use together end up next to each other. Your brain reads distance as meaning.

In an interface, the same rule applies:

- A label belongs to its field.
- A heading belongs to the section below it.
- A price belongs to its product.
- A helper message belongs to the input it describes.

If the spacing does not show those relationships, the person has to reconstruct them. That is friction.

### The gap should tell the truth

A useful pattern is:

- **Tiny gap** inside a single item, like an icon and its label.
- **Small gap** between a label and its field.
- **Medium gap** between fields in the same group.
- **Large gap** between separate groups or sections.

You do not need a different value for every pair. You need the pattern to be consistent enough that the eye learns it quickly.

In real life: a contacts list where each name sits right next to its own number. Space everything out evenly and you would have to guess which number belongs to whom.

### Proximity can replace decoration

When two things belong together, you do not need a border, a background or a divider to prove it. Moving them closer is often enough.

This is why the best forms look simple. They are not missing structure. The structure is in the spacing.

---

## Chapter 3: Alignment: invisible lines

When things share an edge, the eye sees order, even if it cannot say why. When edges wobble by a few pixels, the screen feels slightly off.

Alignment is one of the cheapest ways to make a screen feel intentional. It costs nothing and it removes a whole category of visual noise.

### Pick an edge

Decide which line things will share, usually the left edge. Then commit to it.

A heading, a paragraph, an input and a button can all share the same left edge. The person may not notice the line, but they will feel the calm.

### Align with tools, not eyes

Use Figma's alignment and snapping tools instead of nudging by feel. Your eye can spot a 2-pixel difference, but it cannot reliably produce a 0-pixel difference across a whole screen.

Select the objects, choose the edge, and let the tool do the work. Then stop touching it.

### Keep paragraphs aligned to the start of the line

In languages written left to right, that is left-aligned, which is easiest to read. In right-to-left languages, align to the right. Centered text is fine for short bits like a title.

Do not center a long paragraph. Every line starts in a different place, so the eye has to find the start again each time. The paragraph looks tidy and reads badly.

### What to align to

You do not have to align everything to the page margin. You can align to:

- The page margin.
- A column edge.
- A card's internal padding.
- The start of a label.

What matters is that there is a reason. If two elements share an edge, the person assumes they are related. If they are not related, sharing an edge can be misleading.

---

## Chapter 4: Group with space first, lines and boxes second

Beginners often fix clutter by adding borders around everything. That adds more things to look at. Try space first.

### Boxes everywhere

Every item gets a border or a card. The screen turns into a grid of rectangles and nothing stands out. When everything is enclosed, the enclosure stops meaning anything.

Boxes are not evil. They are just expensive. Each one adds a line, a corner, a shadow and a decision. Use them when you need a hard boundary, not as a default.

### Space as grouping

Small gaps inside a group, bigger gaps between groups. Fewer lines, calmer screen.

A form is a good example. Each label and field sits close together, with a larger gap before the next pair. No boxes needed. The spacing already says "this label goes with this field".

### A simple test

Cover the borders and dividers on your screen. Does the grouping still make sense?

If it does, the space is doing its job. If it does not, the boxes were hiding a layout problem. Fix the spacing first, then add back only the boundaries you still need.

### When a line is useful

Lines are useful when space alone is ambiguous, or when items need to be scanned as separate rows in a dense table. The key is that the line should clarify, not decorate.

If you can remove it and nothing is lost, remove it.

---

## Common mistakes

**Mistake 1: Even spacing between everything.** Equal distance means no grouping. The eye has no clue what belongs together.

**Mistake 2: Center-aligning everything.** Centered text is fine for short titles. For body copy and forms, the uneven starting edge makes scanning harder.

**Mistake 3: Borders around every item.** Too many boxes create noise. Try space before you add another outline.

**Mistake 4: Aligning by eye.** Nudging until it looks right produces edges that are almost aligned. Almost is the problem.

**Mistake 5: Grouping the wrong things.** Proximity is a promise. If two things are close, people assume they are related. Make sure the promise is true.

---

## Try it

In Figma, make a frame with six items: three labels and three input fields, all spaced evenly.

- [ ] Move each label close to its own field, and add a bigger gap between each pair.
- [ ] Align everything to the same left edge using the alignment tools.
- [ ] Compare it with your first version.

Then remove any borders you added. If the form still makes sense, the spacing is doing the work.
