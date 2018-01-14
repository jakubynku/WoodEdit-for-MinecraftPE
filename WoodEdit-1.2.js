/* ================================ SAVE & LOAD LOCATION ============================== */
var savePath = android.os.Environment.getExternalStorageDirectory().getPath() + "/games/com.mojang/saves/";

/* ================================ TOOLS CONFIGURATION ============================== */
var tool_select	= 280;	// Stick (kijek)
var tool_clear	= 268;	// Wooden Sword (miecz)
var tool_copy	= 269;	// Wooden Shovel (łopata)
var tool_fill	= 270;	// Wooden Pickaxe (kilof)
var tool_rotate = 271;	// Wooden Axe (siekiera)
var tool_move	= 290;	// Wooden Hoe (motyka)
var tool_replace= 346;  // Fishing Rod (wędka)

/* ===================================== UNDO CLASS ================================== */
function Undo(){
	this.buffer = [];
	this.x = null;
	this.y = null;
	this.z = null;
}

Undo.prototype.clear = function(){
	this.buffer = [];
	this.x = null;
	this.y = null;
	this.z = null;
}

Undo.prototype.prepare = function(minX, minY, minZ, widthX, widthY, widthZ) {
	this.x = minX;
	this.y = minY;
	this.z = minZ;

	this.buffer = [widthX];
	for(var x = 0; x < widthX; x++) {
		this.buffer[x] = [widthY];
		for(var y = 0; y < widthY; y++) {
			this.buffer[x][y] = [widthZ];
		}
	}
}

Undo.prototype.remember = function (x, y, z, tileX, tileY, tileZ) {
	this.buffer[x][y][z] = [getTile(tileX, tileY, tileZ), Level.getData(tileX, tileY, tileZ)];
}

Undo.prototype.restore = function() { 
	if (this.buffer.length == 0)
		return;

	for(var x = 0; x < this.buffer.length; x++) {
		for(var y = 0; y < this.buffer[0].length; y++) {
			for(var z = 0; z < this.buffer[0][0].length; z++) {
				setTile(this.x + x, this.y + y, this.z + z, this.buffer[x][y][z][0], this.buffer[x][y][z][1]);
			}
		}
	}
}

/* =================================== GLOBAL VARIABLES ================================ */
var select_counter = 0;

var last_tool   = null;

var start = null;
var pos1 = null;
var pos2 = null;
var dest = null;

var replaceFrom = null;
var replaceTo   = null;

var clipboard = [];

var undoSource = new Undo();
var undoDestination = new Undo();

/* ================================== EVENT FUNCTIONS ================================ */
function useItem(x, y, z, item, block, side) {

	// tool change resets selection
	if (last_tool != null && last_tool != item)
		if (item == tool_select || item == tool_fill || item == tool_clear)
			resetSelection();
	last_tool = item;
	
	switch(item){
		case tool_select:
			useToolSelect(x, y, z, false);
			break
		case tool_fill:
			useToolFill(x, y, z);
			break
		case tool_clear:
			useToolClear(x, y, z);
			break
		case tool_copy:
			useToolCopy(x, y, z);
			break
		case tool_move:
			useToolMove(x, y, z);
			break
		case tool_rotate:
			useToolRotate(false);
			break
		case tool_replace:
			useToolReplace(x, y, z);
			break
	}
}

function destroyBlock(x, y, z, side) {
	var item = getCarriedItem();

	switch(item){
		case tool_select:
		case tool_fill:
		case tool_clear:
			useToolSelect(x, y, z, true);
			break;
		case tool_rotate:
			useToolRotate(true);
			break;
	}
}

function procCmd(command) {
	var command = command.split(" ");

	switch(command[0]) {
		case "undo":
		case "/undo":
			undoDestination.restore();	
			undoSource.restore();		
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
			if (command[1])
				load(command[1]);
			else
				clientMessage("No file name");
			break;
		case "replace":
		case "/replace":
			if (command[1] && command[2])
			{
				replaceFrom = [parseInt(command[1])];
				replaceTo = [parseInt(command[2])];
				replace();
			}
			else
				clientMessage("usage: /replace [from] [to]");
			break;
	}
}

/* =================================== TOOL ACTIONS ================================== */
function useToolSelect(x, y, z, reset){
	preventDefault();
	if (reset)
		resetSelection();
	select(x, y, z);
	if (select_counter >= 2)
		copyToClipboard();
}
function useToolFill(x, y, z){
	preventDefault();
	if (select_counter < 2)
		select(x, y, z);
	else
	{
		undoSource.clear();
		undoDestination.clear();
		fill(getTile(x, y, z), Level.getData(x, y, z));
		resetSelection();
	}
}
function useToolClear(x, y, z){
	preventDefault();
	if (select_counter < 2)
		select(x, y, z);
	else
	{
		undoSource.clear();
		undoDestination.clear();
		clearSource();
		resetSelection();

		clientMessage("Cleared");
	}
}
function useToolCopy(x, y, z){
	preventDefault();
	if (checkIfNoSelection()) return;
	dest = [x, y, z];
	undoSource.clear();
	undoDestination.clear();
	pasteFromClipboard();
}
function useToolMove(x, y, z){
	preventDefault();
	if (checkIfNoSelection()) return;
	dest = [x, y, z];
	undoSource.clear();
	undoDestination.clear();
	clearSource();
	pasteFromClipboard();
}
function useToolRotate(counterClockwise){
	preventDefault();
	if (checkIfNoSelection()) return;
	dest = start;
	undoSource.clear();
	undoDestination.clear();
	clearSource();
	rotateClipboard(counterClockwise);
	pasteFromClipboard();
}
function useToolReplace(x, y, z){
	preventDefault();
	if (checkIfNoSelection()) return;			
	if (replaceFrom == null)
	{
		replaceFrom = [getTile(x, y, z), Level.getData(x, y, z)];
		clientMessage("From set");
	}
	else
	{
		replaceTo = [getTile(x, y, z), Level.getData(x, y, z)];
		undoSource.clear();
		undoDestination.clear();
		replace();
		replaceFrom = null;
		replaceTo = null;
		clientMessage("Replaced");
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

		java.io.File(savePath).mkdirs();
		var newFile = new java.io.File(savePath, filename + '.json');
		newFile.createNewFile();
		var outWrite = new java.io.OutputStreamWriter(new java.io.FileOutputStream(newFile));
		outWrite.append(JSON.stringify(content));
		outWrite.close();
		clientMessage('file saved');
	} 
	catch(err) {
		clientMessage(err);
	}
}

function load(filename) {
	try {
		var fileName = savePath + filename + '.json';
		var content = "";

		if (java.io.File(fileName).exists()) {
			var file = new java.io.File(fileName);
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

			clientMessage('file loaded');
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

/* ============================== MANIPULATION FUNCTIONS ============================= */
function rotateClipboard(counterClockwise){
	var axis = determineAxis();

	switch(axis)
	{
		case '+x':
			rotateClipboardX(!counterClockwise)
			break;
		case '-x':
			rotateClipboardX(counterClockwise)
			break;
		case '+y':
			rotateClipboardY(counterClockwise)
			break;
		case '-y':
			rotateClipboardY(!counterClockwise)
			break;
		case '+z':
			rotateClipboardZ(!counterClockwise)
			break;
		case '-z':
			rotateClipboardZ(counterClockwise)
			break;
	}
}

function rotateClipboardX(counterClockwise) {
	counterClockwise = typeof counterClockwise !== 'undefined' ? counterClockwise : false;

	var d = getDimensions();
	
	rotated = [d.wX];
	for(var x = 0; x < d.wX; x++) {
		rotated[x] = [d.wZ];
		for(var z = 0; z < d.wZ; z++) {
			rotated[x][z] = [d.wY];
		}
	}

	for(var x = 0; x < d.wX; x++) {
		for(var y = 0; y < d.wY; y++) {
			for(var z = 0; z < d.wZ; z++) {
				if (counterClockwise)
					rotated[x][z][d.wY - y - 1] = clipboard[x][y][z];
				else
					rotated[x][d.wZ - z - 1][y] = clipboard[x][y][z];
			}
		}
	}

	clipboard = rotated;

	if (counterClockwise)
	{
		pos1 = [pos1[0], pos1[2] + start[1] - start[2], - pos1[1] + start[1] + start[2]];
		pos2 = [pos2[0], pos2[2] + start[1] - start[2], - pos2[1] + start[1] + start[2]];
	}
	else
	{
		pos1 = [pos1[0], - pos1[2] + start[1] + start[2], pos1[1] - start[1] + start[2]];
		pos2 = [pos2[0], - pos2[2] + start[1] + start[2], pos2[1] - start[1] + start[2]];
	}
}

function rotateClipboardY(counterClockwise) {
	counterClockwise = typeof counterClockwise !== 'undefined' ? counterClockwise : false;

	var d = getDimensions();
	
	rotated = [d.wZ];
	for(var z = 0; z < d.wZ; z++) {
		rotated[z] = [d.wY];
		for(var y = 0; y < d.wY; y++) {
			rotated[z][y] = [d.wX];
		}
	}

	for(var x = 0; x < d.wX; x++) {
		for(var y = 0; y < d.wY; y++) {
			for(var z = 0; z < d.wZ; z++) {
				if (counterClockwise)
					rotated[z][y][d.wX - x - 1] = clipboard[x][y][z];
				else
					rotated[d.wZ - z - 1][y][x] = clipboard[x][y][z];
			}
		}
	}

	clipboard = rotated;

	if (counterClockwise)
	{
		pos1 = [pos1[2] + start[0] - start[2], pos1[1], - pos1[0] + start[0] + start[2]];
		pos2 = [pos2[2] + start[0] - start[2], pos2[1], - pos2[0] + start[0] + start[2]];
	}
	else
	{
		pos1 = [- pos1[2] + start[0] + start[2], pos1[1], pos1[0] - start[0] + start[2]];
		pos2 = [- pos2[2] + start[0] + start[2], pos2[1], pos2[0] - start[0] + start[2]];
	}
}

function rotateClipboardZ(counterClockwise) {
	counterClockwise = typeof counterClockwise !== 'undefined' ? counterClockwise : false;

	var d = getDimensions();
	
	rotated = [d.wY];
	for(var y = 0; y < d.wY; y++) {
		rotated[y] = [d.wX];
		for(var x = 0; x < d.wX; x++) {
			rotated[y][x] = [d.wZ];
		}
	}

	for(var x = 0; x < d.wX; x++) {
		for(var y = 0; y < d.wY; y++) {
			for(var z = 0; z < d.wZ; z++) {
				if (counterClockwise)
					rotated[y][d.wX - x - 1][z] = clipboard[x][y][z];
				else
					rotated[d.wY - y - 1][x][z] = clipboard[x][y][z];
			}
		}
	}

	clipboard = rotated;

	if (counterClockwise)
	{
		pos1 = [pos1[1] + start[0] - start[1], - pos1[0] + start[0] + start[1], pos1[2]];
		pos2 = [pos2[1] + start[0] - start[1], - pos2[0] + start[0] + start[1], pos2[2]];
	}
	else
	{
		pos1 = [- pos1[1] + start[0] + start[1], pos1[0] - start[0] + start[1], pos1[2]];
		pos2 = [- pos2[1] + start[0] + start[1], pos2[0] - start[0] + start[1], pos2[2]];
	}
}



function clearSource() {
	var d = getDimensions();

	undoSource.prepare(d.mX, d.mY, d.mZ, d.wX, d.wY, d.wZ);

	for(var x = 0; x < d.wX; x++) {
		for(var y = 0; y < d.wY; y++) {
			for(var z = 0; z < d.wZ; z++) {
				undoSource.remember(x, y, z, d.mX + x, d.mY + y, d.mZ + z);
				setTile(d.mX + x, d.mY + y, d.mZ + z, 0, 0);
			}
		}
	}
}

function copyToClipboard() {
	var d = getDimensions();

	clipboard = [d.wX];
	for(var x = 0; x < d.wX; x++) {
		clipboard[x] = [d.wY];
		for(var y = 0; y < d.wY; y++) {
			clipboard[x][y] = [d.wZ];
			for(var z = 0; z < d.wZ; z++) {
				clipboard[x][y][z] = [getTile(d.mX + x, d.mY + y, d.mZ + z), Level.getData(d.mX + x, d.mY + y, d.mZ + z)];
			}
		}
	}
}

function pasteFromClipboard() {
	var d = getDimensions();

	undoDestination.prepare(dest[0] - d.oX, dest[1] - d.oY, dest[2] - d.oZ, d.wX, d.wY, d.wZ);

	for(var x = 0; x < d.wX; x++) {
		for(var y = 0; y < d.wY; y++) {
			for(var z = 0; z < d.wZ; z++) {
				undoDestination.remember(x, y, z, dest[0] - d.oX + x, dest[1] - d.oY + y, dest[2] - d.oZ + z);
				setTile(dest[0] - d.oX + x, dest[1] - d.oY + y, dest[2] - d.oZ + z, clipboard[x][y][z][0], clipboard[x][y][z][1]);
			}
		}
	}
}

function fill(tile,data) {
	var d = getDimensions();
							 
	undoSource.prepare(d.mX, d.mY, d.mZ, d.wX, d.wY, d.wZ);

	for(var x = 0; x < d.wX; x++) {
		for(var y = 0; y < d.wY; y++) {
			for(var z = 0; z < d.wZ; z++) {
				undoSource.remember(x, y, z, d.mX + x, d.mY + y, d.mZ + z);
				setTile(d.mX + x, d.mY + y, d.mZ + z, tile, data);
			}
		}
	}
}

function replace() {
	var d = getDimensions();
							 
	undoSource.prepare(d.mX, d.mY, d.mZ, d.wX, d.wY, d.wZ);

	for(var x = 0; x < d.wX; x++) {
		for(var y = 0; y < d.wY; y++) {
			for(var z = 0; z < d.wZ; z++) {
				undoSource.remember(x, y, z, d.mX + x, d.mY + y, d.mZ + z);
				if (replaceFrom[0] == getTile(d.mX + x, d.mY + y, d.mZ + z))
					setTile(d.mX + x, d.mY + y, d.mZ + z, replaceTo[0], Level.getData(d.mX + x, d.mY + y, d.mZ + z));
			}
		}
	}
}

/* ================================= HELPER FUNCTIONS ================================ */
function getDimensions() {
	var d = {
		wX: Math.abs(pos1[0] - pos2[0]) + 1,
		wY: Math.abs(pos1[1] - pos2[1]) + 1,
		wZ: Math.abs(pos1[2] - pos2[2]) + 1,
		mX: Math.min(pos1[0], pos2[0]),
		mY: Math.min(pos1[1], pos2[1]),
		mZ: Math.min(pos1[2], pos2[2]),
		oX: 0,
		oY: 0,
		oZ: 0
	}

	d.oX = (start[0] > d.mX ? Math.abs(start[0] - d.mX) : 0);
	d.oY = (start[1] > d.mY ? Math.abs(start[1] - d.mY) : 0);
	d.oZ = (start[2] > d.mZ ? Math.abs(start[2] - d.mZ) : 0);

	return d;
}

function checkIfNoSelection(){
	if (clipboard.length == 0)
	{
		clientMessage("No selection");
		return true;
	}
	return false;
}

function determineAxis() {
	var deltaX = getPlayerX() - start[0];
	var deltaY = getPlayerY() - start[1];
	var deltaZ = getPlayerZ() - start[2];

	return Math.abs(deltaX) > Math.abs(deltaY)
		? (Math.abs(deltaX) > Math.abs(deltaZ) ? (deltaX>0?'+':'-')+'x' : (deltaZ>0?'+':'-')+'z')
		: (Math.abs(deltaY) > Math.abs(deltaZ) ? (deltaY>0?'+':'-')+'y' : (deltaZ>0?'+':'-')+'z')
}