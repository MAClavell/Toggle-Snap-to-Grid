'use strict';

import {libWrapper} from './shim.js';

const TSTG_MODULE_NAME = "Toggle Snap to Grid";
const TSTG_MODULE_ID = "toggle-snap-to-grid";
const TSTG_FLAG_NAME = "TSTG.snapToGrid"

// Initialize module
Hooks.once('init', function () {
    console.log(`Initializing "${TSTG_MODULE_NAME}"`);
    const DRAG_RULER_ENABLED = game.modules.get('drag-ruler')?.active;

    class SnapToGridButton {
        
        // Toggle the grid snapping flag for a token
        static async toggleSnapToGrid(event, token) {
            let state = token.document.getFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME);

            // Just in case, this fixes any cases where our flag is undefined
            if(state == undefined) {
                await this.fixUndefinedSnapToGridValue(token, event.currentTarget);
                state = token.document.getFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME);
            }

            // Process each controlled token, as well as the reference token
            const tokens = canvas.tokens.controlled.filter(async t => t.document.getFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME) !== state);
            for(let t of tokens)
            {   
                await this.setSnapToGrid(t, !state, t.document.id == token.document.id ? event.currentTarget : null);
            }
        }

        // Set the value of our grid snapping flag and
        //      toggle the TokenHUD button's visuals if available
        static async setSnapToGrid(token, newValue, uiButton = null) {
            await token.document.setFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME, newValue);

            if(uiButton) {
                uiButton.classList.toggle("active", newValue);
            }
        }

        // Add the default value of a our grid snapping flag to the token
        //      in an event where it is not there
        static async fixUndefinedSnapToGridValue(token, uiButton = null) {
            console.log(`${TSTG_MODULE_NAME} found a token with no setToGrid flag. Adding...`);
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
            let value = token.document.getFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME);
            snapButton.classList.toggle("active", value);
        }
    }

    // Hook our button onto the TokenHUD
    Hooks.on("renderTokenHUD", (...args) => SnapToGridButton.prepTokenHUD(...args));
    
    // If we click on a token and our custom property is undefined, set it to true by default
    Hooks.on('controlToken', async (token, controlled) => {
        if(!controlled || token.document.flags[TSTG_MODULE_ID]) {
            return;
        }

        await SnapToGridButton.fixUndefinedSnapToGridValue(token);
    });

    function modifyEvent(token, event)
    {
        // Default behavior if this is a gridless map or if grid snapping is enabled
        if(canvas.grid.type == CONST.GRID_TYPES.GRIDLESS ||
            token.document.getFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME)) {
            return event;
        }

        // Drag Ruler has an option that by default disables the ruler when starting a token drag until a button is pressed.
        // If a Token is moved in this way it reverts to default Foundry behavior, so we have to handle this case.
        // 'isDragRuler' will let us know if the Drag Ruler is actively measuring or not.
        if (DRAG_RULER_ENABLED && canvas.controls.ruler.isDragRuler) {
            return event;
        }

        // Overwrite the shiftKey property so Foundry's behavior changes
        // Allow shift key to reverse the unsnap if it is being held down
        event.shiftKey = !event.shiftKey;
        return event;
    }

    // Wrap around Foundry so we can move tokens off of the grid
    libWrapper.register(TSTG_MODULE_ID, 'Token.prototype._onDragLeftDrop', function (wrapped, ...args) {

        args[0] = modifyEvent(this, args[0]);
        return wrapped(...args);
    }, 'WRAPPER');

    libWrapper.register(TSTG_MODULE_ID, 'Token.prototype._onDragLeftMove', function (wrapped, ...args) {

        args[0] = modifyEvent(this, args[0]);
        return wrapped(...args);
    }, 'WRAPPER');

    if(DRAG_RULER_ENABLED)
    {
        const DRAG_RULER_MEASUREMENT_SETTING_NAME = "measurement_setting";

        const DRAG_RULER_IGNORE_GRID_NO_HIGHLIGHT = 0;
        const DRAG_RULER_GRID_NO_HIGHLIGHT = 1;
        const DRAG_RULER_GRID_HIGHLIGHT = 2;

        const DRAG_RULER_SETTINGS_KEY = "drag-ruler";
        const DRAG_RULER_DISABLE_SNAP_KEY = "disableSnap";
        const DRAG_RULER_CREATE_WAYPOINT_KEY = "createWaypoint";

        let dragRulerMeasurementSetting;

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

        game.settings.register(TSTG_MODULE_ID, DRAG_RULER_MEASUREMENT_SETTING_NAME, {
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

        parseDragRulerMeasurementSetting(game.settings.get(TSTG_MODULE_ID, DRAG_RULER_MEASUREMENT_SETTING_NAME));

        function isDisableSnapKeybindDown() {
            const disableSnapKeybinds = game.keybindings.get(DRAG_RULER_SETTINGS_KEY, DRAG_RULER_DISABLE_SNAP_KEY);
            return disableSnapKeybinds.some(x => game.keyboard.downKeys.has(x.key));
        }

        function setSnapOverride(sourceObject) {
            sourceObject.snapOverride = {};
            sourceObject.snapOverride.active = true;
            sourceObject.snapOverride.snap = false;
        }

        function checkAndSetSnapOverride(token) {
            // Default behavior if this is a gridless map
            // Also check if this isn't a drag ruler or if grid snapping is enabled
            if (canvas.grid.type == CONST.GRID_TYPES.GRIDLESS ||
                !canvas.controls.ruler.draggedEntity || 
                token.document.getFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME)) {
                return;
            }
            
            // Tell drag ruler to not snap waypoints to the grid if the disable snap key is not being held down
            // Just add a temporary variable to the drag ruler instance to get around enhanced terrain layer
            if(!isDisableSnapKeybindDown()) {
                setSnapOverride(canvas.controls.ruler);
            }
        }

        // Wrap around Foundry so drag rulers can place and remove waypoints correctly
        libWrapper.register(TSTG_MODULE_ID, 'Token.prototype._onDragLeftCancel', function (wrapped, ...args) {
            checkAndSetSnapOverride(this);
            return wrapped(...args);
        }, 'WRAPPER');

        // Override Foundry so drag rulers will measure correctly after removing a waypoint
        libWrapper.register(TSTG_MODULE_ID, 'CONFIG.Canvas.rulerClass.prototype._removeWaypoint', function (...args) {
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
        libWrapper.register(TSTG_MODULE_ID, 'CONFIG.Canvas.rulerClass.prototype.measure', function (wrapped, ...args) {

            // Default behavior if this is a gridless map
            // Also check if this isn't a drag ruler or if grid snapping is enabled
            if(canvas.grid.type == CONST.GRID_TYPES.GRIDLESS ||
                !this.isDragRuler || !this.draggedEntity || !(this.draggedEntity instanceof Token) || 
                this.draggedEntity.document.getFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME)) {
                return wrapped(...args);
            }

            // Probably got socketed this over the web so we need to add an options argument.
            if(args.length < 2) {
                args.push({});
            }

            // Set measurement and highlighting preset
            setMeasurementAndHighlightOptions(args[1]);

            // If snapping is already off at this point it is probably because we are holding the disable snap key, toggle snapping back on
            if(args[1].snap !== undefined && !args[1].snap && !args[1].snapOverrideActive) {
                args[1].snap = true;
            }
            // For all other cases we turn off snapping
            else {
                args[1].snap = false;
            }

            return wrapped(...args);;
        }, 'WRAPPER');

        // oof
        // Override Drag Ruler's create waypoint keybind
        // We need to call setSnapOverride before Drag Ruler does its logic
        // This assumes that Drag Ruler was initialized before this module, which is a bad assumption but eh
        function overrideDragRulerCreateWaypointKeybind() {
            let keybind = game.keybindings.actions.get(`${DRAG_RULER_SETTINGS_KEY}.${DRAG_RULER_CREATE_WAYPOINT_KEY}`);
            let prevOnDown = keybind.onDown;
            game.keybindings.register(DRAG_RULER_SETTINGS_KEY, DRAG_RULER_CREATE_WAYPOINT_KEY, {
                name: keybind.name,
                onDown: () => {
                    checkAndSetSnapOverride(canvas.controls.ruler.draggedEntity);
                    prevOnDown();
                },
                editable: keybind.editable,
                precedence: keybind.precedence,
            });
        }
        overrideDragRulerCreateWaypointKeybind();
    }
});
