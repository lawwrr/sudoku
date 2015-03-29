var tiles = {
	unsolved: {},
	solved: {},

	all: {}
}
var rows = {
	_possibles: {},
	_possibleNumbers: {},

	unsolved: {},
	solved: {},
}
var cols = {
	_possibles: {},
	_possibleNumbers: {},

	unsolved: {},
	solved: {},
}
var quads = {
	_possibles: {},
	_possibleNumbers: {},

	unsolved: {},
	solved: {}
}

var utils = {
	clone: function(obj) {
		var clone = {};
		for(var i in obj) {
			if(typeof obj[i] == "object") {
				clone[i] = utils.clone(obj[i]);
			} else {
				clone[i] = obj[i];
			}
		}

		return clone;

	}
}

var game = {

	_cycle: 0,
	_hasWon: false,

	loop: function() {

		/*is it over?*/
		if(game._hasWon === true) {
			return true;
		}

		if(Object.keys(tiles.unsolved).length === 0) {
			game._hasWon = true;
			$(document).trigger('won');
			return true;
		}

		recache.game();

		solve.pairs('all');

		for (var key in tiles.unsolved) {
			solve.basic('all',key);

			/*refresh tiles.all with new data*/
			tiles.all[key] = tiles.unsolved[key];
		}

		if(game._cycle > 1) {
			solve.singles('all');
		}

		game._cycle++;

		$(document).trigger('loopRan');
	}
}

var get = {

	/*from tile #*/
	coordsFromTile: function(tile) {
		var tilePosY = Math.ceil(tile/9);
		var tilePosX = 9 - ( ( 9 * tilePosY ) - tile);
		var tilePos = [tilePosX,tilePosY];

		return tilePos;
	},

	/*from tile coords (i.e. [3,3])*/
	tileFromCoords: function(tile) {
		var tile = (9*(tile[1]-1))+tile[0];
		return tile;
	},

	selector: function(type) {
		switch (type) {
			case 'quad': selector = quads;
				break;
			case 'row' : selector = rows;
				break;
			case 'col' : selector = cols;
				break;
			default:	return false;
				break;
		}

		return selector;
	},

	subselector: function(type) {
		switch (type) {
			case 'quad': subselector = 'quad';
				break;
			case 'row' : subselector = 'row';
				break;
			case 'col' : subselector = 'col';
				break;
			default:	return false;
				break;
		}

		return subselector;
	}
};

var solve = {

	basic: function(type,tile) {

		if(type == 'all') {
			solve.basic('row',tile); solve.basic('col',tile); solve.basic('quad',tile); return false;
		}
		selector = get.selector(type);
		subselector = get.subselector(type);

		var tileMeta = tiles.all[tile];

		/*recount available possibilities for each tile*/
		recache.container(type,tileMeta[subselector]);

		/*apply changes*/
		solve.deletePossibles(type,tileMeta);

	},

	singles: function(type) {

		if(type == 'all') {
			solve.singles('row'); solve.singles('col'); solve.singles('quad'); return false;
		}
		selector = get.selector(type);
		subselector = get.subselector(type);

		for(masterItem in selector._possibleNumbers) {
			for(matchingPossibleNumber in selector._possibleNumbers[masterItem]) {

				var tile = selector._possibleNumbers[masterItem][matchingPossibleNumber].appears[0];

				if(
					typeof tiles.unsolved[tile] != 'undefined' &&
					typeof tiles.unsolved[tile].possible != 'undefined' &&
					selector._possibleNumbers[masterItem][matchingPossibleNumber].count == '1'
				) {

					tiles.unsolved[tile].possible = {};
					tiles.unsolved[tile].possible[matchingPossibleNumber] = matchingPossibleNumber;

					/*apply changes*/
					solve.deletePossibles(type,tiles.unsolved[tile]);
				}

			}
		}

	},

	pairs: function(type) {

		if(type == 'all') {
			solve.pairs('row'); solve.pairs('col'); solve.pairs('quad'); return false;
		}
		selector = get.selector(type);
		subselector = get.subselector(type);

		/*solves matching pairs of tiles on all masters*/
		for(masterItem in selector._possibles) {
			for(matchingPossibles in selector._possibles[masterItem]) {
				if(
					selector._possibles[masterItem][matchingPossibles].count > 1 &&
					selector._possibles[masterItem][matchingPossibles].count ==
					selector._possibles[masterItem][matchingPossibles].length
				) {

					/*there's a matching quad, delete all other possibilities*/
					for(var tile in selector.unsolved[masterItem].tiles) {
						if(
							typeof tiles.unsolved[tile] != 'undefined' &&
							JSON.stringify(selector.unsolved[masterItem].tiles[tile].possible) !=
							JSON.stringify(selector._possibles[masterItem][matchingPossibles].values)
						) {
							for(var value in selector._possibles[masterItem][matchingPossibles].values) {
								delete tiles.unsolved[tile].possible[value];
							}
						}
					}

				}
			}
		}
	},

	deletePossibles: function(type,tile) {

		selector = get.selector(type);
		subselector = get.subselector(type);

		if(typeof tile != 'object') {
			tile = tiles.all[tile];
		}
		for(unsolvedTileI in selector.unsolved[tile[subselector]].tiles) {
			for(solvedTileI in selector.solved[tile[subselector]].tiles) {
				delete selector.unsolved[tile[subselector]].tiles[unsolvedTileI].possible[selector.solved[tile[subselector]].tiles[solvedTileI].num];
			}
		}

		return true;
	}
}

var recache = {

	game: function() {

		/*first run*/
		if(tiles.all.length == undefined) {

			for(var i in tiles.unsolved) {
				tiles.all[i] = tiles.unsolved[i];
			}

			$(document).trigger('gameReady');

		}

		/*is the tile done?*/
		for (var key in tiles.unsolved) {
			var obj = tiles.unsolved[key];

			if(typeof obj.num != 'undefined') {

				delete tiles.all[key].possible;
				delete tiles.unsolved[key];

			}

			else {
				var i2 = 0;
				var lastPossible = 0;
				for(i in obj.possible) {
					i2++;
					lastPossible = i;
				}
				if(i2 == 1) {
					tiles.all[key].num = lastPossible;
					delete tiles.all[key].possible;
					delete tiles.unsolved[key];
				}
				else if (i2 == 0) {
					$(document).trigger('error');
				}
			}
		}
	},

	container: function(type,container) {

		if(type != 'row' && type != 'col' && type != 'quad') {
			return false;
		}

		selector = get.selector(type);

		/*is the container cached?*/
		if(typeof selector.unsolved[container] != 'undefined' && selector.unsolved[container]._lastUpdate == game._cycle) {
		}
		else {

			/*create container objects*/
			if(typeof selector.unsolved[container] == 'undefined') {
				selector.unsolved[container] = {};
			}
			if(typeof selector.solved[container] == 'undefined') {
				selector.solved[container] = {};
			}

			selector._possibles[container] = {};
			selector._possibleNumbers[container] = {};

			selector.unsolved[container].tiles = {};
			selector.unsolved[container]._lastUpdate = game._cycle;
			selector.solved[container].tiles = {};
			selector.solved[container]._lastUpdate = game._cycle;

			/*get tiles from container*/
			if(type != 'quad') {
				for(i=1;i<=9;i++) {
					if(type == 'row') {
						var tile = get.tileFromCoords([i,container]);
					}
					if(type == 'col') {
						var tile = get.tileFromCoords([container,i]);
					}

					recache.tile(type,container,tile);
				}
			}
			else {
				tileoriginY = (container[0]-1)*3;
				tileoriginX = (container[1]-1)*3;

				for(iX=1;iX<4;iX++) {
					for(iY=1;iY<4;iY++) {

						var tileX = tileoriginX + iX;
						var tileY = tileoriginY + iY;
						var tile = get.tileFromCoords([tileX,tileY]);
						recache.tile(type,container,tile);
					}
				}
			}
		}
	},

	tile: function(type,container,tile) {

		selector = get.selector(type);
		subselector = get.subselector(type);

		/*build the objects*/
		if(typeof selector._possibles[container] == 'undefined') {
			selector._possibles[container] = {};
		}

		if(typeof selector._possibleNumbers[container] == 'undefined') {
			selector._possibles[container] = {};
		}

		if(typeof selector._possibles[container][JSON.stringify(tiles.all[tile].possible)] == 'undefined') {
			selector._possibles[container][JSON.stringify(tiles.all[tile].possible)] = {};
			selector._possibles[container][JSON.stringify(tiles.all[tile].possible)].values = tiles.all[tile].possible;
			selector._possibles[container][JSON.stringify(tiles.all[tile].possible)].count = 0;
			selector._possibles[container][JSON.stringify(tiles.all[tile].possible)].length = 0;
		}

		/*count the number of times a same set of possible matches appears on a container (ie (2,5) twice)*/
		selector._possibles[container][JSON.stringify(tiles.all[tile].possible)].count +=1;

		/*run over all tiles, add the value as a possible since it's required to exclude that number from the container*/
		if(typeof tiles.all[tile].possible !== 'undefined') {
			var possiblesToLoop = Object.create(tiles.all[tile].possible);
		}
		else {
			var possiblesToLoop = {};
		}
		if(typeof tiles.all[tile].num !== 'undefined') {
			possiblesToLoop[tiles.all[tile].num] = tiles.all[tile].num;
		}
		for(var prop in possiblesToLoop) {

			/*calculate the length of the possible matches object, and divide by count*/
			selector._possibles[container][JSON.stringify(tiles.all[tile].possible)].length += 1;

			/*also group possible numbers to later find of there's only one on a container*/
			if(typeof selector._possibleNumbers[container][prop] == 'undefined') {
				selector._possibleNumbers[container][prop] = {};
				selector._possibleNumbers[container][prop].count = 0;
				selector._possibleNumbers[container][prop].appears = [];
			}

			selector._possibleNumbers[container][prop].count += 1;
			selector._possibleNumbers[container][prop].appears[selector._possibleNumbers[container][prop].count-1] = tile;

		}

		selector._possibles[container][JSON.stringify(tiles.all[tile].possible)].length =
			selector._possibles[container][JSON.stringify(tiles.all[tile].possible)].length /
			selector._possibles[container][JSON.stringify(tiles.all[tile].possible)].count;


		if(typeof tiles.unsolved[tile] != 'undefined') {
			selector.unsolved[container].tiles[tile] = tiles.all[tile];
		}
		else {
			selector.solved[container].tiles[tile] = tiles.all[tile];
		}
	}

}

var ui = {

	_possibleArr: [],

	paintBoard: function() {

		$('.board').html('');
		for (var key in tiles.all) {

			var obj = tiles.all[key];
			var possibles = '';

			if(typeof obj.num == 'undefined') {
				number = ' ';
			}
			else {
				number = obj.num;
			}

			ui._possibleArr = [
				'<span class="nil">0</span>',
				'<span class="nil">0</span>',
				'<span class="nil">0</span>',

				'<span class="nil">0</span> ',
				'<span class="nil">0</span>',
				'<span class="nil">0</span>',

				'<span class="nil">0</span> ',
				'<span class="nil">0</span>',
				'<span class="nil">0</span>'
			];

			var possibles = '';

			for (i in tiles.all[key].possible) {
				ui._possibleArr[i-1] = tiles.all[key].possible[i];
			}

			for (i in ui._possibleArr) {
				possibles += ui._possibleArr[i]+' ';
			}

			$('.board').append(
				'<tile onclick="console.log(\''+key+'\')" key="'+key+'"><number>'+number+'</number><possibles>'+possibles+'</possibles></tile>'
			);
		}
	}

}

$(function(){

	$(document).bind('gameReady loopRan',function(){
		ui.paintBoard();
	})

	$(document).bind('won',function(){
		clearInterval(window.solverInterval);
	})

	$('.solveGame').bind('click',function(event){
		event.preventDefault();
		clearInterval(window.solverInterval);

		/*it's on an interval so you can see the sudoku solve before you. It's cool*/
		window.solverInterval = setInterval(function(){
			game.loop();
		},1);

		setTimeout(function(){
			clearInterval(window.solverInterval);
		},2000);

	});

	$('.solveStep').bind('click',function(event){
		event.preventDefault();
		game.loop();
	});


	debug.tileizeDefaultTiles();
	recache.game();
});

//DEBUG CODE

var debug = {
	_defaultTiles:
	'002100000'+
	'040000560'+
	'010030007'+
	'000000004'+
	'005060200'+
	'100000000'+
	'300070010'+
	'029000030'+
	'000004800',

	_adefaultTiles:
	'000000003'+
	'634700000'+
	'010006400'+
	'360510000'+
	'080000020'+
	'000029016'+
	'001200040'+
	'000004731'+
	'700000000',

	tileizeDefaultTiles: function() {
		for(i=1; i<debug._defaultTiles.length+1; i++) {

			/*init tile*/
			tiles.unsolved[i] = {};

			/*posible values*/
			if(typeof debug._defaultTiles.charAt(i-1) !== 'undefined' && debug._defaultTiles.charAt(i-1) != '0') {
				tiles.unsolved[i].num = debug._defaultTiles.charAt(i-1);
			}
			else {
				tiles.unsolved[i].possible = {1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9};
			}

			/*sure values*/
			tiles.unsolved[i].row = Math.ceil(
				i/9
			);

			tiles.unsolved[i].col = Math.ceil(
				i -
				(9*(tiles.unsolved[i].row-1))
			);

			tiles.unsolved[i].quad = [Math.ceil(
				tiles.unsolved[i].row/3
			),
			Math.ceil(
				tiles.unsolved[i].col/3
			)];

		}
	}
}