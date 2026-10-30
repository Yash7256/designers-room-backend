# Responsive layout

*Design one system that adapts from phone to desktop.*

## TL;DR

Responsive layout is not one design squeezed into every screen. It is one system that reflows, reprioritises and stays usable as the space changes.

---

## Chapter 1: Responsive is not "make it smaller"

The first instinct is to design for desktop, then shrink everything until it fits on a phone. That produces tiny text, cramped buttons and layouts that technically fit but practically do not work.

Responsive design is about rearranging and reprioritising. The content stays the same. The layout changes to give that content the room it needs.

### The screen is not the design

A screen is just a window into your layout. The same content might appear as:

- Three columns on a wide desktop.
- Two columns on a tablet.
- One stacked column on a phone.

The person is not using "a mobile version". They are using your product in a narrower space, possibly with a thumb, possibly in bright sunlight, possibly while distracted.

### Start with the content

Before you draw boxes, list what the screen must communicate and what the person must be able to do.

Then rank it:

1. What must be visible immediately?
2. What can come after a scroll?
3. What can collapse, move or hide on smaller screens?

If everything is equally important, you do not have a responsive problem. You have a priority problem.

### Mobile first is a useful habit

"Mobile first" means starting with the smallest useful layout. It forces you to decide what matters, because there is no room for everything.

You do not have to work this way forever. But trying it once will expose how much of a desktop layout is optional.

---

## Chapter 2: Breakpoints and constraints

A breakpoint is the width where the layout changes. It is not a device model. It is the point where the current arrangement stops working.

### Let the content choose the breakpoint

A common set of starting points is 640, 768, 1024 and 1280 pixels. Those are conventions, not laws. The right breakpoint is the width where:

- A line of text becomes too long.
- A card row becomes too cramped.
- A sidebar stops fitting.
- A button becomes hard to reach.

Resize the canvas slowly and watch for the moment the layout starts to strain. That is your breakpoint.

### Use the grid, then change the grid

On desktop, a 12-column grid is a common choice. On a phone, 4 columns is a common choice. The grid itself can change at a breakpoint.

What should not change is the logic. Gutters stay consistent. Margins stay intentional. Content still snaps to columns instead of floating by eye.

### Constraints and auto layout are your friends

In Figma, constraints control how a layer behaves when its frame resizes. Auto layout controls how a group of elements stacks, wraps and spaces itself.

Learn a few rules and you stop redrawing every screen:

- Pin navigation to the top or bottom.
- Let text wrap instead of shrinking.
- Let images scale within a frame.
- Let card rows wrap when they run out of room.
- Let a sidebar collapse into a stacked section.

The goal is a file that behaves like the real thing. If resizing a frame breaks the design, the design is not responsive yet.

### Do not design for one exact phone

There are too many screen sizes to design for each one. Design for ranges. Test at a narrow width, a middle width and a wide width. If those work, the in-between sizes usually work too.

---

## Chapter 3: Reflow patterns

Responsive layout is mostly a set of reflow patterns. Learn the common ones and you can adapt almost any screen.

### Stack columns

The most common pattern: a horizontal row becomes a vertical stack. Three feature cards become three stacked cards. A main column and sidebar become one column.

Stacking works because it preserves the content and gives each item the full width. It is usually better than shrinking columns until they are unreadable.

### Reprioritise, do not just move

When a sidebar moves below the main content, ask whether it still belongs there. On mobile, the thing that was secondary on desktop might be the first thing the person needs.

Order is part of responsive design. Do not preserve the desktop order out of habit.

### Change the navigation

Desktop navigation might be a horizontal bar or a sidebar. On mobile, it might become a bottom bar, a menu button or a single primary action.

The right choice depends on how often the navigation is used. A bottom bar is easy to reach with a thumb. A menu hides options until they are needed.

### Turn tables into cards

A wide table rarely works on a phone. Instead of forcing horizontal scrolling, consider turning each row into a card with labelled fields.

The person loses the ability to compare columns at a glance, but gains the ability to read one record comfortably. That is often the better trade.

### Keep text readable

Do not shrink body text to make a layout fit. Let it wrap, reduce the number of columns, or move content below. A responsive layout should not require a magnifying glass.

### Protect touch targets

A mouse can hit a 20-pixel link. A thumb cannot reliably hit one. Give interactive elements enough size and spacing, especially on small screens.

If two actions are close together, increase the gap. A mis-tap is a design problem, not a user problem.

---

## Chapter 4: Test across sizes and states

A responsive layout is not finished when it looks good at three widths. It is finished when it survives real content and real conditions.

### Resize slowly

Drag the frame from wide to narrow and back. Watch for:

- Text that overflows.
- Cards that squash.
- Buttons that wrap badly.
- Images that distort.
- Horizontal scrolling.
- Elements that overlap.

The awkward middle widths are where most responsive bugs live.

### Test the longest content

Real content is messier than placeholder text. Test:

- The longest product name.
- The longest error message.
- A name with no spaces.
- A locale with longer words.
- An empty state.
- A loading state.

A layout that only works with perfect copy is not a layout. It is a demo.

### Test zoom and text size

Zoom the browser to 200%. Check that content still reflows and that nothing important disappears.

People zoom for many reasons: low vision, small screens, tired eyes. A layout that breaks at 200% is excluding them.

### Test with a keyboard and a thumb

Tab through the interface. Can you see where focus is? Can you reach every action?

Then use it one-handed on a phone. Are the main actions within reach? Are destructive actions too easy to hit by accident?

### Test the states, not just the happy path

Responsive design includes:

- Empty states.
- Error states.
- Long lists.
- Loading states.
- Modals and menus.
- Dark mode, if you support it.

A screen that works only with ideal data is not done. The edges are where responsive layout earns its keep.

---

## Common mistakes

**Mistake 1: Designing desktop first, then squeezing.** Shrinking a desktop layout produces tiny text and cramped controls. Reflow instead.

**Mistake 2: Choosing breakpoints from a device list only.** Devices change. Choose breakpoints where your layout actually breaks.

**Mistake 3: Hiding important actions on mobile.** Mobile is not a lesser experience. If the action matters on desktop, it probably matters on a phone.

**Mistake 4: Touch targets that are too small.** A thumb is not a mouse. Give interactive elements enough size and space.

**Mistake 5: Only testing the perfect content.** Long labels, empty states and errors are part of the layout. Test them before you call it done.

---

## Try it

Take one desktop screen you have designed or a screenshot of an app.

- [ ] Sketch a 375-pixel-wide version and a 768-pixel-wide version.
- [ ] Change at least two layout patterns, not just the width.
- [ ] Check the longest label, the empty state and one error state.
- [ ] Test at 200% zoom and look for overlap or horizontal scrolling.

Then compare the three versions. The content should feel like the same product, not three different products that happen to share a logo.
