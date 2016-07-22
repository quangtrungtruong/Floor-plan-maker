var JQUERY = require('jquery');
	var THREE = require('three')

	var Wall = require('./wall')
	var Corner = require('./corner')
	var Room = require('./room')
	var HalfEdge = require('./half_edge')
	var Door = require('./door')
	var Window = require('./window')

	var utils = require('../utils/utils')

	var Floorplan = function() {

	  var scope = this;
	  var walls = [];
	  var corners = [];
	  var rooms = [];
	  var doors = [];

	  var context = null;

	  var roomThickness;

	  // Track floor textures here, since rooms are destroyed and
	  // created each time we change the floorplan.
	  this.floorTextures = {}

	  var new_wall_callbacks = JQUERY.Callbacks();
	  var new_corner_callbacks = JQUERY.Callbacks();
	  var redraw_callbacks = JQUERY.Callbacks();
	  var updated_rooms = JQUERY.Callbacks();
	  this.roomLoadedCallbacks = JQUERY.Callbacks();

	  var defaultTolerance = 10.0;
	  this.tolerance = 10.0;

	  // hack
	  this.wallEdges = function() {
		var edges = []
		utils.forEach(walls, function(wall) {
		  if (wall.frontEdge) {
			edges.push(wall.frontEdge);
		  }
		  if (wall.backEdge) {
			edges.push(wall.backEdge);
		  }
		});
		return edges;
	  }

	  // hack
	  this.wallEdgePlanes = function() {
		var planes = []
		utils.forEach(walls, function(wall) {
		  if (wall.frontEdge) {
			planes.push(wall.frontEdge.plane);
		  }
		  if (wall.backEdge) {
			planes.push(wall.backEdge.plane);
		  }
		});
		return planes;
	  }

	  this.floorPlanes = function() {
		return utils.map(rooms, function(room) {
		  return room.floorPlane;
		});
	  }

	  this.fireOnNewWall = function(callback) {
		new_wall_callbacks.add(callback);
	  }

	  this.fireOnNewCorner = function(callback) {
		new_corner_callbacks.add(callback);
	  }

	  this.fireOnRedraw = function(callback) {
		redraw_callbacks.add(callback);
	  }

	  this.fireOnUpdatedRooms = function(callback) {
		updated_rooms.add(callback);
	  }

	  this.newWall = function(start, end) {
		var wall = new Wall(start, end);
		walls.push(wall)
		wall.fireOnDelete(removeWall);
		new_wall_callbacks.fire(wall);
		scope.update();
		return wall;
	  }

	  this.newRoom = function(corners) {
		var ids = [];
		for (var i =0; i<corners.length; i++){
		  var wall = this.newWall(corners[i], corners[(i+1)%corners.length]);
		  ids.push(wall);
		}

		var room = new Room(this, corners);
		room.walls = ids;
		room.setGeneralThickness(roomThickness);
		for (var i=0; i<room.walls.length; i++){
		   for (j=0; j<walls.length; j++)
			 if (walls[j]==room.walls[i])
			   walls[j].rooms.push(room);
		}
		rooms.push(room);

		scope.update();
		return room;
	  }

	  this.setRoomThickness = function(thickness){
		roomThickness = thickness;
	  }

	  this.newDoor = function(x, y){
		var door = new Door(this, x, y);
		doors.push(door);
		scope.update();
		return door;
	  }

	    this.newWindow = function(x, y){
		var window = new Window(this, x, y);
		windows.push(window);
		scope.update();
		return window;
	  }

	  function removeWall(wall) {
		utils.removeValue(walls, wall);
		scope.update();
	  }

	  this.removeWall = function(wall){
	    wall.start.detachWall(wall);
		wall.end.detachWall(wall);
		removeWall(wall);
	  }

	  this.newCorner = function(x, y, id) {
		var corner = new Corner(this, x, y, id);
		corners.push(corner);
		corner.fireOnDelete(removeCorner);
		new_corner_callbacks.fire(corner);
		return corner;
	  }

	  function removeCorner(corner) {
		utils.removeValue(corners, corner);
	  }


	  this.getWalls = function() {
		return walls;
	  }

	  this.getCorners = function() {
		return corners;
	  }

	  this.getRooms = function() {
		return rooms;
	  }

	  this.clear = function(){
	    corners = [];
	    walls = [];
	    rooms = [];
	    doors = [];
	    windows = [];
	    update();
	  }

	  this.getRoomIdBaseWall = function(wall){
		if (!wall)
		  return null;
		for (var i=0; i<rooms.length; i++)
		  /*for (var j=0; j<rooms[i].corners.length; j++){
			if ((rooms[i].corners[j]==wall.getStart() && rooms[i].corners[(j+1)%rooms[i].corners.length].end) ||
			  (rooms[i].corners[j]==wall.getEnd() && rooms[i].corners[(j+1)%rooms[i].corners.length].start))
				return rooms[i].id;
		  }*/
		  if ((rooms[i].getCorners().indexOf(wall.getStart())>-1) && (rooms[i].getCorners().indexOf(wall.getEnd())>-1))
		    return rooms[i].getId();
	  }

	  this.setContext = function(contextReal, canvas){
		var canvasElement = document.getElementById(canvas);
		context = canvasElement.getContext('2d');
		context = contextReal;
	  }

	  this.getContext = function(){
		return context;
	  }

	  this.getDoors = function(){
		return doors;
	  }

	  this.getWindows = function(){
		return windows;
	  }

	  this.removeCorner = function(iCount){
		corners.splice(iCount, 1);
		scope.update();
	  }

	  this.addCornerInWall = function(wall, mouseX, mouseY){
		var start = wall.start;
		var end = wall.end;
		var thickness = wall.thickness;
		var betweenPoint = utils.determinePointByVector(start.x, start.y, end.x, end.y, mouseX, mouseY);
		var corner = new Corner(this, betweenPoint.x, betweenPoint.y);
		var wall1 = new Wall(start, corner);
		var wall2 = new Wall(corner, end);
		start.detachWall(wall);
		end.detachWall(wall);
		removeWall(wall);
		wall1.thickness = thickness;
		wall2.thickness = thickness;
		walls.push(wall1);
		walls.push(wall2);
		corners.push(corner);
		scope.update();
	  }

	  this.overlappedCorner = function(x, y, tolerance) {
		tolerance = tolerance || defaultTolerance;
		for (i = 0; i < corners.length; i++) {
		  if (corners[i].distanceFrom(x, y) < tolerance) {
			//console.log("got corner")
			return corners[i];
		  }
		}
		return null;
	  }

	  this.overlappedWall = function(x, y, tolerance) {
		tolerance = tolerance || defaultTolerance;
		for (i = 0; i < walls.length; i++) {
		  var toleranceWall = tolerance;
		  if (tolerance<walls[i].getThickness())
			tolleranceWall = walls[i].getThickness();
		  if (walls[i].distanceFrom(x, y) < toleranceWall) {
			return walls[i];
		  }
		}
		return null;
	  }

	  this.overlappedRoom = function(x, y, startX, startY) {
		for (i = 0; i < rooms.length; i++) {
		  if (utils.pointInPolygon(x, y, rooms[i].corners, startX, startY))
			return rooms[i];
		}
		return null;
	  }

	  this.overlappedDoor = function(x, y, tolerance) {
		tolerance = tolerance || defaultTolerance;
		for (i = 0; i < doors.length; i++) {
		  var toleranceDoor = tolerance;
		  if (tolerance<doors[i].getThickness())
			tolleranceDoor = doors[i].getThickness();
		  if (doors[i].distanceFrom(x, y) < toleranceDoor) {
			return doors[i];
		  }
		}
		return null;
	  }

	    this.overlappedWindow = function(x, y, tolerance) {
		tolerance = tolerance || defaultTolerance;
		for (i = 0; i < windows.length; i++) {
		  var toleranceWindow = tolerance;
		  if (tolerance<windows[i].getThickness())
			tolleranceWindow = windows[i].getThickness();
		  if (windows[i].distanceFrom(x, y) < toleranceWindow) {
			return windows[i];
		  }
		}
		return null;
	  }
	  // import and export -- cleanup

	  this.saveFloorplan = function() {
		var floorplan = {
		  corners: {},
		  walls: [],
		  wallTextures: [],
		  floorTextures: {}
		}
		utils.forEach(corners, function(corner) {
		  floorplan.corners[corner.id] = {
			'x': corner.x,
			'y': corner.y
		  };
		});
		utils.forEach(walls, function(wall) {
		  floorplan.walls.push({
			'corner1': wall.getStart().id,
			'corner2': wall.getEnd().id,
			'frontTexture': wall.frontTexture,
			'backTexture': wall.backTexture
		  });
		});
		floorplan.newFloorTextures = this.floorTextures;
		return floorplan;
	  }

	  this.loadFloorplan = function( floorplan ) {
		this.reset();

		var corners = {};
		if (floorplan == null || !('corners' in floorplan) || !('walls' in floorplan)) {
		  return
		}
		for (var id in floorplan.corners) {
		  var corner = floorplan.corners[id];
		  corners[id] = this.newCorner(corner.x, corner.y, id);
		}
		utils.forEach(floorplan.walls, function(wall) {
		  var newWall = scope.newWall(
			corners[wall.corner1], corners[wall.corner2]);
		  if (wall.frontTexture) {
			newWall.frontTexture = wall.frontTexture;
		  }
		  if (wall.backTexture) {
			newWall.backTexture = wall.backTexture;
		  }
		});

		if ('newFloorTextures' in floorplan) {
		  this.floorTextures = floorplan.newFloorTextures;
		}

		this.update();
		this.roomLoadedCallbacks.fire();
	  }

	  this.getFloorTexture = function(uuid) {
		if (uuid in this.floorTextures) {
		  return this.floorTextures[uuid];
		} else {
		  return null;
		}
	  }

	  this.setFloorTexture = function(uuid, url, scale) {
		this.floorTextures[uuid] = {
		  url: url,
		  scale: scale
		}
	  }

	  // clear out obsolete floor textures
	  function updateFloorTextures() {
		var uuids = utils.map(rooms, function(room) {
		  return room.getUuid();
		});
		for (var uuid in scope.floorTextures) {
		  if (!utils.hasValue(uuids, uuid)) {
			delete scope.floorTextures[uuid]
		  }
		}
	  }

	  this.reset = function() {
		var tmpCorners = corners.slice(0);
		var tmpWalls = walls.slice(0);
		utils.forEach(tmpCorners, function(c) {
		  c.remove();
		})
		utils.forEach(tmpWalls, function(w) {
		  w.remove();
		})
		corners = [];
		walls = [];
	  }

	  // update rooms
	  this.update = function() {

		utils.forEach(walls, function(wall) {
		  wall.resetFrontBack();
		});

		/*// merger corners having the same position
		for (var i=0; i<corners.length(); i++){
		  for (var j=(i+1); j<corners.length(); j++)
		    if (utils.distance(corners[i].x, corners[i].y, corners[j].x, corners[j].y])==0){

		    }
		}*/

		var roomCorners = findRooms(corners);
		var lastRooms = rooms;
		rooms = [];
		utils.forEach(roomCorners, function(corners) {
		  rooms.push(new Room(scope, corners));
		});

		for (var i=0; i<lastRooms.length; i++){
		  for (var j=0; j<rooms.length; j++)
		    if (lastRooms[i].checkIsOne(rooms[j])==true){
		      rooms[j].labelPos = lastRooms[i].labelPos;
		      rooms[j].roomType = lastRooms[i].roomType;
		      rooms[j].setId(lastRooms[i].getId());
		    }
		}

		lastRooms = [];

		assignOrphanEdges();

		updateFloorTextures();
		updated_rooms.fire();
	  }

	  // returns the center of the floorplan in the y-plane
	  this.getCenter = function() {
		return this.getDimensions(true);
	  }

	  this.getSize = function() {
		return this.getDimensions(false);
	  }

	  this.getDimensions = function(center) {
		center = center || false; // otherwise, get size

		var xMin = Infinity;
		var xMax = -Infinity;
		var zMin = Infinity;
		var zMax = -Infinity;
		utils.forEach(corners, function(c) {
		  if (c.x < xMin) xMin = c.x;
		  if (c.x > xMax) xMax = c.x;
		  if (c.y < zMin) zMin = c.y;
		  if (c.y > zMax) zMax = c.y;
		});
		var ret;
		if (xMin == Infinity || xMax == -Infinity || zMin == Infinity || zMax == -Infinity) {
			ret = new THREE.Vector3();
		} else {
		  if (center) {
			// center
			ret = new THREE.Vector3( (xMin + xMax) * 0.5, 0, (zMin + zMax) * 0.5 );
		  } else {
			// size
			ret = new THREE.Vector3( (xMax - xMin), 0, (zMax - zMin) );
		  }
		}
		return ret;
	  }

	  this.creatCornersByTheIntersectionWall = function(wall){
	    var wallList = [];
	    for (var i=0; i<walls.length; i++){
	      var distance1 = utils.pointDistanceFromLine(wall.start.x, wall.start.y, walls[i].start.x, walls[i].start.y, walls[i].end.x, walls[i].end.y);
	      var distance2 = utils.pointDistanceFromLine(wall.end.x, wall.end.y, walls[i].start.x, walls[i].start.y, walls[i].end.x, walls[i].end.y);
	      if (utils.lineLineIntersect(wall.start.x, wall.start.y, wall.end.x, wall.end.y, walls[i].start.x, walls[i].start.y,
	      walls[i].end.x, walls[i].end.y) && (distance1>scope.tolerance) && (distance2>scope.tolerance)){
	        wallList.push(walls[i]);
	      }
	    }


	    for (var i=0; i<wallList.length; i++){
	        var intersectionCorner = utils.getCornerLinesIntersection(wall.start.x, wall.start.y, wall.end.x, wall.end.y,
	        wallList[i].start.x, wallList[i].start.y, wallList[i].end.x, wallList[i].end.y);
	        var corner = new Corner(this, intersectionCorner.x, intersectionCorner.y);

	        var start1 = walls[i].getStart();
		    var end1 = walls[i].getEnd();
		    var wall1 = new Wall(start1, corner);
		    var wall2 = new Wall(corner, end1);
		    removeWall(walls[i]);
		    start1.detachWall(walls[i]);
			end1.detachWall(walls[i]);
			//wall1.thickness = thickness;
			//wall2.thickness = thickness;
			walls.push(wall1);
			walls.push(wall2);

			var start2 = wall.getStart();
		    var end2 = wall.getEnd();
		    var wall3 = new Wall(start2, corner);
		    var wall4 = new Wall(corner, end2);

		    start2.detachWall(wall);
			end2.detachWall(wall);
			//wall1.thickness = thickness;
			//wall2.thickness = thickness;
			walls.push(wall3);
			walls.push(wall4);
			corners.push(corner);
	      }
	  }

	  function assignOrphanEdges() {
		// kinda hacky
		// find orphaned wall segments (i.e. not part of rooms) and
		// give them edges
		orphanWalls = []
		utils.forEach(walls, function(wall) {
		  if (!wall.backEdge && !wall.frontEdge) {
			wall.orphan = true;
			var back = new HalfEdge(null, wall, false);
			back.generatePlane();
			var front = new HalfEdge(null, wall, true);
			front.generatePlane();
			orphanWalls.push(wall);
		  }
		});

	  }

	};

	/*
	 * Find the "rooms" in our planar straight-line graph.
	 * Rooms are set of the smallest (by area) possible cycles in this graph.
	 */
	// corners has attributes: id, x, y, adjacents
	function findRooms(corners) {

	  function calculateTheta(previousCorner, currentCorner, nextCorner) {
		var theta = utils.angle2pi(
		  previousCorner.x - currentCorner.x,
		  previousCorner.y - currentCorner.y,
		  nextCorner.x - currentCorner.x,
		  nextCorner.y - currentCorner.y);
		return theta;
	  }

	  function removeDuplicateRooms(roomArray) {
		var results = [];
		var lookup = {};
		var hashFunc = function(corner) {
		  return corner.id
		};
		var sep = '-';
		for (var i = 0; i < roomArray.length; i++) {
		  // rooms are cycles, shift it around to check uniqueness
		  var add = true;
		  var room = roomArray[i];
		  for (var j = 0; j < room.length; j++) {
			var roomShift = utils.cycle(room, j);
			var str = utils.map(roomShift, hashFunc).join(sep);
			if (lookup.hasOwnProperty(str)) {
			  add = false;
			}
		  }
		  if (add) {
			results.push(roomArray[i]);
			lookup[str] = true;
		  }
		}
		return results;
	  }

	  function findTightestCycle(firstCorner, secondCorner) {
		var stack = [];
		var next = {
		  corner: secondCorner,
		  previousCorners: [firstCorner]
		};
		var visited = {};
		visited[firstCorner.id] = true;

		while ( next ) {
		  // update previous corners, current corner, and visited corners
		  var currentCorner = next.corner;
		  visited[currentCorner.id] = true;

		  // did we make it back to the startCorner?
		  if ( next.corner === firstCorner && currentCorner !== secondCorner ) {
			return next.previousCorners;
		  }

		  var addToStack = [];
		  var adjacentCorners = next.corner.adjacentCorners();
		  for ( var i = 0; i < adjacentCorners.length; i++ ) {
			var nextCorner = adjacentCorners[i];

			// is this where we came from?
			// give an exception if its the first corner and we aren't at the second corner
			if ( nextCorner.id in visited &&
			  !( nextCorner === firstCorner && currentCorner !== secondCorner )) {
			  continue;
			}

			// nope, throw it on the queue
			addToStack.push( nextCorner );
		  }

		  var previousCorners = next.previousCorners.slice(0);
		  previousCorners.push( currentCorner );
		  if (addToStack.length > 1) {
			// visit the ones with smallest theta first
			var previousCorner = next.previousCorners[next.previousCorners.length - 1];
			addToStack.sort(function(a,b) {
			  return (calculateTheta(previousCorner, currentCorner, b) -
				  calculateTheta(previousCorner, currentCorner, a));
			});
		  }

		  if (addToStack.length > 0) {
			// add to the stack
			utils.forEach(addToStack, function(corner) {
			  stack.push({
				corner: corner,
				previousCorners: previousCorners
			  });
			});
		  }

		  // pop off the next one
		  next = stack.pop();
		}
		return [];
	  }

	  // find tightest loops, for each corner, for each adjacent
	  // TODO: optimize this, only check corners with > 2 adjacents, or isolated cycles
	  var loops = [];
	  for (var i = 0; i < corners.length; i++) {
		var firstCorner = corners[i];
		var adjacentCorners = firstCorner.adjacentCorners();
		for (var j = 0; j < adjacentCorners.length; j++) {
		  var secondCorner = adjacentCorners[j];
		  loops.push(findTightestCycle(firstCorner, secondCorner));
		}
	  }
	  // remove duplicates
	  var uniqueLoops = removeDuplicateRooms(loops);
	  //remove CW loops
	  var uniqueCCWLoops = utils.removeIf(uniqueLoops, utils.isClockwise);

	  //utils.forEach(uniqueCCWLoops, function(loop) {
	  //  console.log("LOOP");
	  //  utils.forEach(loop, function(corner) {
	  //    console.log(corner.id);
	  //  });
	  //});
	  return uniqueCCWLoops;
	}

	module.exports = Floorplan;