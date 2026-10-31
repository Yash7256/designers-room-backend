# Components & variants

*Build it once as a component, use copies everywhere, and change it in one place. Variants keep the different versions together.*

## TL;DR

Build it once as a component, use copies everywhere, and change it in one place. Variants keep the different versions together.

---

## Chapter 1: The cookie cutter

Imagine a cookie cutter. Change the shape of the cutter and every cookie from it comes out different. A component is the cutter. The copies, called instances, are the cookies.

Without components, you copy and paste a button 40 times. Then your designer says, "Make the corners rounder." Now you have 40 edits to make.

**In real life:** You've changed the color of a button on one screen and forgotten about the other eleven. Everyone has. Components fix that.

---

## Chapter 2: Main components and instances

- **Main component:** The original. Edit this and every instance follows.
- **Instance:** A linked copy of the main component.
- **Overrides:** Changes you can make on an instance, like the text or an icon, without breaking the link.
- **Detach:** Breaks the link and turns an instance back into plain shapes. Use it only when you mean to.

To make one, select your layers and use Create component. The shortcut is commonly Cmd/Ctrl + Alt + K, but check Figma's current shortcut list.

---

## Chapter 3: Variants: one button, many versions

A button isn't just one thing. It has types (primary, secondary), states (default, hover, disabled) and sizes. Variants keep all those versions in one component, instead of ten separate ones.

Think of chai cups: same cup, small, medium or large. You pick the size, the cup is still the cup.

1. **Make your button component with auto layout.**
2. **Add variants.** Create versions for each type and state.
3. **Name the properties clearly.** "Type" with values "Primary" and "Secondary". "State" with "Default" and "Disabled".
4. **Use other properties too.** Figma can add toggles, like "show icon", and text fields you can edit.
5. **Test it.** Place an instance and switch its variants in the right panel.

---

## Chapter 4: Good component habits

1. **Name with slashes.** "Button/Primary" groups neatly in the assets panel.
2. **Build with auto layout.** Components that resize are far more useful.
3. **Start small.** Button, input, card, tag. You can add more later.
4. **Include the states.** Default, hover, pressed, focus, disabled, and where relevant, error and loading.
5. **Don't componentize everything.** If something appears once, it may not need to be a component.

---

## Common mistakes

- Copy-pasting instead of using components
- Detaching instances to "just fix one thing"
- Leaving components named "Component 12"
- Forgetting to design the states

---

## Try it (30 min)

- [ ] Build a button component with auto layout.
- [ ] Add three types and two states as variants.
- [ ] Use an instance in three different places.
- [ ] Change the corner radius on the main component and watch all three update.
