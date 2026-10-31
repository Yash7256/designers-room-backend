# Mobile vs desktop patterns

*People hold phones with thumbs and use desktops with mice and keyboards. Good patterns respect that.*

## TL;DR

People hold phones with thumbs and use desktops with mice and keyboards. Good patterns respect that.

---

## Chapter 1: One hand, one bus

You're on a crowded bus. One hand holds the pole, the other holds your phone. Which parts of the screen can your thumb reach without stretching? The bottom and the middle. The far top corners are a stretch.

Now picture a desktop. You're seated, using two hands, a mouse and a big screen. Different body, different place, different needs.

**In real life:** This is why many phone apps put their main navigation at the bottom of the screen, where your thumb already is.

---

## Chapter 2: Common mobile patterns

- **Bottom navigation:** A bar with a handful of main destinations. Phone guidelines commonly suggest around three to five.
- **Big tap targets:** Fingers aren't mouse pointers. Platform guidelines commonly suggest targets of roughly 44 to 48 units square. Check the guideline for the platform you're designing for.
- **One main action, within reach:** Put the key button where a thumb can get to it.
- **Simple, stacked layouts:** One column, with less on screen at once. Reveal more when asked, not all at once.

---

## Chapter 3: Common desktop patterns

- **Top bar or sidebar navigation:** More room, so more options can be visible.
- **Hover and keyboard:** Hovering can reveal extra details, but never hide something essential behind hover, because phones can't hover. Keyboard use and tab order matter too.
- **More content at once:** Multiple columns, side-by-side panels. But keep line length comfortable, like on the Typography page.
- **A precise pointer:** Smaller targets work better with a mouse, but don't go tiny.

---

## Chapter 4: Design for both on purpose

| | Phone | Desktop |
| --- | --- | --- |
| Navigation | Bottom bar with a few destinations | Top bar or sidebar |
| Input | Thumbs, big tap targets | Mouse, keyboard, hover |
| Layout | One column, less at once | Multiple columns, more at once |

1. **Start with the phone.** Mobile first, as in Stage 02.
2. **Decide what each screen really needs.** Be strict.
3. **At wider sizes, rearrange.** Don't just stretch the phone layout across a big screen.
4. **Keep behavior consistent.** The same action should work the same way on both.
5. **Read the official guidelines.** Apple's Human Interface Guidelines and Google's Material Design are free and cover this in depth.

These are common habits, not laws. When you're unsure, test it with real people on real devices.

---

## Common mistakes

- Hiding important things behind hover
- Tiny tap targets
- Copying desktop navigation onto a phone
- Forgetting that some people use keyboards

---

## Try it (25 min)

- [ ] Take the home screen of your flow and wireframe it twice: once 390 wide, once 1440 wide.
- [ ] Write down three things you changed between them and why.
- [ ] Check that every tappable thing on the phone version is big enough to tap.
