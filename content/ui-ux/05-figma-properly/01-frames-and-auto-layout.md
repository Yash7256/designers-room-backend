# Frames & auto layout

*Auto layout makes things resize themselves around their content. Learn it once and you'll stop nudging boxes by hand.*

## TL;DR

Auto layout makes things resize themselves around their content. Learn it once and you'll stop nudging boxes by hand.

---

## Chapter 1: Chat bubbles that grow

Type a longer message in a chat app and the bubble grows to fit. Nobody drags the corner of the bubble. It just adapts to what's inside.

Auto layout is how Figma does that. You tell a frame how to arrange what's inside it, and when the content changes, the frame changes with it.

**In real life:** You've changed one word on a button, then had to resize the button, then move everything under it. Auto layout means you never do that again.

---

## Chapter 2: Frames first

A quick recap from the Setting up Figma page. Auto layout lives on frames, so a good grasp of frames helps.

- **Frame:** A container with a size, like a screen or a card.
- **Child:** Anything inside a frame.
- **Nesting:** Frames inside frames. A button inside a card, inside a list, inside a screen.
- **Naming:** Give every frame a name. "Frame 1243" helps nobody.

---

## Chapter 3: The settings you need

Select a frame, or a few layers, and press Shift + A to add auto layout. Then you'll see a handful of settings.

1. **Direction.** Stack things vertically, or line them up in a row.
2. **Gap.** The space between items. Use values from your spacing scale.
3. **Padding.** The space between the edge of the frame and what's inside it.
4. **Alignment.** Where items sit inside the frame, like left, center or right.

Then there's how each item is sized.

| Setting | What it does | Good for |
| --- | --- | --- |
| Hug contents | Shrinks the frame to fit what's inside | Buttons, tags, labels |
| Fill container | Stretches to fill the space available | Text in a card, a full-width row |
| Fixed | Stays exactly the size you set | Icons, avatars, things that must not change |

---

## Chapter 4: Build a button and a card

1. **Make a button.** Type "Book now", select it and press Shift + A.
2. **Set padding.** About 12 top and bottom and 24 left and right is a good start. Add a fill and rounded corners.
3. **Test it.** Change the text to something longer. The button grows. That's the magic.
4. **Build a card.** Stack an image box, a title, a line of body text and your button in a vertical auto layout.
5. **Set the gap.** Use your spacing scale, like 12 or 16.
6. **Let the text fill.** Set the title and body to fill container, then resize the card and watch the text wrap.

If something won't resize, check whether it's set to Fixed.

---

## Common mistakes

- Nudging things by hand instead of using auto layout
- Setting everything to Fixed
- Leaving frames named "Frame 1243"
- Mixing manually placed items with auto layout in the same frame

---

## Try it (30 min)

- [ ] Build a button with auto layout and test it with short and long text.
- [ ] Build a card with an image box, title, body and button.
- [ ] Add an extra line of text and watch the card grow.
- [ ] Name every frame.
