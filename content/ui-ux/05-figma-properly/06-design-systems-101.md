# Design systems 101

*A design system is a shared kit of components, styles and rules, so a team can build consistently and faster. Start small.*

## TL;DR

A design system is a shared kit of components, styles and rules, so a team can build consistently and faster. Start small.

---

## Chapter 1: A Lego set

A Lego set has pieces and a booklet of instructions. Anyone can follow it and build the same thing, and the pieces always click together.

A design system is the same idea. There are pieces (components), shared decisions (colors, type, spacing) and instructions (how and when to use them).

**In real life:** A restaurant chain. Every outlet tastes the same because they share recipes and standards. Customers know what they're getting.

---

## Chapter 2: What's inside

- **Foundations and tokens:** Named values for color, type, spacing and corner radius. A token is just a named decision, like "color-action".
- **Components:** Reusable pieces like buttons, inputs, cards and tags, with all their states.
- **Patterns:** Combinations of components that solve common problems, like a sign-up form or a navigation bar.
- **Guidelines:** When to use what, with do and don't examples, and accessibility notes.

---

## Chapter 3: Why bother, and when not to

Why teams build them:

- Consistency across screens and people
- Speed, because you reuse instead of redraw
- Fewer decisions to argue about
- Easier handoff to developers
- Accessibility built in once, not fixed everywhere

The honest costs:

- Someone has to maintain it. A neglected system goes stale.
- A huge system is overkill for a small solo project.

A solo student project doesn't need a 200-component system. A mini one is enough. If you want to study a real, public example, Google's Material Design is open to read.

---

## Chapter 4: Build a mini system

1. **Audit.** Gather your screens and list the things that repeat.
2. **Define tokens.** About five to eight colors with jobs, five text styles, and your spacing scale.
3. **Build five or six components.** Button, input, card, tag and a navigation item, each with variants and states.
4. **Document it.** Make a Figma page with a short usage note and a do and don't for each.
5. **Keep a changelog.** A simple list of what changed and when.
6. **Use it in a real screen.** Fix whatever hurts.

Keep it small. A system that's used beats one that's complete.

---

## Common mistakes

- Building a huge system before designing a real screen
- Not documenting anything
- Inconsistent naming
- Making it and never maintaining it

---

## Try it (35 min)

- [ ] Look at your last project and list ten repeated elements.
- [ ] Define your tokens: colors with jobs, text styles, spacing.
- [ ] Build three components with states.
- [ ] Add a documentation page with one note per component.
