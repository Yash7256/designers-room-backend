# Constraints & responsive

*Constraints tell elements where to stick when a frame resizes. Together with auto layout, they let one design flex across screen sizes.*

## TL;DR

Constraints tell elements where to stick when a frame resizes. Together with auto layout, they let one design flex across screen sizes.

---

## Chapter 1: The corkboard

Pin a note to the top left of a corkboard. Make the board bigger, and the note stays top left. Pin another to the right edge, and it follows the right edge as the board grows.

Constraints are pins. They tell each element which edges it stays attached to when its parent frame changes size.

**In real life:** A website header with a logo on the left and a menu on the right. Make the screen wider and the logo stays left while the menu follows the right edge.

---

## Chapter 2: The constraint options

Select something inside a frame and look for Constraints in the right panel.

- **Left or Right:** Stay a fixed distance from that side.
- **Top or Bottom:** Stay a fixed distance from the top or bottom.
- **Left and right (or top and bottom):** Stretch as the frame grows.
- **Center:** Stay centered.
- **Scale:** Grow and shrink in proportion to the frame.

Constraints apply to things sitting inside a regular frame. Items inside an auto layout frame follow the auto layout settings instead.

---

## Chapter 3: Constraints vs auto layout

| | Constraints | Auto layout |
| --- | --- | --- |
| Idea | Pin things to edges | Let things flow and resize around content |
| Good for | A fixed header, a corner button, a pinned footer | Lists, cards, buttons, forms |
| Weak at | Content that grows and shrinks | Things that must stay pinned to an exact corner |

Most modern designs use both. Auto layout handles the content. Constraints handle the outer pieces.

---

## Chapter 4: Test by resizing

1. **Build the page with nested auto layouts.** Cards inside a list, inside a frame.
2. **Duplicate the frame at a few sizes**, like 390, 768 and 1440.
3. **Drag the frame's edge and watch what happens.**
4. **Fix what breaks.** Text overflowing, things overlapping, awkward gaps.
5. **Set a maximum width for content** so text doesn't stretch forever, like on the Responsive layout page. Figma has minimum and maximum width settings you can use for this.

---

## Common mistakes

- Setting everything to a fixed size
- Never testing by resizing
- Mixing constraints with auto layout and getting confused
- Building separate screens for every size too early

---

## Try it (25 min)

- [ ] Build a header with a logo on the left and a menu on the right.
- [ ] Resize the frame wider and narrower. Does it behave?
- [ ] Fix anything that breaks.
- [ ] Set a max width on a block of text.
