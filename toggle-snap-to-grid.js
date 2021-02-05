'use strict';

import {libWrapper} from './shim.js';

const MODULE_NAME = "Toggle Snap to Grid";
const MODULE_ID = "toggle-snap-to-grid";
const FLAG_NAME = "TSTG.snapToGrid"

// Initialize module
Hooks.once('init', function () {
    console.log(`Initializing "${MODULE_NAME}"`);

    class SnapToGridButton {
        
        // Toggle the grid snapping flag for a token
        static async toggleSnapToGrid(event, token) {
            let state = await token.getFlag(MODULE_ID, FLAG_NAME);

            // Just in case, this fixes any cases where our flag is undefined
            if(state == undefined) {
                await this.fixUndefinedSnapToGridValue(token, event.currentTarget);
                state = await token.getFlag(MODULE_ID, FLAG_NAME);
            }

            // Process each controlled token, as well as the reference token
            const tokens = canvas.tokens.controlled.filter(async t => await token.getFlag(MODULE_ID, FLAG_NAME) !== state);
            for(let t of tokens)
            {   
                await this.setSnapToGrid(t, !state, t.data._id == token.data._id ? event.currentTarget : null);
            }
        }

        // Set the value of our grid snapping flag and
        //      toggle the TokenHUD button's visuals if available
        static async setSnapToGrid(token, newValue, uiButton = null) {
            await token.setFlag(MODULE_ID, FLAG_NAME, newValue);

            if(uiButton) {
                uiButton.classList.toggle("active", newValue);
            }
        }

        // Add the default value of a our grid snapping flag to the token
        //      in an event where it is not there
        static async fixUndefinedSnapToGridValue(token, uiButton = null) {
            console.log(`${MODULE_NAME} found a token with no setToGrid flag. Adding...`);
            await this.setSnapToGrid(token, true, uiButton);
        }
           
        
        // Create the HTML elements for the HUD button including the Font Awesome icon and tooltop.
        static createButton() {
            let button = document.createElement("div");
            button.classList.add("control-icon");
            button.innerHTML = `<i class="fas fa-border-all fa-fw"></i>`
            button.title = game.i18n.localize("TSTG.TooltipText");
            return button;
        }
        
        // Adds the button to the Token HUD and attaches event listeners.
        static async prepTokenHUD(hud, html, tokenData) {
            const snapButton = this.createButton();

            let token = canvas.tokens.get(tokenData._id);

            $(snapButton)
                .click((event) =>
                    this.toggleSnapToGrid(event, token)
                )
                .contextmenu((event) =>
                    this.toggleSnapToGrid(event, token)
                );
    
            html.find("div.right").append(snapButton);

            // Set whether the button's visuals should be active or inactive 
            //      based on the token's grid snappng sate
            let value = await token.getFlag(MODULE_ID, FLAG_NAME);
            snapButton.classList.toggle("active", value);
        }
    }

    // Hook our button onto the TokenHUD
    Hooks.on("renderTokenHUD", (...args) => SnapToGridButton.prepTokenHUD(...args));
    
    // New tokens have grid snapping on by default
    Hooks.on('createToken', async (scene, tokenData, options, user_id) => {
        let token = canvas.tokens.get(tokenData._id);
        let value = await token.getFlag(MODULE_ID, FLAG_NAME);
        if(value == undefined)
        {
            await token.setFlag(MODULE_ID, FLAG_NAME, true);
        }
    });

    // If we click on a token and our custom property is undefined, set it to true by default
    Hooks.on('controlToken', async (token, controlled) => {
        if(!controlled || token.data.flags[MODULE_ID]) {
            return;
        }

        await SnapToGridButton.fixUndefinedSnapToGridValue(token);
    });

    // Wrap around Foundry so we can move tokens off of the grid
    libWrapper.register(MODULE_ID, 'Token.prototype._onDragLeftDrop', (function() {
        return async function(wrapped, ...args) {
            // Grab if snapping to grid is enabled
            let value = await this.getFlag(MODULE_ID, FLAG_NAME);

            // If not, then just use the default behaviour
            if(value) {
			    return wrapped.apply(this, args);
            }
        
            // JavaScript doesn't let you write over read only properties, so make a copy and set it ourselves

            let newOriginalEvent = {
                ...args[0].data.originalEvent
            };

            //Overrite the shiftKey property so Foundry thinks we are holding it down
            newOriginalEvent.shiftKey = !value;
            args[0].data.originalEvent = newOriginalEvent;

			// Call original function
			return wrapped.apply(this, args);
		}
    })(), 'WRAPPER');

    // I had to make manual edits to ShowDragDistance to get this to work
    if(game.modules.get('ShowDragDistance')?.active)
    {
        console.log(`${MODULE_NAME} detected \'Show Drag Distance\' is installed and active. Applying workaround...`);

        // Wrap arond ShowDragDistance so we can enable gridless waypoint creation
        libWrapper.register(MODULE_ID, 'MouseInteractionManager.prototype._handleDragCancel', function(wrapped, ...args) {
            if((typeof this.object.data != 'undefined') && typeof this.object.data.flags['pick-up-stix'] == 'undefined' &&
                canvas.tokens.controlled.length == 1 && canvas.tokens.controlled[0].mouseInteractionManager.state == 3 &&
                    args[0].button == 2) {

                // Grab if snapping to grid is enabled
                let token = canvas.controls.dragRuler._getMovementToken();
                let value = token.data.flags[MODULE_ID].TSTG.snapToGrid;

                // If not, then just use the default behaviour
                if(value) {
                    return wrapped.apply(this, args);
                }

                // JavaScript doesn't let you write over read only properties, so make a copy and set it ourselves
                // "WOW", you might be thinking, "What the fuck is this?". Well, sometimes I hate JavaScript
                //      All of a MouseEvent's properties are readonly and can't be copied to a new object
                //      through normal means. So I have to MANUALLY copy over each property. Fun.
                let event = args[0];
                let newEvent = new MouseEvent(event.type, {
                    type: event.type, bubbles: event.bubbles, cancelable: event.cancelable,
                    view: event.view, detail: event.detail, screenX: event.screenX, screenY: event.screenY,
                    clientX: event.clientX, clientY: event.clientY, ctrlKey: event.ctrlKey,
                    altKey: event.altKey, 
                    shiftKey: !value, // this is the only line we needed ;_;
                    metaKey: event.metaKey,
                    button: event.button, relatedTarget: event.relatedTarget}
                  );

                //Overrite the shiftKey property so ShowDragDistance thinks we are holding it down
                args[0] = newEvent;
            }

            // Call original function
            return wrapped.apply(this, args);
        }, 'WRAPPER');
    }
});
Hooks.on('ready', function () {
// })
// Hooks.once('ready', 
    // I had to make manual edits to ShowDragDistance to get this to work
    if(game.modules.get('ShowDragDistance')?.active)
    {
        console.log(`${MODULE_NAME} detected \'Show Drag Distance\' is installed and active. Applying workaround...`);
        let registerShowDragDistanceWrappers = function () {
            // Wrap arond ShowDragDistance so we can enable gridless measurements
            libWrapper.register(MODULE_ID, 'canvas.controls.dragRuler._onMouseMove', (function() {
                return async function(wrapped, ...args) {
                    if ( this._state === Ruler.STATES.MOVING || canvas.tokens.controlled.length != 1) {
                        return wrapped.apply(this, args);
                    }

                    // Grab if snapping to grid is enabled
                    let token = this._getMovementToken();
                    let value = await token.getFlag(MODULE_ID, FLAG_NAME);

                    // If not, then just use the default behaviour
                    if(value) {
                        return wrapped.apply(this, args);
                    }
        
                    // JavaScript doesn't let you write over read only properties, so make a copy and set it ourselves
                    let newOriginalEvent = {
                        ...args[0].data.originalEvent
                    };

                    //Overrite the shiftKey property so ShowDragDistance thinks we are holding it down
                    newOriginalEvent.shiftKey = !value;
                    args[0].data.originalEvent = newOriginalEvent;

                    // Call original function
                    return wrapped.apply(this, args);
                }
            })(), 'WRAPPER');

            // Wrap around ShowDragDistance so we can move tokens off of the grid
            libWrapper.register(MODULE_ID, 'canvas.controls.dragRuler.moveToken', function(wrapped, ...args) {
                if(canvas.tokens.controlled.length != 1) {
                    return wrapped.apply(this, args);
                }

                // Grab if snapping to grid is enabled
                let token = this._getMovementToken();
                let value = token.data.flags[MODULE_ID].TSTG.snapToGrid;
                    
                // If not, then just use the default behaviour
                if(value) {
                    return wrapped.apply(this, args);
                }

                //Overrite the dragShift property so ShowDragDistance thinks we are holding the button down
                args[0] = !value;
                    
                // Call original function
                return wrapped.apply(this, args);
            }, 'WRAPPER');
        }
        registerShowDragDistanceWrappers();
        Hooks.on(`showDragDistanceReady`, registerShowDragDistanceWrappers);
    }



        // libWrapper.register(MODULE_ID, 'canvas.controls.ruler._onMouseMove', (function() {
        //     return async function(wrapped, ...args) {
        //         if ( this._state === Ruler.STATES.MOVING ) return;

        //         let token = canvas.tokens.controlled[0];
        //         let value = await token.getFlag(MODULE_ID, FLAG_NAME);

        //         if(value) {
        //             return wrapped.apply(this, args);
        //         }
    
        //         let newOriginalEvent = {
        //             ...args[0].data.originalEvent
        //         };
        //         newOriginalEvent.shiftKey = !value;
        //         args[0].data.originalEvent = newOriginalEvent;

        //         // Call original function
        //         return wrapped.apply(this, args);
        //     }
        // })(), 'WRAPPER');
});