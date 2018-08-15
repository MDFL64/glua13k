# glua13k
A js13kGames entry.

## Outline
- Raymarched 3D game.
- Do as much as possible in GLSL.
- Basic physics re-use raymarcher's SDF.

## Build Process
- Bundle into single HTML -or- keep split?
- Zip, then use ADVZIP.
- Final Zip must be <= 13,312 bytes.
### JS
- Closure Compile:
    * Inline GL consts
    * Cut debug code
- SMERT Minifications:
    * Cut all newlines
    * Search for library functions using short names **TODO**
    * Cut top-level `var` **MAYBE**
    * `function` to `=>` **MAYBE**

### GLSL
- [Minify.](http://www.ctrl-alt-test.fr/glsl-minifier/)

