# Toggle Snap to Grid
A module for Foundry VTT that lets you disable a grid snapping for tokens with a UI button. Helpful for RP maps!
* A button will appear on the token UI when right clicking. Press it to toggle grid snapping on and off.
* If grid snapping is off you can hold shift to temporarily turn grid snapping back on.

![ToggleSnapToGrid](https://user-images.githubusercontent.com/25129246/125176345-ad184d00-e1a0-11eb-8be4-d04e5fe329c0.gif)

## Drag Ruler Support
This module supports Drag Ruler and changes the ruler's measurement type based on if grid snapping is enabled. When Drag Ruler is installed an option will appear in the settings menu that allows you to choose how you want measurements and highlighting to work when dragging an unsnapped token. This option is client specific so all players can choose what best fits them.

**Note: Offical DragRuler support needs some code changes on their end and is pending. Use my fork for the time being.**

![ToggleSnapToGrid-DragRuler](https://user-images.githubusercontent.com/25129246/125176486-bc4bca80-e1a1-11eb-808d-fd4fb35016c6.gif)

## Installation
Works best with the [LibWrapper module](https://github.com/ruipin/fvtt-lib-wrapper) installed.

Will be added to the Foundry modules installer when Drag Ruler support is fully in.

Install by inputting this manifest link into the module installer: https://raw.githubusercontent.com/MAClavell/Toggle-Snap-to-Grid/main/module.json
