'use strict';

import {libWrapper} from './shim.js';

const MODULE_NAME = "Toggle Snap to Grid";
const MODULE_ID = "toggle-snap-to-grid";
const FLAG_NAME = "TSTG.snapToGrid"

// Initialize module
Hooks.once('init', function () {
    console.log(`Initializing "${MODULE_NAME}"`);
    const DRAG_RULER_ENABLED = game.modules.get('drag-ruler')?.active;

    class SnapToGridButton {
        
        // Toggle the grid snapping flag for a token
        static async toggleSnapToGrid(event, token) {
            let state = token.document.getFlag(MODULE_ID, FLAG_NAME);

            // Just in case, this fixes any cases where our flag is undefined
            if(state == undefined) {
                await this.fixUndefinedSnapToGridValue(token, event.currentTarget);
                state = token.document.getFlag(MODULE_ID, FLAG_NAME);
            }

            // Process each controlled token, as well as the reference token
            const tokens = canvas.tokens.controlled.filter(async t => t.document.getFlag(MODULE_ID, FLAG_NAME) !== state);
            for(let t of tokens)
            {   
                await this.setSnapToGrid(t, !state, t.data._id == token.data._id ? event.currentTarget : null);
            }
        }

        // Set the value of our grid snapping flag and
        //      toggle the TokenHUD button's visuals if available
        static async setSnapToGrid(token, newValue, uiButton = null) {
            await token.document.setFlag(MODULE_ID, FLAG_NAME, newValue);

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
            let value = token.document.getFlag(MODULE_ID, FLAG_NAME);
            snapButton.classList.toggle("active", value);
        }
    }

    // Hook our button onto the TokenHUD
    Hooks.on("renderTokenHUD", (...args) => SnapToGridButton.prepTokenHUD(...args));
    
    // New tokens have grid snapping on by default
    Hooks.on('createToken', async (tokenDocument, options, user_id) => {
        let value = tokenDocument.getFlag(MODULE_ID, FLAG_NAME);
        if(value == undefined)
        {
            await tokenDocument.setFlag(MODULE_ID, FLAG_NAME, true);
        }
    });

    // If we click on a token and our custom property is undefined, set it to true by default
    Hooks.on('controlToken', async (token, controlled) => {
        if(!controlled || token.data.flags[MODULE_ID]) {
            return;
        }

        await SnapToGridButton.fixUndefinedSnapToGridValue(token);
    });

    // JavaScript doesn't let you write to read only properties (duh), so make a copy and set it ourselves.
    // "WOW", you might be thinking, "What the fuck is this?". Well, sometimes I hate JavaScript.
    // All of a MouseEvent's properties are readonly and can't be copied to a new object
    // through normal means. So I have to MANUALLY copy over each property. Fun.
    function modifyPointerEventForShiftKey(event)
    {
        return new PointerEvent(event.type, {
            altKey: event.altKey, bubbles: event.bubbles, button: event.button, buttons: event.buttons, 
            cancelBubble: event.cancelBubble, cancelable: event.cancelable,
            clientX: event.clientX, clientY: event.clientY, composed: event.composed,
            ctrlKey: event.ctrlKey, currentTarget: event.currentTarget, defaultPrevented: event.defaultPrevented,
            detail: event.detail, eventPhase: event.eventPhase, fromElement: event.fromElement,
            height: event.height, isPrimary: event.isPrimary, isTrusted: event.isTrusted,
            layerX: event.layerX, layerY: event.layerY, metaKey: event.metaKey,
            movementX: event.movementX, movementY: event.movementY, offsetX: event.offsetX, offsetY: event.offsetY,
            pageX: event.pageX, pageY: event.pageY, path: event.path, pointerId: event.pointerId,
            pointerType: event.pointerType, pressure: event.pressure, relatedTarget: event.relatedTarget,
            returnValue: event.returnValue, screenX: event.screenX, screenY: event.screenY, 
            shiftKey: true, // this is the only line we needed ;_;
            sourceCapabilities: event.sourceCapabilities, srcElement: event.srcElement, tangentialPressure: event.tangentialPressure,
            target: event.target, tiltX: event.tiltX, tiltY: event.tiltY, timeStamp: event.timeStamp,
            toElement: event.toElement, twist: event.twist, type: event.type, view: event.view,
            which: event.which, width: event.width, x: event.x, y: event.y
        });
    }

    // Same as modifyPointerEventForShiftKey
    function modifyMouseEventForShiftKey(event)
    {
        return new MouseEvent(event.type, {
            altKey: event.altKey, bubbles: event.bubbles, button: event.button, buttons: event.buttons, 
            cancelBubble: event.cancelBubble, cancelable: event.cancelable,
            clientX: event.clientX, clientY: event.clientY, composed: event.composed,
            ctrlKey: event.ctrlKey, currentTarget: event.currentTarget, defaultPrevented: event.defaultPrevented,
            detail: event.detail, eventPhase: event.eventPhase, fromElement: event.fromElement,
            isTrusted: event.isTrusted,
            layerX: event.layerX, layerY: event.layerY, metaKey: event.metaKey,
            movementX: event.movementX, movementY: event.movementY, offsetX: event.offsetX, offsetY: event.offsetY,
            pageX: event.pageX, pageY: event.pageY, path: event.path,
            relatedTarget: event.relatedTarget,
            returnValue: event.returnValue, screenX: event.screenX, screenY: event.screenY, 
            shiftKey: true, // this is the only line we needed ;_;
            sourceCapabilities: event.sourceCapabilities, srcElement: event.srcElement,
            target: event.target, timeStamp: event.timeStamp,
            toElement: event.toElement, type: event.type, view: event.view,
            which: event.which, x: event.x, y: event.y
        });
    }

    // Same as modifyPointerEventForShiftKey
    function modifyKeyboardEventForShiftKey(event)
    {
        return new KeyboardEvent(event.type, {
            altKey: event.altKey, bubbles: event.bubbles, 
            cancelBubble: event.cancelBubble, cancelable: event.cancelable,
            charCode: event.charCode, code: event.code, composed: event.composed,
            ctrlKey: event.ctrlKey, currentTarget: event.currentTarget, defaultPrevented: event.defaultPrevented,
            detail: event.detail, eventPhase: event.eventPhase, isComposing: event.isComposing,
            isTrusted: event.isTrusted, key: event.key, keyCode: event.keyCode,
            location: event.location, metaKey: event.metaKey, path: event.path,
            repeat: event.repeat, returnValue: event.returnValue,
            shiftKey: true, // this is the only line we needed ;_;
            sourceCapabilities: event.sourceCapabilities, srcElement: event.srcElement,
            target: event.target, timeStamp: event.timeStamp,
            type: event.type, view: event.view,
            which: event.which
        });
    }

    // Wrap around Foundry so we can move tokens off of the grid
    libWrapper.register(MODULE_ID, 'Token.prototype._onDragLeftDrop', function (wrapped, ...args) {

        // Default behavior if this is a gridless map, the shift key is already being held, or grid snapping is enabled
        let event = args[0].data.originalEvent;
        if(canvas.grid.type == CONST.GRID_TYPES.GRIDLESS || event.shiftKey || 
            this.document.getFlag(MODULE_ID, FLAG_NAME)) {
            return wrapped(...args);
        }

        //Overwrite the shiftKey property so Foundry thinks we are holding it down
        args[0].data.originalEvent = modifyPointerEventForShiftKey(event);

        return wrapped(...args);
    }, 'WRAPPER');

    if(DRAG_RULER_ENABLED)
    {
        // Wrap around Foundry so rulers can move tokens off grid
        libWrapper.register(MODULE_ID, 'Ruler.prototype.moveToken', function (wrapped, ...args) {
                
            // Default behavior if this is a gridless map or the shift key is already being held.
            // Also check if this is a drag ruler and grid snapping is enabled
            let event = args[0];
            if(canvas.grid.type == CONST.GRID_TYPES.GRIDLESS || event.shiftKey ||
                !this.isDragRuler || !this.draggedEntity || !(this.draggedEntity instanceof Token) || 
                this.draggedEntity.document.getFlag(MODULE_ID, FLAG_NAME)) {
                return wrapped(...args);
            }

            args[0] = modifyKeyboardEventForShiftKey(event);

            return wrapped(...args);
        }, 'WRAPPER');

        // Wrap around Foundry so ruler measurements will change if grid snapping is disabled
        libWrapper.register(MODULE_ID, 'Ruler.prototype.measure', function (wrapped, ...args) {

            // Probably got socketed this over the web so we need to add an options argument.
            if(args.length < 2) {
                args.push({snap: true}); // default snap to true and let the token handle it
            }

            // Double check that snap is defined
            if(args[1].snap == undefined) {
                args[1].snap = true; // default snap to true and let the token handle it
            }

            // Default behavior if this is a gridless map or if snap is already disabled
            // Also check if this is a drag ruler and grid snapping is enabled
            if(canvas.grid.type == CONST.GRID_TYPES.GRIDLESS || !args[1].snap ||
                !this.isDragRuler || !this.draggedEntity || !(this.draggedEntity instanceof Token) || 
                this.draggedEntity.document.getFlag(MODULE_ID, FLAG_NAME)) {
                return wrapped(...args);
            }

            args[1].gridSpaces = false;
            args[1].snap = false;

            return wrapped(...args);;
        }, 'WRAPPER');

        libWrapper.register(MODULE_ID, 'MouseInteractionManager.prototype.cancel', function (wrapped, ...args) {

            // Default behavior if this is a gridless map or if snap is already disabled
            // Also check if this is a drag ruler and grid snapping is enabled
            let event = args[0];
            if (canvas.grid.type == CONST.GRID_TYPES.GRIDLESS || event.shiftKey ||
                !(this.object instanceof Token) || !canvas.controls.ruler.isDragRuler || 
                this.object.document.getFlag(MODULE_ID, FLAG_NAME)) {
                return wrapped(...args);
            }
            
            args[0] = modifyMouseEventForShiftKey(event);
            
            return wrapped(...args);
        }, 'WRAPPER');
    }
});