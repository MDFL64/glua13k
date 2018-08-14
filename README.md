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
- Run through closure compiler.
- Further minifications: replace GL consts, function to arrow, dummy parameters, replace bools, etc?
### GLSL
- [Minify.](http://www.ctrl-alt-test.fr/glsl-minifier/)

