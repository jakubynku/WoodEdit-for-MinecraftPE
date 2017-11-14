# WoodEdit-for-MinecraftPE
Extension script for fast and commandless world edit in Minecraft Pocket Edition (requires BlockLaucher)

<h2>Introduction</h2>

This script is inspired by Worldedit PE (Android) script for BlockLauncher (http://mcpedl.com/worldedit-pe/). Despite Worldedit has many helpfull features, it is based on entering text commands, wich is quite uncomfortable when you play Minecraft on phones or tablets.

Instead of using text commands, this script is based on using wooden tools:

<b>Stick</b> - for selecting cuboids

<b>Wooden Shovel</b> - for copying selected cuboid into new place<br/>
<b>Wooden Hoe</b> - for move selected cuboid into new place<br/>
<b>Wooden Axe</b> - for rotate selected cuboid around Y axis<br/>
<b>Fishing Rod</b> - for replace certain block to another inside selected cuboid

<b>Wooden Sword</b> - for clear selected cuboid (fill with Air)<br/>
<b>Wooden Pickaxe</b> - for fill selected cuboid by certaind block

There are also three text commands implemented:

<b>/undo</b> - for undo last wooden tool operation<br/>
<b>/save [filename]</b> - for save selected cuboid into local file<br/>
<b>/load [filename]</b> - for load local file data into clipboard for further copy / rotate operations

<h2>Tool reference</h2>

<h3>Stick</h3>

Stick is used for incremental selecting cuboid. Each time when You tap certain block with stick, this block extends existing selection. Long press with the stick on the block resets the selection (pressed block becomes first selected block). All works like this:

- tap on first block - this block becomes a start of selection (this defines <b>starting point</b> - important for other wooden tools operations!), message "1st" appears on the screen
- tap on the second block - second block extends the selection - script construct a cuboid, wich oposite corners are at selected block locations. Message "2nd" appears on then screen
- if You want / need to - tap on the third block. Script adds this block to the selection by extend cuboid - it finds smallest one, that containt all three selected blocks. Message "3rd" appears on the screen
- and so on, and so on...

After each tap - selected cuboid is copied to the clipboard for further copy / move / rotate operations

<h3>Wooden Shovel</h3>

Places a cuboid from clipboard into the world (copy operation). To place cuboid, simply tap with shovel on some block. Tapped block becomes destination location - cuboid is placed into world a way, that <b>starting point</b> of selected cuboid replaces tapped block. Rest of the cuboid is placed respectively.

By carefully decide which block is tapped by stick to begin selection (creating <b>starting point</b>) and which block is tapped by shovel, You can precisly control, where You'r cuboid should be pasted.

<h3>Wooden Hoe</h3>

Places a cuboid from clipboard into the world and clears the original location (move operation). All rest is like working with wooden shovel.

<h3>Wooden Axe</h3>

Rotates a selected cuboid around Y axis clockwise. 

<h3>Fishing Rod</h3>

Used for replace all blocks of certain type with another (in selected cuboid). First tap with wooden fishing rod on one of the block to replace (this defines type of the block to be replaced). Then tap on some block of destinatin type (this defines type of block, which will replace all selected blocks in first step)

<h3>Wooden Sword</h3>

Used to clear selected cuboid, <b>but works independend of the Stick selection!</b> First two taps on the two blocks with the wooden sword creates a selection to clear - script construct a cuboid, wich oposite corners are at selected block locations. Third tap clears the selection.

Long press with the wooden sword on the block resets the selection (pressed block becomes first selected block).

Can be uset to fast, three-tap remove of walls, ceilings, floors, whole large cuboid regions etc.

<h3>Wooden Pickaxe</h3>

Used to clear selected cuboid, <b>but works independend of the Stick selection!</b> First two taps on the two blocks with the wooden pickaxe creates a selection to fill - script construct a cuboid, wich oposite corners are at selected block locations. Third tap on the certain block defines a block type, wich will fill selected cuboid. 

Long press with the wooden pickaxe on the block resets the selection (pressed block becomes first selected block).

Can be used to fast, three-tap construct of walls, ceilings, floors, whole large cuboid regions  etc. 

<h2>Predefined commands</h2>

<h3>/undo</h3>

Undoes last wooden tool operation results. This is only one level undo!

<h3>/save [filename]</h3>

Saves selected cuboid stored in clipboard to the file on the local storage. If file with this name already exists, it is overwritten.

<h3>/load [filename]</h3>

Loads cuboid stored in file into the clipboard for further operations (like copy (Wooden Shovel), move (Wooden Hoe) or rotate (Wooden Axe))

<h2>Other informations</h2>

<b>Remember:</b> 
- Changing tool between Stick, Wooden Sword or Wooden Pickaxe always clears Your selection!
- Unlike a Stick, Wooden Sword and Wooden Pickaxe works like simple, two-point selection tools. Third tap with this tools always executes desired action!
