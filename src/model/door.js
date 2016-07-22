var JQUERY = require('jquery');
	var utils = require('../utils/utils')

	// start and end are Corner objects
	var Door = function(floorplan, x, y) {

	  this.id = utils.guid();

	  var scope = this;

	  this.thickness = 10;
	  this.height = 170;
	  this.width = 100;
	  this.tolerance = 40;

	  var centerX = x;
	  var centerY = y;
	  var closestWall = null;

	  var start = [x - this.width/2, y];
	  var end = [x + this.width/2, y];

	  var floorplan = floorplan;

	  // front is the plane from start to end
	  // these are of type HalfEdge
	  this.frontEdge = null;
	  this.backEdge = null;
	  this.orphan = false;

	  // items attached to this door
	  this.items = [];
	  this.onItems = [];

	  var moved_callbacks = JQUERY.Callbacks();
	  var deleted_callbacks = JQUERY.Callbacks();
	  var action_callbacks = JQUERY.Callbacks();

	  var defaultTexture =  {
		url: "rooms/textures/wallmap.png",
		stretch: true,
		scale: 0
	  }
	  this.frontTexture = defaultTexture;
	  this.backTexture = defaultTexture;


	  function getUuid() {
		return id;
	  }

	  this.resetFrontBack = function(func) {
		this.frontEdge = null;
		this.backEdge = null;
		this.orphan = false;
	  }

	  this.snapToAxis = function(tolerance) {
		// order here is important, but unfortunately arbitrary
		start.snapToAxis(tolerance);
		end.snapToAxis(tolerance);
	  }

	  this.fireOnMove = function(func) {
		moved_callbacks.add(func);
	  }

	  this.fireOnDelete = function(func) {
		deleted_callbacks.add(func);
	  }

	  this.dontFireOnDelete = function(func) {
		deleted_callbacks.remove(func);
	  }

	  this.fireOnAction = function(func) {
		action_callbacks.add(func)
	  }

	  this.fireAction = function(action) {
		action_callbacks.fire(action)
	  }

	  this.getStart = function() {
		return start;
	  }

	  this.relativeMove = function(dx, dy) {
		start[0] += dx; start[1] += dy;
		end[0] += dx; end[1] += dy;
		centerX += dx; centerY += dy;
	  }

	  this.arrangeDoor = function(walls){
		var orientationId = this.getClosestWall(walls);
		if (!orientationId)
		  return;

		var cor1 = utils.determineLineByVector(centerX, centerY, walls[orientationId].start.x-walls[orientationId].end.x,
		walls[orientationId].start.y-walls[orientationId].end.y, scope.width/2);
		var cor2 = utils.determineLineByVector(centerX, centerY, walls[orientationId].end.x-walls[orientationId].start.x,
		walls[orientationId].end.y - walls[orientationId].start.y, scope.width/2);
		start = [cor1.x, cor1.y];
		end = [cor2.x, cor2.y];
	  }

	  this.getClosestWall = function(walls){
		var minDistance = null;
		var orientationId = null;
		for (var i=0;walls && (i < walls.length); i++){
		  if (!minDistance || minDistance > this.distanceFromWall(walls[i])){
			minDistance = this.distanceFromWall(walls[i]);
			orientationId = i;
		  }
		}
		return orientationId;
	  }

	  this.distanceFromWall = function(wall){
		if (!wall)
		  return null;
		return utils.pointDistanceFromLine(centerX, centerY,
		  wall.start.x, wall.start.y,
		  wall.end.x, wall.end.y);
	  }

	  this.mergeWithIntersected = function(walls) {
		scope.closestWall = walls[this.getClosestWall(walls)];
		if (this.distanceFromWall(scope.closestWall)<scope.tolerance){
		  var center = utils.pointOnLine(scope.closestWall.start, scope.closestWall.end, {x:centerX, y:centerY});
		  if (center)
			this.relativeMove(center.x-centerX, center.y-centerY);
		}
	  }

	  this.checkClosestWall = function(){
		if (this.distanceFromWall(scope.closestWall)<scope.tolerance)
		  return scope.closestWall;
		else
		  return null;
	  }

	  this.fireMoved = function() {
		moved_callbacks.fire();
	  }

	  this.fireRedraw = function() {
		if (scope.frontEdge) {
		  scope.frontEdge.redrawCallbacks.fire();
		}
		if (scope.backEdge) {
		  scope.backEdge.redrawCallbacks.fire();
		}
	  }

	  this.getThickness = function(){
		return scope.thickness;
	  }

	  this.getEnd = function() {
		return end;
	  }

	  this.getStartX = function() {
		return start[0];
	  }

	  this.setWidth = function(val){
		this.width = val;
		start = [centerX - this.width/2, centerY];
		end = [centerX + this.width/2, centerY];
	  }

	  this.getEndX = function() {
		return end[0];
	  }

	  this.getStartY = function() {
		return start[1];
	  }

	  this.getEndY = function() {
		return end[1];
	  }

	  this.remove = function() {
		deleted_callbacks.fire(this);
	  }

	  this.distanceFrom = function(x, y) {
		return utils.pointDistanceFromLine(x, y,
		  this.getStartX(), this.getStartY(),
		  this.getEndX(), this.getEndY());
	  }
	}

	module.exports = Door;