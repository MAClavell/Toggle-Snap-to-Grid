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

    if(!DRAG_RULER_ENABLED) {
        // JavaScript doesn't let you write to read only properties (duh), so make a copy and set it ourselves.
        // "WOW", you might be thinking, "What the fuck is this?". Sometimes I hate JavaScript.
        // All of a MouseEvent's properties are readonly and can't be copied to a new object
        // through normal means. So I have to MANUALLY copy over each property. Fun.
        function modifyPointerEventForShiftKey(event, newValue)
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
                shiftKey: newValue, // this is the only line we needed ;_;
                sourceCapabilities: event.sourceCapabilities, srcElement: event.srcElement, tangentialPressure: event.tangentialPressure,
                target: event.target, tiltX: event.tiltX, tiltY: event.tiltY, timeStamp: event.timeStamp,
                toElement: event.toElement, twist: event.twist, type: event.type, view: event.view,
                which: event.which, width: event.width, x: event.x, y: event.y
            });
        }

        // Wrap around Foundry so we can move tokens off of the grid
        libWrapper.register(MODULE_ID, 'Token.prototype._onDragLeftDrop', function (wrapped, ...args) {

            // Default behavior if this is a gridless map or if grid snapping is enabled
            if(canvas.grid.type == CONST.GRID_TYPES.GRIDLESS ||
                this.document.getFlag(MODULE_ID, FLAG_NAME)) {
                return wrapped(...args);
            }

            // Overwrite the shiftKey property so Foundry's behavior changes
            // Allow shift key to reverse the unsnap if it is being held down
            let event = args[0].data.originalEvent;
            args[0].data.originalEvent = modifyPointerEventForShiftKey(event, !event.shiftKey);

            return wrapped(...args);
        }, 'WRAPPER');
    }
    else if(DRAG_RULER_ENABLED)
    {
        const DRAG_RULER_MEASUREMENT_SETTING_NAME = "measurement_setting";
        const DRAG_RULER_SHIFT_SETTING_NAME = "shift_setting";

        const DRAG_RULER_IGNORE_GRID_NO_HIGHLIGHT = 0;
        const DRAG_RULER_GRID_NO_HIGHLIGHT = 1;
        const DRAG_RULER_GRID_HIGHLIGHT = 2;

        let dragRulerMeasurementSetting;
        let dragRulerShiftSetting;

        function parseDragRulerMeasurementSetting(value) {
            if(value == "gridNoHighlight") {
                dragRulerMeasurementSetting = DRAG_RULER_GRID_NO_HIGHLIGHT;
            }
            else if(value == "gridHighlight") {
                dragRulerMeasurementSetting = DRAG_RULER_GRID_HIGHLIGHT;
            }
            else {
                dragRulerMeasurementSetting = DRAG_RULER_IGNORE_GRID_NO_HIGHLIGHT;
            }
        }

        game.settings.register(MODULE_ID, DRAG_RULER_MEASUREMENT_SETTING_NAME, {
            name: game.i18n.localize("TSTG.DragRulerMeasurementSettingName"),
            hint: game.i18n.localize("TSTG.DragRulerMeasurementSettingHint"),
            scope: "client",
            type: String,
            choices: {
                "ignoreGridNoHighlight": game.i18n.localize("TSTG.DragRulerMeasurementSettingIgnoreGridNoHighlight"),
                "gridNoHighlight": game.i18n.localize("TSTG.DragRulerMeasurementSettingGridNoHighlight"),
                "gridHighlight": game.i18n.localize("TSTG.DragRulerMeasurementSettingGridHighlight"),
            },
            default: "ignoreGridNoHighlight",
            config: true,
            onChange: value => {
                parseDragRulerMeasurementSetting(value);
            }
        });

        game.settings.register(MODULE_ID, DRAG_RULER_SHIFT_SETTING_NAME, {
            name: game.i18n.localize("TSTG.DragRulerShiftSettingName"),
            hint: game.i18n.localize("TSTG.DragRulerShiftSettingHint"),
            scope: "client",
            type: Boolean,
            default: false,
            config: true,
            onChange: value => {
                dragRulerShiftSetting = value;
            }
        });

        parseDragRulerMeasurementSetting(game.settings.get(MODULE_ID, DRAG_RULER_MEASUREMENT_SETTING_NAME));
        dragRulerShiftSetting = game.settings.get(MODULE_ID, DRAG_RULER_SHIFT_SETTING_NAME);

        // Wrap around Foundry so drag rulers can place and remove waypoints correctly
        libWrapper.register(MODULE_ID, 'Token.prototype._onDragLeftCancel', function (wrapped, ...args) {

            // Default behavior if this is a gridless map
            // Also check if this isn't a drag ruler or if grid snapping is enabled
            if (canvas.grid.type == CONST.GRID_TYPES.GRIDLESS ||
                !canvas.controls.ruler.isDragRuler || 
                this.document.getFlag(MODULE_ID, FLAG_NAME)) {
                return wrapped(...args);
            }
            
            // Tell drag ruler to not snap waypoints to the grid if shift is not being held down
            // Just add a temporary variable to the drag ruler instance to get around enhanced terrain layer
            if(!args[0].shiftKey) {
                this.snapOverride = {};
                this.snapOverride.active = true;
                this.snapOverride.snap = false;
            }

            return wrapped(...args);
        }, 'WRAPPER');

        // Wrap around Foundry so drag rulers can place and remove waypoints correctly
        libWrapper.register(MODULE_ID, 'Ruler.prototype.moveToken', function (wrapped, ...args) {
                
            // Default behavior if this is a gridless map
            // Also check if this isn't a drag ruler or if grid snapping is enabled
            if(canvas.grid.type == CONST.GRID_TYPES.GRIDLESS ||
                !this.isDragRuler || !this.draggedEntity || !(this.draggedEntity instanceof Token) || 
                this.draggedEntity.document.getFlag(MODULE_ID, FLAG_NAME)) {
                return wrapped(...args);
            }

            // Tell drag ruler to not snap waypoints to the grid if shift is not being held down
            // Just add a temporary variable to the drag ruler instance to get around enhanced terrain layer
            if(!args[0].shiftKey) {
                this.snapOverrideData = {};
                this.snapOverrideData.active = true;
                this.snapOverrideData.snap = false;
            }

            return wrapped(...args);
        }, 'WRAPPER');

        // Override Foundry so drag rulers will measure correctly after removing a waypoint
        libWrapper.register(MODULE_ID, 'Ruler.prototype._removeWaypoint', function (...args) {
            this.waypoints.pop();
            this.labels.removeChild(this.labels.children.pop());
            this.measure(args[0], args[1]);
        }, 'OVERRIDE');

        function setMeasurementAndHighlightOptions(options) {
            // Grid highlighting and measurement type is based on user settings
            if(dragRulerMeasurementSetting == DRAG_RULER_IGNORE_GRID_NO_HIGHLIGHT) {
                options.gridSpaces = false;
                options.ignoreGrid = true;
            }
            else if (dragRulerMeasurementSetting == DRAG_RULER_GRID_NO_HIGHLIGHT) {
                options.gridSpaces = false;
                options.ignoreGrid = false;
            }
            else { // DRAG_RULER_GRID_HIGHLIGHT
                options.gridSpaces = true;
                options.ignoreGrid = false;
            }
        }

        // Wrap around Foundry so ruler measurements will change if grid snapping is disabled
        libWrapper.register(MODULE_ID, 'Ruler.prototype.measure', function (wrapped, ...args) {

            // Probably got socketed this over the web so we need to add an options argument.
            if(args.length < 2) {
                args.push({snap: canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS}); // default snap to the current grid type
            }

            // Default behavior if this is a gridless map
            // Also check if this isn't a drag ruler or if grid snapping is enabled
            if(canvas.grid.type == CONST.GRID_TYPES.GRIDLESS ||
                !this.isDragRuler || !this.draggedEntity || !(this.draggedEntity instanceof Token) || 
                this.draggedEntity.document.getFlag(MODULE_ID, FLAG_NAME)) {
                return wrapped(...args);
            }

            // Override snapping based on what a socketed ruler is doing
            if(this.socketIsSnappedToGrid != undefined) {
                args[1].snap = !this.socketIsSnappedToGrid;
                args[1].socketOverrideAlreadySet = true;
            }

            // Ensure everything is correctly set. measure() is called when moving the mouse and removing waypoints
            if (args[1].snap || args[1].snapOverrideActive) {
                setMeasurementAndHighlightOptions(args[1]);
                args[1].snap = false;
            }
            // If snapping is off at this point it is probably because we are holding shift, toggle snap and everything back on
            else if(!args[1].snapOverrideActive) {
                if (dragRulerShiftSetting) {
                    setMeasurementAndHighlightOptions(args[1]);
                }
                args[1].snap = true;
            }

            return wrapped(...args);;
        }, 'WRAPPER');
    }
});
