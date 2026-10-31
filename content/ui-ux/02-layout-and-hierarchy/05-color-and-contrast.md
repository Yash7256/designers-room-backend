# Color & contrast

*Use color with restraint, and keep every pair readable.*

## TL;DR

Use few colors, give each one a job, and make sure text is easy to read for everyone. Contrast isn't optional.

---

## Chapter 1: Color has jobs

You don't read a traffic light. You obey it. Red, yellow, green each have a job, and nobody needs an explanation. Good interface color works the same way: every color is there for a reason.

1. **Brand.** The color that makes it feel like you. Used for logos, key moments, an accent.
2. **Action.** What you can tap or click. Buttons and links should look consistent so people learn them once.
3. **Status.** Success, warning and error. These carry meaning, so keep them consistent.
4. **Neutrals.** Text, backgrounds, borders. This is most of your screen, and it's the quiet backbone of everything.

If most of your screen is neutral, your accent color gets to do its job. If everything is colorful, nothing is.

---

## Chapter 2: Contrast: can people actually read it?

Contrast is the difference in brightness between text and the background behind it. Too little and text fades away, especially for people with low vision, on cheap screens, or outdoors.

The Web Content Accessibility Guidelines (WCAG), published by the W3C, set minimum contrast ratios. At the commonly targeted AA level, normal text needs a ratio of at least 4.5 to 1, large text needs at least 3 to 1, and interface parts like input borders and icons also need at least 3 to 1. Free contrast checkers (including ones built into browser tools and Figma plugins) will calculate the ratio for you.

**In real life:** Light grey text on a white background. It looks elegant on your bright laptop at home. On a phone in afternoon sunlight, it vanishes.

---

## Chapter 3: Don't use color alone

A lot of people have some form of color vision deficiency, and red and green are among the most commonly confused. Add to that sunlight, dim screens and tired eyes. If your only signal is color, some people will miss it.

- **Color only:** A red border on a form field with nothing else. Some people won't notice anything changed.
- **Color, icon and words:** A red border, a small warning icon, and the text "Enter a valid email". Everyone gets the message.

The same goes for charts, graphs and status dots. Pair color with a label, an icon or a pattern.

---

## Chapter 4: A small palette that works

1. **Start with one accent.** Pick one color for your main action and key moments.
2. **Add neutrals.** A handful of steps from near-white to near-black for backgrounds, borders and text.
3. **Add status colors.** One each for success, warning and error. Keep them recognizable.
4. **Use the accent sparingly.** It's loud. If it's on everything, it stops pointing at anything.
5. **Check contrast on every text and background pair.** Do this before you're attached to the combination.

---

## Common mistakes

- Low-contrast grey text because it "looks clean"
- Rainbow palettes with no clear jobs
- Red-only error states
- Choosing colors by taste and never testing them

---

## Try it (20 min)

- [ ] Pick three text and background color pairs from a screen you've designed.
- [ ] Check each pair with a contrast checker and write down the ratios.
- [ ] Fix anything that falls below 4.5 to 1 for normal text.
- [ ] Add an icon and a label to one color-only error or status.
