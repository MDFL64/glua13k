# glua13k
A js13kGames entry.

## Outline
- Raymarched 3D game.
- Do as much as possible in GLSL.
- Basic physics re-use raymarcher's SDF.

## Build Process
- Recursively inline all files into index.html.
- Zip, then use ADVZIP.
- Final Zip must be <= 13,312 bytes.
### JS
- Closure Compiler:
    * Inline GL consts
    * Cut debug code
- TODO maybe just use an ES6 aware minifer?
- SMERT Minifications:
    * Cut all newlines
    * Cut top-level `var` **MAYBE**
    * `function` to `=>` **MAYBE**

### GLSL
- [Minify.](http://www.ctrl-alt-test.fr/glsl-minifier/)

