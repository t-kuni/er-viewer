/**
 * @jest-environment jsdom
 */

import { EventController } from '../public/js/events/event-controller.js';
import { StateManager } from '../public/js/state/state-manager.js';
import { CoordinateTransform } from '../public/js/utils/coordinate-transform.js';

describe('Entity Drag Functionality Tests', () => {
  let eventController;
  let stateManager;
  let coordinateTransform;
  let canvas;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <svg id="er-canvas" width="800" height="600">
        <g id="main-group" transform="translate(0, 0) scale(1)">
          <g class="entity" data-table="users" transform="translate(100, 100)">
            <rect class="entity-rect" width="180" height="120"></rect>
            <text class="entity-title" x="90" y="15">users</text>
            <text class="entity-column" data-column="id" x="10" y="50">id: INT</text>
          </g>
        </g>
      </svg>
    `;

    canvas = document.getElementById('er-canvas');
    stateManager = new StateManager();
    coordinateTransform = new CoordinateTransform();
    eventController = new EventController(canvas, stateManager, coordinateTransform);

    // Set up initial state with entity positions
    stateManager.setState({
      layoutData: {
        entities: {
          users: { x: 100, y: 100 }
        },
        rectangles: [],
        texts: []
      }
    });

    // Mock console to reduce noise
    console.log = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should start entity dragging when mousedown on entity', () => {
    const entity = document.querySelector('.entity[data-table="users"]');
    
    // Simulate mousedown on entity
    const mouseDownEvent = {
      preventDefault: jest.fn(),
      button: 0,
      clientX: 150,
      clientY: 120,
      target: entity
    };

    eventController.handleMouseDown(mouseDownEvent);

    // Check that dragging mode was set
    const currentState = stateManager.getState();
    expect(currentState.interactionMode).toBe('dragging-entity');
    expect(currentState.dragState.tableName).toBe('users');
    expect(currentState.dragState.startPosition).toEqual({ x: 100, y: 100 });
  });

  test('should update entity position during dragging', () => {
    const entity = document.querySelector('.entity[data-table="users"]');
    
    // Start dragging
    const mouseDownEvent = {
      preventDefault: jest.fn(),
      button: 0,
      clientX: 150,
      clientY: 120,
      target: entity
    };
    eventController.handleMouseDown(mouseDownEvent);

    // Simulate mouse movement
    const mouseMoveEvent = {
      clientX: 200, // Moved 50 pixels right
      clientY: 150  // Moved 30 pixels down
    };
    eventController.handleMouseMove(mouseMoveEvent);

    // Check that entity position was updated in layout data
    const currentState = stateManager.getState();
    const userPosition = currentState.layoutData.entities.users;
    
    // The new position should reflect the movement
    expect(userPosition.x).toBeGreaterThan(100);
    expect(userPosition.y).toBeGreaterThan(100);
  });

  test('should end entity dragging on mouseup', () => {
    const entity = document.querySelector('.entity[data-table="users"]');
    
    // Start dragging
    const mouseDownEvent = {
      preventDefault: jest.fn(),
      button: 0,
      clientX: 150,
      clientY: 120,
      target: entity
    };
    eventController.handleMouseDown(mouseDownEvent);

    // Move the entity
    const mouseMoveEvent = {
      clientX: 200,
      clientY: 150
    };
    eventController.handleMouseMove(mouseMoveEvent);

    // End dragging
    const mouseUpEvent = {
      target: entity
    };
    eventController.handleMouseUp(mouseUpEvent);

    // Check that interaction mode is reset
    const currentState = stateManager.getState();
    expect(currentState.interactionMode).toBe('default');
    expect(currentState.dragState).toBeNull();
  });

  test('should handle entity dragging when entity has no initial position', () => {
    // Remove entity position from layout data
    stateManager.setState({
      layoutData: {
        entities: {},
        rectangles: [],
        texts: []
      }
    });

    const entity = document.querySelector('.entity[data-table="users"]');
    
    // Simulate mousedown on entity
    const mouseDownEvent = {
      preventDefault: jest.fn(),
      button: 0,
      clientX: 150,
      clientY: 120,
      target: entity
    };

    eventController.handleMouseDown(mouseDownEvent);

    // Check that dragging mode was set with position extracted from DOM
    const currentState = stateManager.getState();
    expect(currentState.interactionMode).toBe('dragging-entity');
    expect(currentState.dragState.tableName).toBe('users');
    expect(currentState.dragState.startPosition).toEqual({ x: 100, y: 100 });
  });

  test('should not start entity dragging on background click', () => {
    // Simulate mousedown on canvas background (not on entity)
    const mouseDownEvent = {
      preventDefault: jest.fn(),
      button: 0,
      clientX: 50,
      clientY: 50,
      target: canvas // Canvas itself, not an entity
    };

    eventController.handleMouseDown(mouseDownEvent);

    // Check that panning mode was set instead of dragging
    const currentState = stateManager.getState();
    expect(currentState.interactionMode).toBe('panning');
  });

  test('should prevent click after dragging movement', () => {
    const entity = document.querySelector('.entity[data-table="users"]');
    
    // Start dragging
    eventController.handleMouseDown({
      preventDefault: jest.fn(),
      button: 0,
      clientX: 150,
      clientY: 120,
      target: entity
    });

    // Check initial state
    expect(eventController.dragStartPoint).toEqual({ x: 150, y: 120 });
    expect(eventController.hasDragMovement).toBe(false);

    // Move significantly (should exceed the 5 pixel threshold)
    eventController.handleMouseMove({
      clientX: 180, // Moved 30 pixels right
      clientY: 150  // Moved 30 pixels down
    });

    // Check that drag movement was detected after movement
    // Distance should be sqrt((180-150)^2 + (150-120)^2) = sqrt(30^2 + 30^2) ≈ 42.4 pixels
    // This should definitely exceed the threshold of 5 pixels
    
    expect(eventController.hasDragMovement).toBe(true);

    // End dragging
    eventController.handleMouseUp({
      target: entity
    });

    // Check that lastHadDragMovement was set
    expect(eventController.lastHadDragMovement).toBe(true);

    // Simulate click - it should be prevented due to drag movement
    const clickHandler = jest.fn();
    eventController.on('entity-click', clickHandler);

    eventController.handleClick({
      target: entity,
      preventDefault: jest.fn()
    });

    // Click should not be triggered due to drag movement
    expect(clickHandler).not.toHaveBeenCalled();
  });
});