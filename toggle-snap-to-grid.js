'use strict';

import { libWrapper } from './shim.js';

const TSTG_MODULE_NAME = "Toggle Snap to Grid";
const TSTG_MODULE_ID = "toggle-snap-to-grid";
const TSTG_FLAG_NAME = "TSTG.snapToGrid"

const DRAG_MEASUREMENT_SETTING_NAME = "measurement_setting";

const DRAG_MEASUREMENT_IGNORE_GRID_NO_HIGHLIGHT = 0;
const DRAG_MEASUREMENT_GRID_NO_HIGHLIGHT = 1;
const DRAG_MEASUREMENT_GRID_HIGHLIGHT = 2;

let TSTG_gridlessGrid = undefined;

class SnapToGridButton {
    static async getStateFromToken(token) {
        let state = token.document.getFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME);

        // Just in case, this fixes any cases where our flag is undefined
        if (state === undefined) {
            await this.fixUndefinedSnapToGridValue(token);
            state = token.document.getFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME);
        }

        return state;
    }

    // Toggle the grid snapping flag for a token
    static async toggleSnapToGrid(token) {
        let state = undefined;
        if (token) {
            // Initialize from the token the HUD is on
            state = await SnapToGridButton.getStateFromToken(token);
        }

        // Process each controlled token, as well as the reference token
        const tokens = canvas.tokens.controlled.filter(async t => t.document.getFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME) !== state);
        for (let t of tokens) {
            if (state === undefined) {
                // No initializing token, get the state from the first selected.
                state = await SnapToGridButton.getStateFromToken(t);
            }
            await this.setSnapToGrid(t, !state);
        }
    }

    // Set the value of our grid snapping flag and
    //      toggle the TokenHUD button's visuals if available
    static async setSnapToGrid(token, newValue) {
        await token.document.setFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME, newValue);
        token.ruler._onVisibleChange();
    }

    // Add the default value of a our grid snapping flag to the token
    //      in an event where it is not there
    static async fixUndefinedSnapToGridValue(token) {
        console.log(`${TSTG_MODULE_NAME} found a token with no setToGrid flag. Adding...`);
        await this.setSnapToGrid(token, true);
    }

    static async toggleSnapToGridButtonHandler(event, target) {
        await SnapToGridButton.toggleSnapToGrid(this.object);
    }

    // Create the HTML elements for the HUD button including the Font Awesome icon and tooltop.
    static createButton() {
        let button = document.createElement("button");
        button.setAttribute("type", "button");
        button.classList.add("control-icon");
        button.setAttribute("data-action", "TSTG_toggleSnapToGrid");
        button.setAttribute("data-tooltip", "TSTG.TooltipText");
        button.innerHTML = `<i class="fas fa-border-all fa-fw"></i>`
        return button;
    }

    // Adds the button to the Token HUD and attaches event listeners.
    static async prepTokenHUD(hud, html, tokenData) {
        const snapButton = this.createButton();
        html.querySelector(".right").append(snapButton);

        // Set whether the button's visuals should be active or inactive 
        //      based on the token's grid snappng sate
        let token = canvas.tokens.get(tokenData._id);
        let value = token.document.getFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME);
        snapButton.classList.toggle("active", value);
    }
}

function shouldUseDefault(token) {
    return canvas.grid.type == CONST.GRID_TYPES.GRIDLESS || (token.document ?? token).getFlag(TSTG_MODULE_ID, TSTG_FLAG_NAME);
}

// Modify an event to toggle snapping
function modifyEvent(token, event) {
    // Default behavior if this is a gridless map or if grid snapping is enabled
    if (shouldUseDefault(token)) {
        return event;
    }

    // Overwrite the shiftKey property so Foundry's behavior changes
    // Allow shift key to reverse the unsnap if it is being held down
    event.shiftKey = !event.shiftKey;
    return event;
}

// Create a gridless grid that we will use for measurements
function createGridlessGrid() {
    // Copy Scene:#getGrid
    const grid = game.scenes.current.grid;
    const config = {
        size: grid.size,
        distance: grid.distance,
        units: grid.units,
        style: grid.style,
        thickness: grid.thickness,
        color: grid.color,
        alpha: grid.alpha
    };

    return new foundry.grid.GridlessGrid(config);
}

// Initialize module
Hooks.once('init', function () {
    console.log(`Initializing "${TSTG_MODULE_NAME}"`);

    // Settings
    let dragMeasurementSetting = DRAG_MEASUREMENT_IGNORE_GRID_NO_HIGHLIGHT;
    function parseDragMeasurementSetting(value) {
        if (value == "gridNoHighlight") {
            dragMeasurementSetting = DRAG_MEASUREMENT_GRID_NO_HIGHLIGHT;
        }
        else if (value == "gridHighlight") {
            dragMeasurementSetting = DRAG_MEASUREMENT_GRID_HIGHLIGHT;
        }
        else {
            dragMeasurementSetting = DRAG_MEASUREMENT_IGNORE_GRID_NO_HIGHLIGHT;
        }
    }
    game.settings.register(TSTG_MODULE_ID, DRAG_MEASUREMENT_SETTING_NAME, {
        name: game.i18n.localize("TSTG.DragMeasurementSettingName"),
        hint: game.i18n.localize("TSTG.DragMeasurementSettingHint"),
        scope: "client",
        type: String,
        choices: {
            "ignoreGridNoHighlight": game.i18n.localize("TSTG.DragMeasurementSettingIgnoreGridNoHighlight"),
            "gridNoHighlight": game.i18n.localize("TSTG.DragMeasurementSettingGridNoHighlight"),
            "gridHighlight": game.i18n.localize("TSTG.DragMeasurementSettingGridHighlight"),
        },
        default: "ignoreGridNoHighlight",
        config: true,
        onChange: value => {
            parseDragMeasurementSetting(value);
        }
    });
    parseDragMeasurementSetting(game.settings.get(TSTG_MODULE_ID, DRAG_MEASUREMENT_SETTING_NAME));

    // Keybindings
    const TSTG_TOGGLE_ACTION = 'mirrorTokenHorizontal';
    game.keybindings.register(TSTG_MODULE_ID, TSTG_TOGGLE_ACTION, {
        name: game.i18n.localize("TSTG.KeybindingToggleName"),
        hint: game.i18n.localize("TSTG.KeybindingToggleHint"),
        editable: [],
        onDown: event => {
            SnapToGridButton.toggleSnapToGrid();
            return true;
        },
    });

    // Inject the callback into the TokenHUD ApplicationV2.
    CONFIG.Token.hudClass.DEFAULT_OPTIONS.actions.TSTG_toggleSnapToGrid = SnapToGridButton.toggleSnapToGridButtonHandler;

    // Wrap around Foundry so we can move tokens off of the grid
    libWrapper.register(TSTG_MODULE_ID, 'CONFIG.Token.objectClass.prototype._onDragLeftDrop', function (wrapped, ...args) {

        args[0] = modifyEvent(this, args[0]);
        return wrapped(...args);
    }, 'WRAPPER');
    libWrapper.register(TSTG_MODULE_ID, 'CONFIG.Token.objectClass.prototype._onDragLeftMove', function (wrapped, ...args) {

        args[0] = modifyEvent(this, args[0]);
        return wrapped(...args);
    }, 'WRAPPER');

    // Toggle snapping when adding a drag waypoint
    libWrapper.register(TSTG_MODULE_ID, 'CONFIG.Token.objectClass.prototype._addDragWaypoint', function (wrapped, ...args) {
        if (!shouldUseDefault(this)) {
            args[1].snap = !args[1].snap;
        }
        return wrapped(...args);
    }, 'WRAPPER');

    // If needed, turn off the grid highlight
    libWrapper.register(TSTG_MODULE_ID, 'CONFIG.Token.rulerClass.prototype._onVisibleChange', function (wrapped, ...args) {
        let result = wrapped(...args);

        if (this.visible) {
            if (dragMeasurementSetting == DRAG_MEASUREMENT_IGNORE_GRID_NO_HIGHLIGHT || dragMeasurementSetting == DRAG_MEASUREMENT_GRID_NO_HIGHLIGHT) {
                if (!shouldUseDefault(this.token)) {
                    // The highlightLayer field is private... luckily we can grab it through the grid object
                    let highlightId = `TokenRuler.${this.token.document.id}`;
                    let highlightLayer = canvas.interface.grid.getHighlightLayer(highlightId);
                    if (highlightLayer) {
                        highlightLayer.visible = false;
                    }
                }
            }
        }

        return result;
    }, 'WRAPPER');

    // If needed, use gridless measurement
    libWrapper.register(TSTG_MODULE_ID, 'CONFIG.Token.documentClass.prototype.measureMovementPath', function (wrapped, ...args) {
        const setToGridless = dragMeasurementSetting == DRAG_MEASUREMENT_IGNORE_GRID_NO_HIGHLIGHT && !shouldUseDefault(this);
        const grid = this.parent?.grid ?? foundry.documents.BaseScene.defaultGrid;

        // Temporarily set the used grid to our gridless grid
        if (setToGridless && TSTG_gridlessGrid) {
            if (this.parent) {
                this.parent.grid = TSTG_gridlessGrid;
            }
            else {
                foundry.documents.BaseScene.defaultGrid = TSTG_gridlessGrid;
            }
        }

        let result = wrapped(...args);

        if (setToGridless) {
            if (this.parent) {
                this.parent.grid = grid;
            }
            else {
                foundry.documents.BaseScene.defaultGrid = grid;
            }
        }

        return result;
    }, 'WRAPPER');
});

// Hook our button onto the TokenHUD
Hooks.on("renderTokenHUD", (...args) => SnapToGridButton.prepTokenHUD(...args));

// If we click on a token and our custom property is undefined, set it to true by default
Hooks.on('controlToken', async (token, controlled) => {
    if (!controlled || token.document.flags[TSTG_MODULE_ID]) {
        return;
    }

    await SnapToGridButton.fixUndefinedSnapToGridValue(token);
});

// Create our own gridless grid for gridless measurement
Hooks.on('canvasReady', () => TSTG_gridlessGrid = createGridlessGrid());