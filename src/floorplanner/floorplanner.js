	var $ = require('jquery');

	var FloorplannerView = require('./floorplanner_view')

	var utils = require('../utils/utils')

	var Floorplanner = function(canvas, floorplan) {

	  var scope = this;
	  var floorplan = floorplan;
	  var compass = "";

	  this.modes = {
		MOVE: 0,
		DRAW: 1,
		DELETE: 2,
		DRAW_ROOM: 3,
		DRAW_WINDOW: 4,
		ROOMTYPE:5,
		DRAW_DOOR:6,
		RULER:7,
		CLEAR:8
	  };

	  this.units = {
		METER:0,
		FEET:1
	  }
	  this.mode = 0;
	  this.unit = 0;
	  var mouseDown = false;
	  var mouseMoved = false;
	  var mouseClick = false;
	  var detachRoom = false;
	  this.activeWall = null;
	  this.activeCorner = null;
	  this.activeRoom = null;
	  this.activeDoor = null;

	  this.originX = 0;
	  this.originY = 0;
	  this.outsideX = 0;
	  this.outsideY = 0;

	  // how much will we move a corner to make a wall axis aligned (cm)
	  var snapTolerance = 25;

	  // these are in threeJS coords
	  var mouseX = 0;
	  var mouseY = 0;
	  var rawMouseX = 0;
	  var rawMouseY = 0;

	  // mouse position at last click
	  var lastX = 0;
	  var lastY = 0;

	  // scale rate for zoom in and zoom out
	  this.scaleRate = 1;

	  // drawing state
	  this.targetX = 0;
	  this.targetY = 0;
	  this.xArr = [];
	  this.yArr = [];
	  this.targetRoom = null;
	  this.lastNode = null;

	  this.modeResetCallbacks = $.Callbacks();

	  var canvasElement = $("#"+canvas);
	  var canvasElementForWheel = document.getElementById(canvas);
	  var context = canvasElementForWheel.getContext('2d');
	  var view = new FloorplannerView(floorplan, this, canvas);

	  var cmPerFoot = 30.48;
	  var pixelsPerFoot = 15.0;
	  var cmPerPixel = cmPerFoot * (1.0 / pixelsPerFoot);
	  var pixelsPerCm = 1.0 / cmPerPixel;
	  this.wallWidth = 10.0 * pixelsPerCm;

	  var lastX=canvasElement.width/2, lastY=canvasElement.height/2;
	  var scaleFactor = 1.0;
	  var dragStart,dragged;
	  var lastXX = 0;
	  var lastYY = 0;
	  var scale = 1.0;
	  var toleranceRoom = 10;

	  // var for zoom in and zoom out
	  this.scaleFactor = 1.1;

	  function init() {
		scope.setMode(scope.modes.MOVE);
		scope.setUnit(scope.units.FEET);
		canvasElement.mousedown(mousedown);
		canvasElement.mousemove(mousemove);
		canvasElement.mouseup(mouseup);
		canvasElement.mouseleave(mouseleave);
		canvasElementForWheel.addEventListener('DOMMouseScroll',handleScroll,false);
		canvasElementForWheel.addEventListener('mousewheel',handleScroll,false);
		$(document).keyup(function(e) {
		  if (e.keyCode == 27) {
			escapeKey();
		  }
		});

		floorplan.roomLoadedCallbacks.add(scope.reset);
	  }

	  this.getMouseTransformed = function(mouseX, mouseY){
		var mouseXTransformed = (mouseX-canvasElementForWheel.width/2) / scale;
		var mouseYTransformed = (mouseY-canvasElementForWheel.height/2) / scale;
		mouseXTransformed += canvasElementForWheel.width/2;
		mouseYTransformed += canvasElementForWheel.height/2;
		return {x:mouseXTransformed, y:mouseYTransformed};
	  }

	  var zoom = function(clicks){
		  if (clicks>0)
			scaleFactor = 1.2;
			else
			scaleFactor = 1/1.2;
			if (((scale*scaleFactor)<3)&&((scale*scaleFactor)>0.2)){
			context.clearRect(0,0,canvasElementForWheel.width,canvasElementForWheel.height);
			context.save();
			context.translate(canvasElementForWheel.width/2, canvasElementForWheel.height/2);
			scale *= scaleFactor;
			context.scale(scaleFactor, scaleFactor);
			context.translate(-canvasElementForWheel.width/2, -canvasElementForWheel.height/2);
			view.setContext(context);
			view.draw(scope.unit);
			context.restore();
		  }

		}

		var handleScroll = function(evt){
		  var delta = evt.wheelDelta ? evt.wheelDelta/240 : evt.detail ? -evt.detail : 0;
		  if (delta) zoom(delta);
		  return false;
		  //zoom(delta);
		  //return false;
		  };

	  function escapeKey() {
		scope.setMode(scope.modes.MOVE);
	  }

	  function updateTarget() {
		view.setContext(context);
		if ((scope.mode == scope.modes.DRAW || scope.mode == scope.modes.DRAW_ROOM || scope.mode == scope.modes.DRAW_WINDOW || scope.mode == scope.modes.DRAW_DOOR) && scope.lastNode) {
		  if (Math.abs(mouseX - scope.lastNode.x) < snapTolerance) {
			scope.targetX = scope.lastNode.x;
		  } else {
			scope.targetX = mouseX;
		  }
		  if (Math.abs(mouseY - scope.lastNode.y) < snapTolerance) {
			scope.targetY = scope.lastNode.y;
		  } else {
			scope.targetY = mouseY;
		  }
		} else {
		  scope.targetX = mouseX;
		  scope.targetY = mouseY;
		}

		if (scope.mode == scope.modes.DRAW_ROOM && scope.lastNode){
		  scope.xArr = [];
		  scope.yArr = [];
		  scope.xArr.push(scope.lastNode.x);
		  scope.xArr.push(scope.targetX);
		  scope.xArr.push(scope.targetX);
		  scope.xArr.push(scope.lastNode.x);
		  scope.yArr.push(scope.lastNode.y);
		  scope.yArr.push(scope.lastNode.y);
		  scope.yArr.push(scope.targetY);
		  scope.yArr.push(scope.targetY);
		}

		for (var i=0; i< floorplan.getCorners().length; i++)
			floorplan.getCorners()[i].removeDuplicateWalls();

		view.draw(scope.unit);
	  }

	  this.setRoomThickness = function(thickness){
		floorplan.setRoomThickness(thickness);
	  }

	  function mousedown() {
		view.setContext(context);
		detachRoom = true;
		mouseDown = true;
		mouseMoved = false;
		mouseClick = true;
		lastX = rawMouseX;
		lastY = rawMouseY;

		var hoverRoom = floorplan.overlappedRoom(mouseX, mouseY, outsideX, outsideY);
		var hoverDoor = floorplan.overlappedDoor(mouseX, mouseY);

		if (hoverDoor!=null){
		    hoverRoom = null;
		  }

		if (hoverRoom != scope.activeRoom){
		  scope.activeRoom = hoverRoom;
		  draw = true;
		}

		// delete
		if (scope.mode == scope.modes.DELETE) {
		  if (scope.activeCorner) {
			scope.activeCorner.removeAll();
		  } else if (scope.activeWall) {
			scope.activeWall.remove();
		  } else if (scope.activeDoor){
			  scope.activeDoor.remove();
		  }
		   else  scope.setMode(scope.modes.MOVE);
		}
	  }

	  function mousemove(event) {
		view.setContext(context);
		mouseMoved = true;
		mouseClick = false;

		// update mouse
		var scaleMouse = scope.getMouseTransformed(event.clientX - canvasElement.offset().left, event.clientY - canvasElement.offset().top);
		rawMouseX = scaleMouse.x;
		rawMouseY = scaleMouse.y;

		mouseX = (scaleMouse.x) * cmPerPixel + scope.originX * cmPerPixel;
		mouseY = (scaleMouse.y) * cmPerPixel + scope.originY * cmPerPixel;
		outsideX = - canvasElement.offset().left * cmPerPixel + scope.originX * cmPerPixel;
		outsideY = - canvasElement.offset().top * cmPerPixel + scope.originY * cmPerPixel;

		// update target (snapped position of actual mouse)
		if (scope.mode == scope.modes.DRAW ||  (scope.mode == scope.modes.DRAW_ROOM) || (scope.mode == scope.modes.DRAW_WINDOW) || (scope.mode == scope.modes.MOVE && mouseDown)) {
		  updateTarget();
		}

		// update object target
		if (scope.mode != scope.modes.DRAW && scope.mode != scope.modes.DRAW_ROOM  && scope.mode != scope.modes.DRAW_WINDOW && sope.mode != scope.modes.DRAW_DOOR && !mouseDown) {
		  var hoverCorner = floorplan.overlappedCorner(mouseX, mouseY);
		  var hoverWall = floorplan.overlappedWall(mouseX, mouseY);
		  var hoverRoom = floorplan.overlappedRoom(mouseX, mouseY, outsideX, outsideY);
		  var hoverDoor = floorplan.overlappedDoor(mouseX, mouseY);

		  if (hoverDoor!=null){
		    hoverWall = null;
		    hoverRoom = null;
		  }


		  var draw = false;
		  if (hoverCorner != scope.activeCorner) {
			scope.activeCorner = hoverCorner;
			draw = true;
		  }
		  // corner takes precendence
		  if (scope.activeCorner == null) {

			if (hoverDoor != scope.activeDoor){
			  scope.activeDoor = hoverDoor;
			  hoverWall = null;
			  hoverRoom = null;
			  draw = true;
			}

			if (hoverWall != scope.activeWall) {
			  scope.activeWall = hoverWall;
			  draw = true;
			}

			if (hoverRoom != scope.activeRoom){
			  scope.activeRoom = hoverRoom;
			  draw = true;
			}

		  } else {
			scope.activeWall = null;
		  }

		  if (draw) {
			view.draw(scope.unit);
		  }
		}

		// panning
		if (mouseDown && !scope.activeCorner && !scope.activeWall && !scope.activeRoom && !scope.activeDoor) {
		  scope.originX += (lastX - rawMouseX);
		  scope.originY += (lastY - rawMouseY);
		  lastX = rawMouseX;
		  lastY = rawMouseY;
		  view.draw(scope.unit);
		}

		// dragging
		if (scope.mode == scope.modes.MOVE && mouseDown) {
		  // ignore the moving corner
		  if (scope.activeCorner) {
			scope.activeCorner.move(mouseX, mouseY);
			scope.activeCorner.snapToAxis(snapTolerance);
			if (scope.mode==scope.modes.MOVE){
			  //scope.activeCorner.mergeWithIntersected();
			}
		  } else if (scope.activeWall) {
			scope.activeWall.relativeMove(
			  (rawMouseX - lastX) * cmPerPixel,
			  (rawMouseY - lastY) * cmPerPixel
			);

			scope.activeWall.snapToAxis(snapTolerance*3);

			for (var i=0; i<floorplan.getDoors().length; i++){
			  if (floorplan.getDoors()[i].closestWall==scope.activeWall)
				floorplan.getDoors()[i].relativeMove(
				  (rawMouseX - lastX) * cmPerPixel,
				  (rawMouseY - lastY) * cmPerPixel
				);
			}

			lastX = rawMouseX;
			lastY = rawMouseY;
		  } else if (scope.activeRoom){

			if (detachRoom==true){
		// not fix bug
		// detach walls with having in other rooms
		  var cornersManyRoomsList = scope.activeRoom.getCornersInManyRooms();
		  var cornersARoomList = scope.activeRoom.getCornersInOnlyARoom();
		  var cornersCloneList = [];
		  for (var i=0; i<cornersManyRoomsList.length; i++){
			var corner = floorplan.newCorner(cornersManyRoomsList[i].x, cornersManyRoomsList[i].y);
			cornersCloneList.push(corner);
		  }


		   for (var i=0; cornersManyRoomsList!= null && i<cornersManyRoomsList.length; i++){
			for (var j=0; cornersManyRoomsList[i].wallStarts!=null && j<cornersManyRoomsList[i].wallStarts.length; j++){

			  var indexCornerNotInRoomList = scope.activeRoom.getCorners().indexOf(cornersManyRoomsList[i].wallStarts[j].getEnd());
			  if (indexCornerNotInRoomList==-1){
				var detachWall = cornersManyRoomsList[i].wallStarts[j];
				var endCorner = cornersManyRoomsList[i].wallStarts[j].getEnd();
				cornersManyRoomsList[i].detachWall(cornersManyRoomsList[i].wallStarts[j]);
				detachWall.remove();
				floorplan.newWall(cornersCloneList[i], endCorner);
			  }
			}

			for (var j=0; cornersManyRoomsList[i].wallEnds!=null && j<cornersManyRoomsList[i].wallEnds.length; j++){
			  var indexCornerNotInRoomList = scope.activeRoom.getCorners().indexOf(cornersManyRoomsList[i].wallEnds[j].getStart());
			  if (indexCornerNotInRoomList==-1){
				var detachWall = cornersManyRoomsList[i].wallEnds[j];
				var startCorner = cornersManyRoomsList[i].wallEnds[j].getStart();
				cornersManyRoomsList[i].detachWall(cornersManyRoomsList[i].wallEnds[j]);
				detachWall.remove();
				floorplan.newWall(startCorner, cornersCloneList[i]);
			  }
			}
		   }

		   for (var i=0; cornersManyRoomsList!= null && i<cornersManyRoomsList.length; i++){
			for (var j=0; cornersManyRoomsList[i].wallStarts!=null && j<cornersManyRoomsList[i].wallStarts.length; j++){

			var indexCornerInMultipleRoomList = cornersManyRoomsList.indexOf(cornersManyRoomsList[i].wallStarts[j].getEnd());
			  if (indexCornerInMultipleRoomList>-1){
				var detachWall = cornersManyRoomsList[i].wallStarts[j];
				var endCorner = cornersCloneList[indexCornerInMultipleRoomList];
				floorplan.newWall(cornersCloneList[i], endCorner);
			  }
			  }
			  }

		   //scope.activeRoom.updateRoom();
		   detachRoom = false;
		  }
			else
			{
			  var closestCorner = null;
			  var corner = null;
			  for (var i=0; !closestCorner && i<scope.activeRoom.corners.length; i++){
			    for (var j=0; !closestCorner && j<floorplan.getCorners().length; j++){
			      var corners = floorplan.getCorners();
			      var d1 = scope.activeRoom.corners.indexOf(corners[j]);
			      var d2 = utils.distance(scope.activeRoom.corners[i].x, scope.activeRoom.corners[i].y,
			      corners[j].x, corners[j].y);
			      if ((scope.activeRoom.corners.indexOf(corners[j])==-1) && (utils.distance(scope.activeRoom.corners[i].x, scope.activeRoom.corners[i].y,
			      corners[j].x, corners[j].y)<toleranceRoom)){
			        closestCorner = floorplan.getCorners()[j];
			        corner = scope.activeRoom.corners[i];
			      }
			    }
			  }

		  var translationX = rawMouseX - lastX;
		  var translationY = rawMouseY - lastY;

		  if (closestCorner){
		    translationX = (closestCorner.x - corner.x)/2;
		    translationY = (closestCorner.y - corner.y)/2;
		  }

			scope.activeRoom.relativeMove(
			translationX * cmPerPixel,
			translationY * cmPerPixel
			);

			for (var i=0; i<floorplan.getDoors().length; i++){
			  var id = scope.activeRoom.getId();
			  var idr = floorplan.getDoors()[i].closestWall;
			  if (floorplan.getRoomIdBaseWall(floorplan.getDoors()[i].closestWall)==scope.activeRoom.getId()){
				floorplan.getDoors()[i].relativeMove(
				  (translationX) * cmPerPixel,
				  (translationY) * cmPerPixel
				);
			  }
			}

			for (var i=0; i<scope.activeRoom.walls.length; i++){
			  for (var j=0; j<scope.activeRoom.walls[i].doors[j].length; j++)
			    scope.activeRoom.walls[i].doors[j].relativeMove(
				  (translationX) * cmPerPixel,
				  (translationY) * cmPerPixel
				);
			}

			scope.activeRoom.labelPos.x = scope.activeRoom.labelPos.x+(rawMouseX - lastX) * cmPerPixel;
			scope.activeRoom.labelPos.y = scope.activeRoom.labelPos.y+(rawMouseY - lastY) * cmPerPixel;

			lastX = rawMouseX;
			lastY = rawMouseY;
			}
			 } else if (scope.activeDoor){
				  scope.activeDoor.relativeMove(
				  (rawMouseX - lastX) * cmPerPixel,
				  (rawMouseY - lastY) * cmPerPixel
				);
				scope.activeDoor.arrangeDoor(floorplan.getWalls());
				  lastX = rawMouseX;
				  lastY = rawMouseY;
				  scope.activeDoor.mergeWithIntersected(floorplan.getWalls());
				}
		  view.draw(scope.unit);
		  floorplan.update();
		}
	  }

	  function mouseup() {
		view.setContext(context);
		mouseDown = false;
		detachRoom = false;
		mouseMoved = false;

		// edit the width of wall
		var hoverWall = floorplan.overlappedWall(mouseX, mouseY);
		var hoverDoor = floorplan.overlappedDoor(mouseX, mouseY);
		var hoverRoom = floorplan.overlappedRoom(mouseX, mouseY);
		if (hoverWall && scope.mode==scope.modes.MOVE && mouseClick){
		  var thicknessVal = prompt("You want to add corner or edit width. Blank is add new corner or number is to edit width: ","");
		  if (thicknessVal!="")
				hoverWall.thickness = thicknessVal;
			else
			floorplan.addCornerInWall(hoverWall, mouseX, mouseY);
			updateTarget();
		}
		else if (hoverDoor && scope.mode==scope.modes.MOVE && mouseClick){
				var widthVal = prompt("Enter width of door: ", hoverDoor.width);
				if (widthVal!=null)
					hoverDoor.setWidth(widthVal);
					hoverDoor.arrangeDoor(floorplan.walls);
					hoverDoor.mergeWithIntersected(floorplan.getWalls());
					updateTarget();
			 }
			 else if (hoverRoom && scope.mode==scope.modes.MOVE && mouseClick){
			   var roomType = prompt("Enter room type: ", hoverRoom.getRoomType());
			   if (roomType && roomType!=""){
			     hoverRoom.setRoomType(roomType);
			     hoverRoom.labelPos = {x:mouseX, y:mouseY};
			   }
			 }

		// drawing
		// consider: draw a linne and it cuts many other lines will create many intersection corners
		if (scope.mode == scope.modes.DRAW && !mouseMoved) {
		  var corner = floorplan.newCorner(scope.targetX, scope.targetY);
		  if (scope.lastNode != null) {
			floorplan.newWall(scope.lastNode, corner);
		  }
		  if (corner.mergeWithIntersected() && scope.lastNode != null) {
			// not fix bug
			/*var walls = floorplan.getWalls();
			for (var i=0; i<walls.length; i++){
			  if (((walls[i].getStart()==scope.lastNode) && (walls[i].getEnd()==corner)) ||
			  ((walls[i].getStart()==corner) && (walls[i].getEnd()==scope.lastNode))){
			    floorplan.creatCornersByTheIntersectionWall(walls[i]);
			  }
			}*/
			scope.setMode(scope.modes.MOVE);
		  }
		  scope.lastNode = corner;
		}

		// drawing room
		if (scope.mode == scope.modes.DRAW_ROOM && !mouseMoved) {
		  var corner = floorplan.newCorner(scope.targetX, scope.targetY);
		  var cors = floorplan.getCorners();
		  if (scope.lastNode != null){
			var corners = [];
			var corner1 = scope.lastNode;
			corners.push(corner1);
			var corner2 = floorplan.newCorner(scope.targetX, corner1.getY());
			corners.push(corner2);
			var corner3 = corner;
			corners.push(corner3);
			var corner4 = floorplan.newCorner(corner1.getX(), scope.targetY);
			corners.push(corner4);
			floorplan.newRoom(corners);
			scope.setMode(scope.modes.MOVE);
			scope.lastNode = null;
		  }
		  else{
			scope.lastNode = corner;
		  }
		}

		// draw windows
		if (scope.mode == scope.modes.DRAW_WINDOW && !mouseMoved) {
		  floorplan.newWindow(scope.targetX, scope.targetY);
		  scope.setMode(scope.modes.MOVE);
		  hoverWindow = floorplan.overlappedWindow(mouseX, mouseY);
		  if (hoverWindow){
		    hoverWindow.arrangeWindow(floorplan.getWindows());
		    hoverWindow.mergeWithIntersected(floorplan.getWalls());
		  }
		}
		mouseClick = true;

		//draw door
		if (scope.mode == scope.modes.DRAW_DOOR && !mouseMoved) {
		  floorplan.newDoor(scope.targetX, scope.targetY);
		  scope.setMode(scope.modes.MOVE);
		  hoverDoor = floorplan.overlappedDoor(mouseX, mouseY);
		  if (hoverDoor){
		    hoverDoor.arrangeDoor(floorplan.getWalls());
		    hoverDoor.mergeWithIntersected(floorplan.getWalls());
		  }
		}
		mouseClick = true;

		// merge corner
		for (var i=0; floorplan.corners && (i<floorplan.corners.length); i++)
		  floorplan.corners[i].mergeWithIntersected();
	  }

	  function mouseleave() {
		view.setContext(context);
		mouseDown = false;
		//scope.setMode(scope.modes.MOVE);
	  }

	  this.reset = function() {
		scope.resizeView();
		scope.setMode(scope.modes.MOVE);
		resetOrigin();
		view.draw(scope.unit);
	  }

	  this.resizeView = function() {
		view.handleWindowResize();
	  }

	  this.setMode = function(mode) {
		scope.lastNode = null;
		scope.mode = mode;
		floorplan.setContext(context, canvas);
		scope.modeResetCallbacks.fire(mode, scope.unit);
		context = floorplan.getContext();
		updateTarget();
	  }

	  this.setUnit = function(unit) {
		scope.unit = unit;
		scope.modeResetCallbacks.fire(scope.mode, unit);
		updateTarget();
	  }

	  this.clearAll = function(){
	    floorplan.clear();
	    scope.modeResetCallbacks.fire(scope.mode, unit);
	    scope.setMode(scope.modes.MOVE);
	    updateTarget();
	  }

      this.setCompass = function(compass){
        scope.compass = compass;
      }

	  function resetOrigin() {
		// sets the origin so that floorplan is centered
		var canvasSel = $("#"+canvas);
		var centerX = canvasSel.innerWidth() / 2.0;
		var centerY = canvasSel.innerHeight() / 2.0;
		var centerFloorplan = floorplan.getCenter();
		scope.originX = centerFloorplan.x * pixelsPerCm - centerX;
		scope.originY = centerFloorplan.z * pixelsPerCm - centerY;
	  }

	  this.convertX = function(x) {
		// convert from THREEjs coords to canvas coords
		return (x - scope.originX * cmPerPixel) * pixelsPerCm;
	  }

	  this.convertY = function(y) {
		// convert from THREEjs coords to canvas coords
		return (y - scope.originY * cmPerPixel) * pixelsPerCm;
	  }

	  init();
	}

	module.exports = Floorplanner;