/* ================================ TOOLS CONFIGURATION ============================== */
var tool_select	= 280;	// Stick (kijek)
var tool_clear	= 268;	// Wooden Sword (miecz)
var tool_copy	= 269;	// Wooden Shovel (łopata)
var tool_fill	= 270;	// Wooden Pickaxe (kilof)
var tool_rotate = 271;	// Wooden Axe (siekiera)
var tool_move	= 290;	// Wooden Hoe (motyka)
var tool_replace= 346;  // Fishing Rod (wędka)

/* ===================================== VARIABLES =================================== */
var select_counter = 0;

var last_tool   = null;

var start = null;
var pos1 = null;
var pos2 = null;
var dest = null;

var replaceFrom = null;
var replaceTo   = null;

var clipboard = [];

var undoDestination = {
	buffer: [],
	x: null,
	y: null,
	z: null
};

var undoSource = {
	buffer: [],
	x: null,
	y: null,
	z: null
};

/* ================================== EVENT FUNCTIONS ================================ */
function useItem(x, y, z, item, block, side) {

	// tool change resets selection
	if (last_tool != null && last_tool != item)
		if (item == tool_select || item == tool_fill || item == tool_clear)
			resetSelection();
	last_tool = item;
	
	if (item == tool_select)
	{
		preventDefault();

		select(x, y, z);

		if (select_counter >= 2)
			copyToClipboard();
	}

	if (item == tool_fill)
	{
		preventDefault();

		if (select_counter < 2)
			select(x, y, z);
		else
		{
			clearUndos();
			fill(getTile(x, y, z), Level.getData(x, y, z));
			resetSelection();
		}
	}

	if (item == tool_clear)
	{
		preventDefault();

		if (select_counter < 2)
			select(x, y, z);
		else
		{
			clearUndos();
			clearSource();
			resetSelection();
		}
	}

	if (item == tool_copy)
	{
		preventDefault();

		if (clipboard.length == 0)
		{
			clientMessage("No selection");
			return;
		}

		dest = [x, y, z];

		clearUndos();
		pasteFromClipboard();
	}

	if (item == tool_move)
	{
		preventDefault();

		if (clipboard.length == 0)
		{
			clientMessage("No selection");
			return;
		}

		dest = [x, y, z];

		clearUndos();
		clearSource();
		pasteFromClipboard();
	}

	if (item == tool_rotate)
	{
		preventDefault();

		if (clipboard.length == 0)
		{
			clientMessage("No selection");
			return;
		}

		dest = [x, y, z];

		clearUndos();
		
		rotateClipboard();
		pasteFromClipboard();
	}

	if (item == tool_replace)
	{
		preventDefault();

		if (clipboard.length == 0)
		{
			clientMessage("No selection");
			return;
		}

		if (replaceFrom == null)
			replaceFrom = [getTile(x, y, z), Level.getData(x, y, z)];
		else
		{
			replaceTo = [getTile(x, y, z), Level.getData(x, y, z)];

			clearUndos();
			replace();

			replaceFrom = null;
			replaceTo = null;
		}
	}
}

function destroyBlock(x, y, z, side) {
	var item = getCarriedItem();

	if (item == tool_select || item == tool_fill || item == tool_clear)
	{
		preventDefault();
		resetSelection();
		select(x, y, z);
	}

	if (item == tool_copy)
	{
		preventDefault();

		if (clipboard.length == 0)
		{
			clientMessage("No selection");
			return;
		}

		pull();
	}
}

function procCmd(command) {
	var command = command.split(" ");

	switch(command[0]) {
		case "undo":
		case "/undo":
			restoreUndo(undoSource);
			restoreUndo(undoDestination);
			break;
		case "save":
		case "/save":
			if (command[1])
				save(command[1]);
			else
				clientMessage("No file name");
			break;
		case "load":
		case "/load":
	}
}

/* ============================ SAVE & LOAD FILE FUNCTIONS =========================== */
function save(filename) {
	try {
		var content = {
			start: start,
			pos1: pos1,
			pos2: pos2,
			clipboard: clipboard
		};

		var path = android.os.Environment.getExternalStorageDirectory().getPath() + "/games/com.mojang/saves/";
		java.io.File(path).mkdirs();
		var newFile = new java.io.File(path, filename + '.json');
		newFile.createNewFile();
		var outWrite = new java.io.OutputStreamWriter(new java.io.FileOutputStream(newFile));
		outWrite.append(JSON.stringify(content));
		outWrite.close();
	} 
	catch(err) {
		clientMessage(err);
	}
}

function load(filename) {
	try {
		var path = android.os.Environment.getExternalStorageDirectory().getPath() + "/games/com.mojang/saves/";
		var content = "";

		if (java.io.File(path + filename + '.json').exists()) {
			var file = new java.io.File(path + filename);
			var fos = new java.io.FileInputStream(file);
			var str = new java.lang.StringBuilder();
			var ch;

			while ((ch = fos.read()) != -1) {
				str.append(java.lang.Character(ch)); 
			}

			content = JSON.parse(String(str.toString()));

			start = content.start;
			pos1 = content.pos1;
			pos2 = content.pos2;
			clipboard = content.clipboard;

			fos.close();
		}
	} 
	catch(err) {
		clientMessage(err);
	}
}

/* =============================== SELECTION FUNCTIONS =============================== */
function select(x, y, z) {
	switch(++select_counter) {
		case 1: 
			start = [x, y, z];
			pos1 = [x, y, z];
			break;
		case 2:
			pos2 = [x, y, z];
			break;
		default:
			extendSelection(0, x);
			extendSelection(1, y);
			extendSelection(2, z);
			break;
	}
	var suffix = select_counter == 1 ? 'st' : (select_counter == 2 ? 'nd' : (select_counter == 3 ? 'rd' : 'th'));
	clientMessage(select_counter + suffix);
}

function resetSelection() {
	clipboard = [];
	select_counter = 0;
	start = null;
	pos1 = null;
	pos2 = null;
	dest = null;
}

function extendSelection(idx, position)
{
	if (pos1[idx] < pos2[idx]) {
		if (position < pos1[idx])
			pos1[idx] = position;
		if (position > pos2[idx])
			pos2[idx] = position;
	}
	else {
		if (position > pos1[idx])
			pos1[idx] = position;
		if (position < pos2[idx])
			pos2[idx] = position;
	}
}

/* ================================== UNDO FUNCTIONS ================================= */
function clearUndos(undo) {
	undoSource = {
		buffer: [],
		x: null,
		y: null,
		z: null
	};
	undoDestination = {
		buffer: [],
		x: null,
		y: null,
		z: null
	};
}

function prepareUndo(undo, minX, minY, minZ, widthX, widthY, widthZ) {
	undo.x = minX;
	undo.y = minY;
	undo.z = minZ;

	undo.buffer = [widthX];
	for(var x = 0; x < widthX; x++) {
		undo.buffer[x] = [widthY];
		for(var y = 0; y < widthY; y++) {
			undo.buffer[x][y] = [widthZ];
		}
	}
}

function rememberUndoTile(undo, x, y, z, tileX, tileY, tileZ) {
	undo.buffer[x][y][z] = [getTile(tileX, tileY, tileZ), Level.getData(tileX, tileY, tileZ)];
}

function restoreUndo(undo) {
	if (undo.buffer.length == 0)
		return;

	for(var x = 0; x < undo.buffer.length; x++) {
		for(var y = 0; y < undo.buffer[0].length; y++) {
			for(var z = 0; z < undo.buffer[0][0].length; z++) {
				setTile(undo.x + x, undo.y + y, undo.z + z, undo.buffer[x][y][z][0], undo.buffer[x][y][z][1]);
			}
		}
	}
}

/* ============================== MANIPULATION FUNCTIONS ============================= */
function rotateClipboard() {
	if (clipboard.length == 0)
		return;

	widthX = clipboard.length;
	widthY = clipboard[0].length;
	widthZ = clipboard[0][0].length;
	
	rotated = [widthZ];
	for(var z = 0; z < widthZ; z++) {
		rotated[z] = [widthY];
		for(var y = 0; y < widthY; y++) {
			rotated[z][y] = [widthX];
		}
	}

	for(var x = 0; x < widthX; x++) {
		for(var y = 0; y < widthY; y++) {
			for(var z = 0; z < widthZ; z++) {
				rotated[widthZ - z - 1][y][x] = clipboard[x][y][z];
			}
		}
	}

	clipboard = rotated;

	minX = Math.min(pos1[0], pos2[0]);
	minY = Math.min(pos1[1], pos2[1]);
	minZ = Math.min(pos1[2], pos2[2]);

	ofsX = start[0] - pos1[0];
	ofsY = start[1] - pos1[1];
	ofsZ = start[2] - pos1[2];

	start = [minX+ofsZ, minY+ofsY, minZ+ofsX];

	pos1 = [minX, minY, minZ];
	pos2 = [minX + widthZ - 1, minY + widthY - 1, minZ + widthX - 1];
}

function clearSource() {
	widthX = Math.abs(pos1[0] - pos2[0]) + 1;
	widthY = Math.abs(pos1[1] - pos2[1]) + 1;
	widthZ = Math.abs(pos1[2] - pos2[2]) + 1;

	minX = Math.min(pos1[0], pos2[0]);
	minY = Math.min(pos1[1], pos2[1]);
	minZ = Math.min(pos1[2], pos2[2]);

	prepareUndo(undoSource, minX, minY, minZ, widthX, widthY, widthZ);

	for(var x = 0; x < widthX; x++) {
		for(var y = 0; y < widthY; y++) {
			for(var z = 0; z < widthZ; z++) {
				rememberUndoTile(undoSource, x, y, z, minX + x, minY + y, minZ + z);
				setTile(minX + x, minY + y, minZ + z, 0, 0);
			}
		}
	}
}

function copyToClipboard() {
	widthX = Math.abs(pos1[0] - pos2[0]) + 1;
	widthY = Math.abs(pos1[1] - pos2[1]) + 1;
	widthZ = Math.abs(pos1[2] - pos2[2]) + 1;

	minX = Math.min(pos1[0], pos2[0]);
	minY = Math.min(pos1[1], pos2[1]);
	minZ = Math.min(pos1[2], pos2[2]);

	clipboard = [widthX];
	for(var x = 0; x < widthX; x++) {
		clipboard[x] = [widthY];
		for(var y = 0; y < widthY; y++) {
			clipboard[x][y] = [widthZ];
			for(var z = 0; z < widthZ; z++) {
				clipboard[x][y][z] = [getTile(minX + x, minY + y, minZ + z), Level.getData(minX + x, minY + y, minZ + z)];
			}
		}
	}
}

function pasteFromClipboard() {
	widthX = Math.abs(pos1[0] - pos2[0]) + 1;
	widthY = Math.abs(pos1[1] - pos2[1]) + 1;
	widthZ = Math.abs(pos1[2] - pos2[2]) + 1;

	minX = Math.min(pos1[0], pos2[0]);
	minY = Math.min(pos1[1], pos2[1]);
	minZ = Math.min(pos1[2], pos2[2]);

	ofsX = (start[0] > minX ? Math.abs(start[0] - minX) : 0);
	ofsY = (start[1] > minY ? Math.abs(start[1] - minY) : 0);
	ofsZ = (start[2] > minZ ? Math.abs(start[2] - minZ) : 0);

	prepareUndo(undoDestination, dest[0] - ofsX, dest[1] - ofsY, dest[2] - ofsZ, widthX, widthY, widthZ);

	for(var x = 0; x < widthX; x++) {
		for(var y = 0; y < widthY; y++) {
			for(var z = 0; z < widthZ; z++) {
				rememberUndoTile(undoDestination, x, y, z, dest[0] - ofsX + x, dest[1] - ofsY + y, dest[2] - ofsZ + z);
				setTile(dest[0] - ofsX + x, dest[1] - ofsY + y, dest[2] - ofsZ + z, clipboard[x][y][z][0], clipboard[x][y][z][1]);
			}
		}
	}
}

function fill(tile,data) {
	widthX = Math.abs(pos1[0] - pos2[0]) + 1;
	widthY = Math.abs(pos1[1] - pos2[1]) + 1;
	widthZ = Math.abs(pos1[2] - pos2[2]) + 1;

	minX = Math.min(pos1[0], pos2[0]);
	minY = Math.min(pos1[1], pos2[1]);
	minZ = Math.min(pos1[2], pos2[2]);
							 
	prepareUndo(undoSource, minX, minY, minZ, widthX, widthY, widthZ);

	for(var x = 0; x < widthX; x++) {
		for(var y = 0; y < widthY; y++) {
			for(var z = 0; z < widthZ; z++) {
				rememberUndoTile(undoSource, x, y, z, minX + x, minY + y, minZ + z);
				setTile(minX + x, minY + y, minZ + z, tile, data);
			}
		}
	}
}

function replace() {
	widthX = Math.abs(pos1[0] - pos2[0]) + 1;
	widthY = Math.abs(pos1[1] - pos2[1]) + 1;
	widthZ = Math.abs(pos1[2] - pos2[2]) + 1;

	minX = Math.min(pos1[0], pos2[0]);
	minY = Math.min(pos1[1], pos2[1]);
	minZ = Math.min(pos1[2], pos2[2]);
							 
	prepareUndo(undoSource, minX, minY, minZ, widthX, widthY, widthZ);

	for(var x = 0; x < widthX; x++) {
		for(var y = 0; y < widthY; y++) {
			for(var z = 0; z < widthZ; z++) {
				rememberUndoTile(undoSource, x, y, z, minX + x, minY + y, minZ + z);
				if (replaceFrom[0] == getTile(x, y, z))
					setTile(x, y, z, replaceTo[0], Level.getData(x, y, z));
			}
		}
	}
}

function pull() {
	var copyLayer = function(dx,dy,dz)
	{
		dest = [pos1[0]+dx, pos1[1]+dy, pos1[2]+dz];

		clearUndos();
		pasteFromClipboard();

		pos1 = dest;
		pos2 = [pos2[0]+dx, pos2[1]+dy, pos2[2]+dz];
		copyToClipboard();
	}

	var deltaX = getPlayerX() - start[0];
	var deltaY = getPlayerY() - start[1];
	var deltaZ = getPlayerZ() - start[2];

	if (Math.abs(deltaX) > Math.abs(deltaY))
	{
		if (Math.abs(deltaX) > Math.abs(deltaZ))
		{
			for(i = 0; i <= Math.round(Math.abs(deltaX)); i++)
				copyLayer(deltaX > 0 ? 1:-1, 0, 0);
		}
		else
		{
			for(i = 0; i <= Math.round(Math.abs(deltaZ)); i++)
				copyLayer(0, 0, deltaZ > 0 ? 1:-1);
		}
	}
	else
	{
		if (Math.abs(deltaY) > Math.abs(deltaZ))
		{
			for(i = 0; i <= Math.round(Math.abs(deltaY)); i++)
				copyLayer(0, deltaY > 0 ? 1:-1, 0);
		}
		else
		{
			for(i = 0; i <= Math.round(Math.abs(deltaZ)); i++)
				copyLayer(0, 0, deltaZ > 0 ? 1:-1);
		}
	}
}