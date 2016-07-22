	var JQUERY = require('jquery');
	var utils = require('../utils/utils')


	var FloorplannerView = function(floorplan, viewmodel, canvas) {

	  var scope = this;
	  var floorplan = floorplan;
	  var viewmodel = viewmodel;
	 // var canvas = canvas;
	  var canvasElement = document.getElementById(canvas);
	  var context = canvasElement.getContext('2d');
	  //trackTransforms(context);

	  // grid parameters
	  var gridSpacing = 20; // pixels
	  var gridSpacingMeter = 60;
	  var gridSpacingFeet = gridSpacingMeter/3.28;
	  var gridWidth = 1;
	  var unit = 0;
	  var gridColor = "#A4A4A4";
	  var METER = "0";

	  // room config
	  var roomColor = "#f9f9f9";
	  var roomMoveColor = "#F3F781";
	  var roomColorHover = "#31B404";

	  var windowColor = "#4000FF";
	  var windowColorHover = "#5D6D7E";

	  // wall config
	  var wallWidthHover = 5;
	  var wallWidth = 5;
	  var wallColor = "#1C1C1C"
	  var wallColorHover = "#31B404"
	  var edgeColor = "#1C1C1C"
	  var edgeColorHover = "#008cba"
	  var edgeWidth = 1;

	  var deleteColor = "#ff0000";

	  // corner config
	  var cornerRadius = 0
	  var cornerRadiusHover = 7
	  var cornerColor = "#cccccc"
	  var cornerColorHover = "#008cba"

	  var lastX=canvasElement.width/2, lastY=canvasElement.height/2;
	  var scaleFactor = 1.0;
	  //var dragStart = null,dragged;

	  this.setScaleFactor = function(scaleFactor){
		scope.scaleFactor = scaleFactor;
	  }

	  this.getScaleFactor = function(){
		return scaleFactor;
	  }

	  function init() {
		JQUERY(window).resize(scope.handleWindowResize);
		scope.handleWindowResize();
	  }

	  this.handleWindowResize = function() {
		var canvasSel = JQUERY("#"+canvas);
		var parent = canvasSel.parent();
		canvasSel.height(parent.innerHeight());
		canvasSel.width(parent.innerWidth());
		canvasElement.height = parent.innerHeight();
		canvasElement.width = parent.innerWidth();
		scope.draw();
	  }

	  this.setContext = function(context){
		context = context;
	  }


	  this.draw = function(u) {
		// Clear the entire canvas
	  //context.clearRect(0, 0, canvasElement.width, canvasElement.height);
	  context.save();
	  context.setTransform(1,0,0,1,0,0);
	  context.clearRect(0,0,canvasElement.width,canvasElement.height);
	  context.restore();

	  unit = u;
	  /*if (u==METER){
		  gridSpacing = gridSpacingMeter;
		}
		else{
		gridSpacing = gridSpacingFeet;
	  }*/
	  //context.clearRect(0, 0, canvasElement.width, canvasElement.height);
		drawGrid();
		utils.forEach(floorplan.getRooms(), drawRoom);
		for (var i=0; i<floorplan.getWalls().length; i++){
		  drawWall(floorplan.getWalls()[i], false);
		}

		for (var i=0; i<floorplan.getWalls().length; i++){
		  drawWall(floorplan.getWalls()[i], true);
		}
		utils.forEach(floorplan.getCorners(), drawCorner);
		utils.forEach(floorplan.getWindows(), drawWindow);
		if (viewmodel.mode == viewmodel.modes.DRAW) {
		  drawTarget(viewmodel.targetX, viewmodel.targetY, viewmodel.lastNode);
		}

		if (viewmodel.mode == viewmodel.modes.DRAW_ROOM)
		  drawTargetRegion(viewmodel.mode, viewmodel.targetX, viewmodel.targetY, viewmodel.xArr, viewmodel.yArr)
		//utils.forEach(floorplan.getWalls(), drawWallLabels);
		context.save();
	  }

	  function drawWallLabels(wall) {
		// we'll just draw the shorter label... idk
		if (wall.backEdge && wall.frontEdge) {
		  if (wall.backEdge.interiorDistance < wall.frontEdge.interiorDistance) {
			drawEdgeLabel(wall.backEdge);
		  } else {
			drawEdgeLabel(wall.frontEdge);
		  }
		} else if (wall.backEdge) {
		  drawEdgeLabel(wall.backEdge);
		} else if (wall.frontEdge) {
		  drawEdgeLabel(wall.frontEdge);
		}
	  }

	  function drawWall(wall, visibleHover) {
		var color = wallColor;
		var hover = (wall === viewmodel.activeWall);
		var hoverRoom = viewmodel.activeRoom;
		if (hover && viewmodel.mode == viewmodel.modes.DELETE) {
		  color = deleteColor;
		} else if (hover) {
		  color = wallColorHover;
		}

		if (hoverRoom){
		  for (var i=0; i<hoverRoom.corners.length; i++){
			if (((hoverRoom.corners[i].id==wall.start.id) && (hoverRoom.corners[(i+1)%hoverRoom.corners.length].id==wall.end.id)) ||
			 (hoverRoom.corners[i].id==wall.end.id && (hoverRoom.corners[(i+1)%hoverRoom.corners.length].id==wall.start.id)))
			 color = roomColorHover;
		  }
		}

		if (((color != wallColor) && !visibleHover) || ((color == wallColor) && visibleHover))
		  return;

		drawLine(
		  viewmodel.convertX(wall.getStartX()),
		  viewmodel.convertY(wall.getStartY()),
		  viewmodel.convertX(wall.getEndX()),
		  viewmodel.convertY(wall.getEndY()),
		  wall.thickness*0.5,
		  color
		);
		if (!hover && wall.frontEdge) {
		  drawEdge(wall.frontEdge, hover);
		}
		if (!hover && wall.backEdge) {
		  drawEdge(wall.backEdge, hover);
		}

		// only show hover room label
		if (color != wallColor)
		  drawWallLabels(wall);
	  }

	  function meterToFeet(m) {
		var realFeet = ((m*0.393700) / 12);
		var feet = Math.floor(realFeet);
		var inches = Math.round((realFeet - feet) * 12);
		return feet + "'" + inches + '"';
	  }

	  function drawUnit(m, symbol){
		return m + symbol;
	  }

	  function drawEdgeLabel(edge) {
		var pos = edge.interiorCenter();
		var length = edge.interiorDistance();
		if (length < 60) {
		  // dont draw labels on walls this short
		  return;
		}
		context.font = "normal 14px Arial";
		context.fillStyle = "#000000";
		context.textBaseline = "middle";
		context.textAlign = "center";
		context.strokeStyle = "#ffffff";
		context.lineWidth  = 4;

		if (unit==METER){
		  context.strokeText(drawUnit(Math.round(length / 10) / 10, "m"),
		  viewmodel.convertX(pos.x),
		  viewmodel.convertY(pos.y));
		  context.fillText(drawUnit(Math.round(length / 10) / 10, "m"),
		  viewmodel.convertX(pos.x),
		  viewmodel.convertY(pos.y));
		}
		else
		{
		  context.strokeText(meterToFeet(length),
		  viewmodel.convertX(pos.x),
		  viewmodel.convertY(pos.y));
		  context.fillText(meterToFeet(length),
		  viewmodel.convertX(pos.x),
		  viewmodel.convertY(pos.y));
		}
	  }

	  function drawEdge(edge, hover) {
		var color = edgeColor;
		if (hover && viewmodel.mode == viewmodel.modes.DELETE) {
		  color = deleteColor;
		} else if (hover) {
		  color = edgeColorHover;
		}
		corners = edge.corners();
		drawPolygon(
		  utils.map(corners, function(corner) {
			return viewmodel.convertX(corner.x);
		  }),
		  utils.map(corners, function(corner) {
			return viewmodel.convertY(corner.y);
		  }),
		  false,
		  null,
		  true,
		  color,
		  edgeWidth
		);
	  }

	  function drawSurface(surface) {
		drawPolygon(
		  utils.map(surface.corners, function(corner) {
			return viewmodel.convertX(corner.x);
		  }),
		  utils.map(surface.corners, function(corner) {
			return viewmodel.convertY(corner.y);
		  }),
		  true,
		  surfaceColor
		);
	  }

	  function drawRoom(room){
		/*for (var i=0; i < room.corners.length; i++){
		  for (var j=0; j < floorplan.walls.length; j++){
			if ((floorplan.walls[j].start = room.corners[i]) && (floorplan.walls[j].end))
			  floorplan.walls[j].setThickness(room.roomThickness[i]);
		  }
		}*/

		drawPolygon(
		  utils.map(room.corners, function(corner) {
			return viewmodel.convertX(corner.x);
		  }),
		  utils.map(room.corners, function(corner) {
			return viewmodel.convertY(corner.y);
		  }),
		  true,
		  roomColor
		);
		context.font = "normal 15px Goudy Old Style";
		context.fillStyle = "#FF4000";
		context.textBaseline = "middle";
		context.textAlign = "center";
		context.strokeStyle = "#FF4000";
		context.lineWidth  = 6;
		context.fillText(room.getRoomType(), viewmodel.convertX(room.labelPos.x), viewmodel.convertY(room.labelPos.y));
	  }

	  function drawWindow(window){
		var hover = (window === viewmodel.activeWindow);
		var color = windowColor;
		if (hover && viewmodel.mode == viewmodel.modes.DELETE) {
		  color = deleteColor;
		} else if (hover) {
		  color = windowColorHover;
		}

		if (hover){
		  color = roomColorHover;
		}

		drawLine(
		  viewmodel.convertX(window.getStartX()),
		  viewmodel.convertY(window.getStartY()),
		  viewmodel.convertX(window.getEndX()),
		  viewmodel.convertY(window.getEndY()),
		  hover ? window.thickness*1.1 : window.thickness,
		  color
		);
	  }

	  function drawDoor(door){
		var hover = (door === viewmodel.activeDoor);
		var color = doorColor;
		if (hover && viewmodel.mode == viewmodel.modes.DELETE) {
		  color = deleteColor;
		} else if (hover) {
		  color = doorColorHover;
		}

		if (hover){
		  color = roomColorHover;
		}

		drawLine(
		  viewmodel.convertX(door.getStartX()),
		  viewmodel.convertY(door.getStartY()),
		  viewmodel.convertX(door.getEndX()),
		  viewmodel.convertY(door.getEndY()),
		  hover ? door.thickness*1.1 : door.thickness,
		  color
		);
	  }

	  function drawCorner(corner) {
		var hover = (corner === viewmodel.activeCorner);
		var color = cornerColor;
		if (hover && viewmodel.mode == viewmodel.modes.DELETE) {
		  color = deleteColor;
		} else if (hover) {
		  color = cornerColorHover;
		}
		drawCircle(
		  viewmodel.convertX(corner.x),
		  viewmodel.convertY(corner.y),
		  hover ? cornerRadiusHover : cornerRadius,
		  color
		);
	  }

	  function drawTarget(x, y, lastNode) {
		drawCircle(
		  viewmodel.convertX(x),
		  viewmodel.convertY(y),
		  cornerRadiusHover,
		  cornerColorHover
		);
		if (viewmodel.lastNode) {
		  drawLine(
			viewmodel.convertX(lastNode.x),
			viewmodel.convertY(lastNode.y),
			viewmodel.convertX(x),
			viewmodel.convertY(y),
			wallWidthHover,
			wallColorHover
		  );
		}
	  }

	  function drawTargetRegion(mode, x, y, xArr, yArr){
		if (mode == viewmodel.modes.DRAW_ROOM){
			drawCircle(
			  viewmodel.convertX(x),
			  viewmodel.convertY(y),
			  cornerRadiusHover,
			  cornerColorHover
			);
			var xxArr = [], yyArr = [];
			for (var i=0; i<xArr.length; i++){
			  xxArr.push(viewmodel.convertX(xArr[i]));
			  yyArr.push(viewmodel.convertY(yArr[i]));
			}
			if (viewmodel.lastNode) {
			  drawPolygon(
			  xxArr,
			  yyArr,
			  true,
			  roomMoveColor
			);
			}
		}
	  }

	  function drawLine(startX, startY, endX, endY, width, color) {
		// width is an integer
		// color is a hex string, i.e. #ff0000
		context.beginPath();
		context.moveTo(startX, startY);
		context.lineTo(endX, endY);
		context.lineWidth = width;
		context.strokeStyle = color;
		context.stroke();
	  }

	  function drawPolygon(xArr, yArr, fill, fillColor, stroke, strokeColor, strokeWidth) {
		// fillColor is a hex string, i.e. #ff0000
		fill = fill || false;
		stroke = stroke || false;
		context.beginPath();
		context.moveTo(xArr[0], yArr[0]);
		for (var i = 1; i < xArr.length; i++) {
		  context.lineTo(xArr[i], yArr[i]);
		}
		context.closePath();
		if (fill) {
		  context.fillStyle = fillColor;
		  context.fill();
		}
		if (stroke) {
		  context.lineWidth = strokeWidth;
		  context.strokeStyle = strokeColor;
		  context.stroke();
		}
	  }

	  function drawCircle(centerX, centerY, radius, fillColor) {
		context.beginPath();
		context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
		context.fillStyle = fillColor;
		context.fill();
	  }

	  // returns n where -gridSize/2 < n <= gridSize/2
	  function calculateGridOffset(n) {
		if (n >= 0) {
		  return (n + gridSpacing/2.0) % gridSpacing - gridSpacing/2.0;
		} else {
		  return (n - gridSpacing/2.0) % gridSpacing + gridSpacing/2.0;
		}
	  }

	  function drawGrid() {
		var offsetX = calculateGridOffset(-viewmodel.originX);
		var offsetY = calculateGridOffset(-viewmodel.originY);
		var width = canvasElement.width;
		var height = canvasElement.height;
		for (var x=0; x <= (width / gridSpacing); x++) {
		  drawLine(gridSpacing * x + offsetX, 0, gridSpacing*x + offsetX, height, gridWidth, gridColor);
		}
		for (var y=0; y <= (height / gridSpacing); y++) {
		  drawLine(0, gridSpacing*y + offsetY, width, gridSpacing*y + offsetY, gridWidth, gridColor);
		}
	  }

	  init();
	}

	module.exports = FloorplannerView