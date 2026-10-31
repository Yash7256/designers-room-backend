# Handoff to developers

*Handoff is a conversation, not a file transfer. Give developers what they need, early, and keep talking.*

## TL;DR

Handoff is a conversation, not a file transfer. Give developers what they need, early, and keep talking.

---

## Chapter 1: A recipe, not a photo

Tell a cook "make this" and show them a photo of a dish. They'll guess the ingredients. Now give them a recipe with ingredients, steps and a note: "if the dough feels dry, add a spoon of water." Big difference.

Developers are in the same boat. A screen shows what something looks like. They also need to know how it behaves, in every situation.

**In real life:** A developer finds there's no hover state, no error state and no empty state in your file. They guess. Their guess isn't what you imagined. You both lose a day.

---

## Chapter 2: What developers need

- **Every state:** Default, hover, pressed, focus, disabled, loading, empty and error.
- **Spacing and sizes:** Consistent, ideally from your tokens, so they can reuse the same values.
- **Behavior notes:** What happens on tap, how forms validate, what animates and how.
- **Responsive rules:** How things change at different screen sizes.
- **Assets:** Icons and images exported properly. Icons are often SVG, photos are often PNG or JPG. Ask what your team prefers.
- **Accessibility notes:** Labels, focus order and anything that isn't obvious from the screen.

---

## Chapter 3: Prepare your file

1. **Clean up.** Delete unused layers. Name frames and layers. Use components, styles and variables.
2. **Organize pages.** A clear page for what's ready to build.
3. **Mark what's ready.** Don't make developers guess which version is final.
4. **Add annotations.** Short notes next to anything that isn't obvious.
5. **Link a prototype** for behavior that's hard to describe.
6. **Know your tools.** Figma has a Dev Mode where developers can inspect measurements and more. What's included depends on your plan, so check Figma's help pages.

---

## Chapter 4: Keep the conversation going

1. **Talk before they build.** A twenty-minute walkthrough saves hours.
2. **Ask what's hard.** "Is anything here difficult to build?" can change a design for the better.
3. **Agree on names.** If your design calls it "Action", the code should too.
4. **Check what got built.** Compare the finished version to your design and note differences.
5. **Be kind about trade-offs.** Sometimes "close enough" is the right call.

---

## Common mistakes

- Throwing the file over the wall and disappearing
- Missing states
- Unnamed layers and chaotic files
- Never reviewing the built version

---

## Try it (25 min)

- [ ] Take your card or mini library and list every state each component needs.
- [ ] Add short behavior notes next to anything not obvious.
- [ ] Name every frame and layer.
- [ ] Write a short note to a developer explaining what's ready and what isn't.
