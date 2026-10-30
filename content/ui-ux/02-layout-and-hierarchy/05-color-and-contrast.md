# Color & contrast

*Use color with restraint, and keep every pair readable.*

## TL;DR

Color is a system, not a mood board. Pick a small palette, save your strongest color for the main action, and check contrast so everyone can read the screen.

---

## Chapter 1: Color has a job

Color is the easiest thing to overdo. It feels like design because it is visible. But in an interface, color is not decoration first. It is information.

A red error message is information. A green success state is information. A single accent color on the primary button is information. It says: start here.

When every element has its own color, the information disappears. The person cannot tell what is a warning, what is a link and what is just a brand moment.

### Color is context, not just taste

Colors carry meaning, and that meaning changes across cultures and products. Red can mean danger, luck or a sale. Green can mean success or money. Blue can feel calm, corporate or cold.

You do not need to become an expert in color symbolism. You do need to stop assuming your associations are universal. If a color is carrying meaning, reinforce it with a word, an icon or a shape.

### The three jobs of color in a UI

Most interfaces need color to do three things:

1. **Set the surface.** Backgrounds, cards and borders that stay out of the way.
2. **Direct attention.** One accent for the main action, active state or selected item.
3. **Communicate state.** Success, warning, error and information.

If a color is not doing one of those jobs, ask why it is there.

---

## Chapter 2: Build a small palette

A palette is not a collection of colors you like. It is a small set of roles.

Start with neutrals. Most of a screen is not colorful: backgrounds, surfaces, body text, secondary text, borders. Neutrals carry the interface so the accent can do its job.

### A practical starting palette

- **Background:** the page behind everything.
- **Surface:** cards, panels, inputs.
- **Text:** the main readable color.
- **Muted text:** secondary labels and captions, still readable.
- **Border:** subtle separation.
- **Accent:** one color for the main action and focus.
- **Semantic colors:** success, warning and error.

That is already eight roles. You do not need eight bright colors. Most of them will be quiet variations of the same neutrals.

### One accent is usually enough

Pick one accent and use it rarely. If your accent is orange, a primary button, a focused input and a selected tab can use it. Body text should not. Headings should not, unless the brand really demands it.

When the accent appears everywhere, it stops meaning "look here". It becomes wallpaper.

### Build tints and shades, not new hues

Instead of adding a second blue for hover and a third for disabled, create tints and shades of the same hue. You get variety without losing coherence.

A simple system might have:

- Accent 500 for the default state.
- Accent 600 for hover.
- Accent 300 for a subtle background.
- Accent 700 for text on a light accent background.

The exact numbers matter less than the relationship. The palette should feel like one family.

### Let neutrals do the heavy lifting

A common beginner mistake is making the background, cards, borders and text all fight for attention. The fix is contrast hierarchy:

- Background and surface are close in value.
- Borders are subtle.
- Body text is clearly readable.
- Secondary text is quieter but not invisible.
- The accent is the loudest small thing.

In real life: a good shop window has one object under a spotlight and a calm room around it. If every object has its own spotlight, the window becomes noise.

---

## Chapter 3: Contrast is readability

Contrast is the difference between two colors. It decides whether text is readable, whether a button looks clickable and whether a border is visible.

Color choice is subjective. Contrast is testable. That is what makes it useful.

### The numbers to know

The Web Content Accessibility Guidelines (WCAG) are the common reference. For AA, the usual minimums are:

- **4.5:1** for normal body text.
- **3:1** for large text (roughly 18pt regular or 14pt bold and above).
- **3:1** for meaningful interface components, like input borders and focus indicators.

These are minimums, not targets to scrape past. A ratio of 4.5:1 is the edge of comfortable for many people. If you can go higher without making the design harsh, do.

### Contrast is not just black and white

Light grey text on a white background is the classic failure. It looks elegant in a mockup and disappears on a laptop in sunlight.

The same problem shows up in dark mode. Dark grey text on a black background can look sophisticated and be almost impossible to read. Test the actual colors, not the vibe.

### Do not rely on color alone

Roughly one in twelve men and one in two hundred women have some form of color vision deficiency. Color-blind users may not distinguish your red error from your green success.

Pair color with another signal:

- An icon.
- A text label.
- A pattern or underline.
- A shape change.

A red border plus "This field is required" is accessible. A red border alone is a guess.

### Test in grayscale

A quick check: turn your screen or design grayscale. If the hierarchy still makes sense, color is supporting the design. If everything collapses into the same grey puddle, color was doing too much.

Grayscale also reveals contrast problems you stop seeing after staring at a screen for an hour.

---

## Chapter 4: Use color with restraint

The best color work in interfaces is often invisible. You notice the screen feels calm, not that it has a clever palette.

### Spend your loudness once

Reserve the strongest color for the one thing you most want the person to do. If there are two equally loud actions, neither is primary.

This connects directly to visual hierarchy. Color is one volume knob. Turn it up on the main action and leave the rest quiet.

### Design the states

A color system is not finished when the default state looks good. You also need:

- Hover.
- Focus.
- Pressed.
- Disabled.
- Selected.
- Error.
- Dark mode, if you support it.

A focus state is not optional. People who use a keyboard need to see where they are. Use a visible outline or ring, not just a subtle color shift.

### Keep semantics consistent

If red means error, do not use red for a decorative badge. If green means success, do not use green for a random tag. Consistency is what turns color into a language.

And remember that brand color is not the same as UI color. A brand can be loud. A checkout screen still has to be clear.

### Check the pair, not the swatch

A color that looks good in isolation can fail next to another color. Always check the actual pair: text on its real background, border on its real surface, icon on its real button.

That is the whole discipline. Choose a small palette, give each color a job, and test the pairs people will actually see.

---

## Common mistakes

**Mistake 1: Too many accent colors.** When everything is highlighted, nothing is. One accent is usually enough.

**Mistake 2: Grey text that is too light.** Secondary text still has to be readable. If you have to squint, it is too faint.

**Mistake 3: Using color as the only signal.** Add text, an icon or a shape so the meaning survives color blindness and grayscale.

**Mistake 4: Ignoring states.** Hover, focus, disabled and error states are part of the color system. A pretty default state is not enough.

**Mistake 5: Choosing colors by taste alone.** Taste starts the palette. Contrast, consistency and meaning finish it.

---

## Try it

Open an app you use daily.

- [ ] Count how many distinct colors appear on one screen.
- [ ] Label each one: surface, text, accent, success, warning, error, decoration.
- [ ] Pick one text and background pair and check its contrast ratio.
- [ ] Switch the screen to grayscale and see whether the hierarchy still works.

Then remove or quiet one color that is not doing a job. The screen will usually feel calmer, not emptier.
