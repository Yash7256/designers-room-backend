# Responsive layout

*Design one system that adapts from phone to desktop.*

## TL;DR

A responsive layout bends to fit any screen instead of breaking. Design for the smallest screen first, then let it grow.

---

## Chapter 1: One page, many screens

Think about everywhere your design might be opened: a small phone, a big phone, a laptop, a tablet, a cousin's ancient desktop. A layout that only works at one size is like a glass that only holds one drink.

Responsive design is the opposite. It's more like water: it takes the shape of whatever container it's in. The term "responsive web design" was introduced by Ethan Marcotte in 2010, and it became the standard way to build for the web.

**In real life:** Opening a restaurant's website on your phone and finding a tiny PDF menu you have to pinch and zoom. That's a layout that didn't bend.

---

## Chapter 2: Three ideas that make it work

- **Fluid layouts:** Sizes based on proportions of the screen, not fixed pixels, so things stretch and shrink smoothly.
- **Flexible media:** Images and video that scale down instead of overflowing.
- **Breakpoints:** Screen widths where the layout changes, like one column on a phone and three on a desktop.

Common breakpoints you'll hear about sit around phone, tablet and desktop widths, but they're conventions, not laws. A better rule: when your layout starts looking bad as you widen it, that's where a breakpoint belongs.

---

## Chapter 3: Mobile first

Mobile first means you design the phone version before the desktop version. Why? Small screens force you to decide what really matters. It's much easier to add things as space grows than to squeeze a desktop layout into a phone.

1. **List what matters most.** What must be on this screen? Everything else is optional.
2. **Design the phone layout in one column.** Top to bottom, in order of importance.
3. **Widen it.** At a wider size, add columns and bring in the extras.
4. **Set a maximum width.** On very wide screens, don't let text stretch across the whole page. Remember line length from the Typography page.

---

## Chapter 4: What usually changes between sizes

| | Phone | Tablet | Desktop |
| --- | --- | --- | --- |
| Columns | Often 1 | Often 2 | Often 3 or more |
| Navigation | Bottom bar or menu icon | Either | Top bar or side bar |
| Input | Touch, so bigger tap targets | Touch | Mouse, so hover is possible |
| Content | Only what matters most | A bit more | Room for extras |

These are common patterns, not rules. Your content and your users decide the final answer.

---

## Common mistakes

- Designing for desktop only and shrinking it down
- Fixed pixel widths everywhere
- Hiding content on mobile because it's inconvenient to design
- Testing only on your own phone

---

## Try it (30 min)

- [ ] In Figma, make a frame 390 wide and design a simple list of three cards in one column.
- [ ] Duplicate it, resize the frame to 1440 wide, and rearrange the cards into three columns.
- [ ] Set a maximum width for the text inside each card.
- [ ] Write down what you changed between the two sizes and why.
