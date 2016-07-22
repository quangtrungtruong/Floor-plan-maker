var JQUERY = require('jquery');
	var THREE = require('three')

	var utils = require('../utils/utils')

	/*
	TODO
	var Vec2 = require('vec2')
	var segseg = require('segseg')
	var Polygon = require('polygon')
	*/

	var HalfEdge = require('./half_edge')

	var Room = function(floorplan, corners) {

	  var scope = this;

	  // ordered CCW
	  this.id = utils.guid();
	  var floorplan = floorplan;
	  this.corners = corners;
	  this.walls = [];
	  this.roomThickness = [];
	  this.thickness;
	  this.roomType = "";

	  this.interiorCorners = [];
	  this.edgePointer = null;
	  this.labelPos = {x:0, y:0};

	  // floor plane for intersection testing
	  this.floorPlane = null;

	  this.customTexture = false;
	  var tolerance = 30;

	  var defaultTexture = {
		url: "rooms/textures/hardwood.png",
		scale: 400
	  }

	  var floorChangeCallbacks = JQUERY.Callbacks();

	  updateWalls();
	  updateInteriorCorners();
	  generatePlane();

	  this.updateRoom = function(){
	    updateWalls();
	    updateInteriorCorners();
	    generatePlane();
	  }

	  this.getUuid = function() {
		var cornerUuids = utils.map(this.corners, function(c) {
		  return c.id;
		});
		cornerUuids.sort();
		return cornerUuids.join();
	  }

	  this.getId = function(){
	    return scope.id;
	  }

	  this.setId = function(id){
	    scope.id = id;
	  }

	  this.fireOnFloorChange = function(callback) {
		floorChangeCallbacks.add(callback);
	  }

	  this.getCornersInManyRooms = function(){
	    var cornerList = [];
	    updateWalls();
	    for (var i=0; i<scope.corners.length; i++){
	      //if ((corners[i].wallStarts.length>1) || (corners[i].wallEnds.length>1))
	      if (corners[i].adjacentCorners().length>2)
	        cornerList.push(corners[i]);
	    }
	    return cornerList;
	  }

	  this.getCornersInOnlyARoom = function(){
	    var cornerList = [];
	    for (var i=0; i<scope.corners.length; i++){
	      if ((corners[i].wallStarts.length==1) && (corners[i].wallEnds.length==1))
	        cornerList.push(corners[i]);
	    }
	    return cornerList;
	  }

	  this.setCorners = function(corners){
	    corners = corners;
	  }

	  /*this.determineMovingDirection = function(walls){
	    var corner1 = corners[0];
	    var corner2 = corners[1];
	    var dx = 0, dy = 0;
	    for (var i=0; i<corners.length; i++){
	      for (var j=0; j<walls.length; j++){
	        var distanceFromRoomToWall = utils.pointDistanceFromLine(corners[i].x, corners[i].y,
	        walls[j].getStart().x, walls[j].getStart().y, walls[j].getEnd().x, walls[j].getEnd().y);
	        if (distanceFromWall<tolerance){
	          var projectionPoint = utils.pointOnLine(walls[j].getStart().x, walls[j].getStart().y, walls[j].getEnd().x, walls[j].getEnd().y, corners[i].x, corners[i].y);
	          if (projectionPoint && (utils.))


	          var centerPoint = {x:(walls[j].getStart().x+walls[j].getEnd().x)/2, y:(walls[j].getStart().y+walls[j].getEnd().y)/2};
	          if ((utils.distance(corners[i].x, corners[i].y, centerPoint.x, centerPoint.y)&&(utils.angle(corners[i].x, corners[i].y, centerPoint.x, centerPoint.y)))<distanceToWall){

	          }
	        }
	      }
	    }
	  }*/

	  this.getCorners = function(){
	    return corners;
	  }

	  this.getTexture = function() {
		var uuid = this.getUuid();
		var tex = floorplan.getFloorTexture(uuid);
		return tex || defaultTexture;
	  }

	  // textureStretch always true, just an argument for consistency with walls
	  this.setTexture = function(textureUrl, textureStretch, textureScale) {
		var uuid = this.getUuid();
		floorplan.setFloorTexture(uuid, textureUrl, textureScale);
		floorChangeCallbacks.fire();
	  }

	  this.setGeneralThickness = function(thickness){
		if (thickness!=null){
		  roomThickness = [];
		  for (var i=0; i<corners.length; i++){
			roomThickness[i] = thickness;
		  }

		  for (var i=0; i<scope.walls.length; i++){
			scope.walls[i].setThickness(thickness);
		  }
		  thickness = thickness;
		}
	  }

      this.checkIsOne = function (comparisonRoom){
        for (var i=0; i<scope.corners.length; i++){
          if (comparisonRoom.corners.indexOf(scope.corners[i])==-1)
            for (var j=0; j<comparisonRoom.corners.length; j++){
          	  if (scope.corners.indexOf(comparisonRoom.corners[j])==-1)
                return false;
              }
        }
        return true;
      }

	  this.setThicknness = function(id, thickness){
		roomThickness[id] = thickness;
	  }

	  this.relativeMove = function(dx, dy) {
		for (var i=0; i<scope.corners.length; i++){
		  scope.corners[i].relativeMove(dx, dy)
		}
	  }

	  this.setRoomType = function(type){
	    scope.roomType = type;
	  }

	  this.getRoomType = function(){
	    return scope.roomType;
	  }

	  function generatePlane() {
		var points = [];
		utils.forEach( scope.interiorCorners, function(corner) {
			points.push(new THREE.Vector2(
			  corner.x,
			  corner.y));
		});
		var shape = new THREE.Shape(points);
		var geometry = new THREE.ShapeGeometry(shape);
		scope.floorPlane = new THREE.Mesh(geometry,
		  new THREE.MeshBasicMaterial({
			side: THREE.DoubleSide
		  }));
		scope.floorPlane.visible = false;
		scope.floorPlane.rotation.set(Math.PI/2, 0, 0);
		scope.floorPlane.room = scope; // js monkey patch
	  }
	// reference http://stackoverflow.com/questions/217578/how-can-i-determine-whether-a-2d-point-is-within-a-polygon/17490923#17490923
	 this.checkInsideRoom = function(x, y){
		var isInside = false;
		var minX = scope.corners[0].x, maxX = scope.corners[0].x;
		var minY = scope.corners[0].y, maxY = scope.corners[0].y;
		for (var i = 1; i < scope.corners.length; i++) {
			var q = scope.corners[i];
			minX = Math.min(q.x, minX);
			maxX = Math.max(q.x, maxX);
			minY = Math.min(q.y, minY);
			maxY = Math.max(q.y, maxY);
		}

		if (x < minX || x > maxX || y < minY || y > maxY) {
			return false;
		}

		var i = 0, j = scope.corners.length - 1;
		for (i, j; i < scope.corners.length; j = i++) {
			if ( (scope.corners[i].y > y) != (scope.corners[j].y > y) &&
					x < (scope.corners[j].x - scope.corners[i].x) * (y - scope.corners[i].y) / (scope.corners[j].y - scope.corners[i].y) + scope.corners[i].x ) {
				isInside = !isInside;
			}
		}

		return true;
	  }

	  function setThickness(val){
		thickness = [];
		for (var i =0; i< room.walls.length; i++){
		  thickness.push(val);
		}
	  }

	  function cycleIndex(ind) {
		if (ind < 0) {
		  return ind += scope.corners.length;
		} else {
		  return ind % scope.corners.length;
		}
	  }

	  function updateInteriorCorners() {
		var edge = scope.edgePointer;
		while (true) {
		  scope.interiorCorners.push(edge.interiorStart());
		  edge.generatePlane();
		  if (edge.next === scope.edgePointer) {
			break;
		  } else {
			edge = edge.next;
		  }
		}
	  }

	  // populates each wall's half edge relating to this room
	  // this creates a fancy doubly connected edge list (DCEL)
	  function updateWalls() {

		var prevEdge = null;
		var firstEdge = null;

		for (i = 0; i < corners.length; i++) {

		  var edge = null;
		  var firstCorner = corners[i];
		  var secondCorner = corners[(i + 1) % corners.length];

		  // find if wall is heading in that direction
		  var wallTo = firstCorner.wallTo(secondCorner);
		  var wallFrom = firstCorner.wallFrom(secondCorner);

		  if (wallTo) {
			edge = new HalfEdge(scope, wallTo, true);
		  } else if (wallFrom) {
			edge = new HalfEdge(scope, wallFrom, false);
		  } else {
			// something horrible has happened
			console.log("corners arent connected by a wall, uh oh");
		  }

		  if (i == 0) {
			firstEdge = edge;
		  }  else {
			edge.prev = prevEdge;
			prevEdge.next = edge;
			if (i + 1 == corners.length) {
			  firstEdge.prev = edge;
			  edge.next = firstEdge;
			}
		  }
		  prevEdge = edge;
		}

		// hold on to an edge reference
		scope.edgePointer = firstEdge;
	  }

	}

	module.exports = Room;