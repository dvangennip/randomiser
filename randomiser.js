/* Global variables -------------------------------- */

var rf;

/* Helper functions -------------------------------- */

/**
 * Extends Element to simplify creating new elements
 *
 * Events can be added by including an 'events' object.
 *
 * Example:
 * var button = Element.make('button', {'id': 'fancy_button', 'class': 'fancy', 'events': {'click': handlerFn}}); 
 */
Element.make = function (_nodeType, _attributes) { // my own concoction
	var nodeType = (_nodeType !== undefined && typeof _nodeType === 'string') ? _nodeType : 'div',
		attr = (_attributes !== undefined && typeof _attributes === 'object') ? _attributes : {},
		el = document.createElement(nodeType),
		key, skey;
	for (key in attr) {
		if (key === 'innerHTML') el.innerHTML = attr[key];
		else if (key === 'events' && typeof attr[key] === 'object') {
			for (skey in attr[key]) { // add all event listeners
				el.addEventListener(skey, attr[key][skey]);
			}
		} else el.setAttribute(key, attr[key]);
	}
	return el;
};

/**
 * Function shuffles the order of elements randomly, something
 * which a bubble-sort algorithm (used by Array.prototype.sort) cannot accomplish.
 * Implements http://en.wikipedia.org/wiki/Fisher-Yates_shuffle
 *
 * It works on an array itself, but returns this instance as well.
 * 
 * @author: http://stackoverflow.com/a/962890
 */
Array.prototype.shuffle = function () {
    var tmp, currentItem, topItem = this.length;

    if (topItem) while(--topItem) {
        currentItem = Math.floor(Math.random() * (topItem + 1));
        tmp = this[currentItem];
        this[currentItem] = this[topItem];
        this[topItem] = tmp;
    }
    return this; // helps chaining
};

/**
 * Function goes over each item in the array and checks whether the successive
 * occurence of items is below chance level. If so, the item that triggered the
 * cutoff is moved to the end of the array. This prevents items in the array from
 * occuring an unlikely or unpreferred amount of times in succession.
 *
 * Use this after Array.prototype.shuffle or other major changes.
 *
 * Example:
 * Four different items, so each has a chance of occuring at the next time of 1/4.
 * The change of occuring twice is (1/4)^2 = 1/16 = .0625, thrice (1/4)^3 = 1/64 = .0156.
 * If the cutoff is set at 0.05 this third item will be relegated to the back of the array (as .0156 < 0.05).
 *
 * Note: this function assumes comparable items, such that one item could be tested for equality with the next one.
 *       Arrays and other non-primitive data types cause trouble.
 *
 * @param {Number} inCutoff (Optional) A number between 0 and 1 that gives the cutoff change (default 0.05)
 */
Array.prototype.balanceOrder = function (inCutoff) {
	var h = 0,
		occurences = 0,
		previousItem,
		cutoffChance = (!isNaN(inCutoff) && inCutoff > 0 && inCutoff < 1) ? inCutoff : 0.05,
		kindOfGroups = [];
		chanceForGroup = 0; // what is the chance a succession happens?
		
	// find out how many different items there are
	this.forEach(function (item, index) {
		var notFoundYet = kindOfGroups.every(function (listItem, listIndex) {
			if (listItem === item) // found
				return false;
			return true; // continue search
		});
		if (notFoundYet) // add to list
			kindOfGroups.push(item);
	});
	chanceForGroup = 1 / kindOfGroups.length;
		
	// loop over all items
	// Because an item may be moved to the end with the next item taking up the index of the
	// now moved item the forEach or regular for loop cannot be used.
	// Stop one before the last element, otherwise it can get stuck if the last is similar
	// to the one before, resulting in moving it to the back and do so over and over and over.
	while (h < this.length-1) {
		if (this[h] === previousItem)
			occurences++;
		else
			occurences = 1;
		// check if the succession is still within reasonable chance level
		if (occurences > 1) {
			var successionChance = Math.pow(chanceForGroup, occurences);
			if (successionChance < cutoffChance) {
				// move this element to end of output
				var thisItem = this.splice(h, 1); // returns array with one element
				this.push(thisItem[0]);
				// skip updating previousItem and h
				continue;
			}
		}
		// update reference for next turn
		previousItem = this[h];
		h++;
	}
	return this; // helps chaining
};

/**
 * Removes all undefined or null elements from array
 */
Array.prototype.clean = function () {
	// traverse downwards as elements could be deleted along the way
	for (i = this.length; i >= 0; --i) {
		if (this[i] === undefined || this[i] === null) this.splice(i,1);
	}
	return this; // helps chaining
};

/* DOMready event handler -------------------------------- */

/**
 * Gets triggered when the DOM content is loaded, thus when all HTML and Javascript is ready.
 * This prevents scripts from acting before elements or parts of the script are available.
 */
window.addEventListener('DOMContentLoaded', function () {
	rf = new Randomiser();
});

/* Form class --------------------------------------------- */

var Randomiser = function () {
	// init variables
	this.outputToFile = false;
	this.outputType = 1;
	this.groups = [];

	// setup edit form
	this.form = document.getElementById('random-form');
	this.form.addEventListener('submit', this.randomise.bind(this));
	// link to existing elements
	this.participantCount = document.getElementById('participants-count');
	this.participantTogether = document.getElementById('participants-together');
	this.outputTypeSelector = document.getElementById('output-selector');
	this.outputTypeSelector.addEventListener('change', this.switchOutputType.bind(this));
	this.outputTypeSeparator = document.getElementById('output-separator');
	this.exportCheckbox = document.getElementById('tofile');
	this.exportCheckbox.addEventListener('click', this.outputToFileChanged.bind(this));
	
	// link to hidden inputs in the form to save output content
	this.outputContentType = document.getElementById('t');
	this.outputName = document.getElementById('n');
	this.outputContent = document.getElementById('f');
	// init groups placeholder
	this.groupsWrapper = document.getElementById('groups');
	// add group button
	this.groupAddButton = document.getElementById('groups-add-button');
	this.groupAddButton.addEventListener('click', function (inEvent) {
		inEvent.preventDefault(); // prevent bubbling up and being interpretted as submit
		this.addGroup(inEvent);
	}.bind(this));
	// init output
	this.randomisedOutput = document.getElementById('output');
	
	// form is already available in default configuration
	// setup right disabled / enabled state
	this.switchOutputToFile(this.outputToFile);
	
	// add one group
	this.addGroup();
};
Randomiser.prototype = {
	
	/**
	 * Event handler - Sets export status based on checkbox value
	 */
	outputToFileChanged: function (inEvent) {
		if (this.exportCheckbox.checked) this.outputToFile = true;
		else this.outputToFile = false;
		this.switchOutputToFile(this.outputToFile);
	},
	
	/**
	 * Updates the form elements in line with the current internal values
	 * Usually gets called by event handlers
	 */
	switchOutputToFile: function (inOutputToFile) {
		if (inOutputToFile) {
			// enable two selector elements
			this.outputTypeSelector.disabled = false;
			if (this.outputType === 1) this.outputTypeSeparator.disabled = false;
		} else {
			// disable two selector elements
			this.outputTypeSelector.disabled = true;
			this.outputTypeSeparator.disabled = true;
		}
	},
	
	/**
	 * Event handler for type selector changes
	 */
	switchOutputType: function (inEvent) {
		this.outputType = parseInt(this.outputTypeSelector.value, 10);
		if (this.outputType === 1) this.outputTypeSeparator.disabled = false;
		else this.outputTypeSeparator.disabled = true;
	},
	
	/**
	 * Event handler which creates and adds a new group to the list
	 * Specific group behaviour is handler by its GroupController which is initiated here
	 */
	addGroup: function (inEvent) {
		// get a unused number in range [0,100] for the group
		var i, iIsAvailable, newGroupNumber;
		for (i = 1; i < 100; i++) {
			iIsAvailable = this.groups.every(function (it, index) {
				if (it.groupNumber === i) return false; // stops every()
				return true;
			}.bind(this));
			if (iIsAvailable) {
				newGroupNumber = i;
				break;
			}
		}
		// init group
		this.groups.push(new GroupController(newGroupNumber, this));
		this.groupsChanged();
	},
	
	/**
	 * Gets called by a group itself with its number as argument
	 * Because this is the parent object which does the bookkeeping
	 * addition and deletion is initiated from here.
	 * Thus a group delete request takes a roundtrip from the group
	 * to here and then on to its dispose fn.
	 */
	removeGroup: function (inGroupToDelete) {
		// first check total number of groups -> 1 is the minimal amount
		if (this.groups.length > 1) {
			var groupToDelete = inGroupToDelete;
			// find the right group and remove
			this.groups.every(function (item, index) {
				// call dispose method - only returns true if it's ok to delete
				if (item.groupNumber === groupToDelete && item.dispose()) {
					// remove from list; set to NULL
					this.groups[index] = null;
				}
				return true; // always returns true, otherwise every fn might stop
			}, this);
			this.groups.clean(); // does away with null or undefined items
		}
		this.groupsChanged();
	},
	
	/**
	 * Should be called anytime the groups array is adjusted (addition and deletions).
	 * Function makes sure everything is fine (e.g., delete state is properly set)
	 */
	groupsChanged: function () {
		var onlyOneGroup = (this.groups.length === 1) ? true : false;
		this.groups.forEach(function (item, index) {
			item.setDeleteButtonState(!onlyOneGroup);
		});
	},
	
	/**
	 * This function does the actual randomisation procedure.
	 *
	 * This function first adds an equal number of sessions per condition group,
	 * hereby guaranteeing a balanced design (each condition will be presented the same
	 * number of times). Next it shuffles the order randomly. Within group conditions
	 * get shuffled as well.
	 * 
	 * Finally it pushes the output into hidden form elements which are based on a
	 * server's script where it will be returned to the browser as downloadable file.
	 * Alternatively the output is shown as table on the bottom of this page.
	 */
	randomise: function (inEvent) {
		//if (inEvent) inEvent.preventDefault(); // use during development to prevent page reloads
		// flush old data that is no longer relevant
		this.outputContentType.value = '';
		this.outputName.value = '';
		this.outputContent.value = '';
		
		// first check whether the current form values are valid - if so, continue
		var formIsValid = (this.form.checkValidity) ? this.form.checkValidity() : true; // fn is a recent HTML5 addition, not all browsers support it
		if (formIsValid) {
			// init and get variables
			var conditions = [],
				output = [],
				numberOfGroups = this.groups.length,
				longestConditionLength = 0,
				numberOfParticipants = parseInt(this.participantCount.value, 10),
				participantsTogether = parseInt(this.participantTogether.value, 10),
				numberOfSessionsPerGroup = Math.round((numberOfParticipants / participantsTogether) / numberOfGroups),
				c, g, i, j, k;
			
			// get conditions
			for (i = 0; i < numberOfGroups; i++) {
				// assign conditions
				conditions.push(this.groups[i].getConditions());
				// find longest amount of conditions
				if (conditions[i].length > longestConditionLength) {
					longestConditionLength = conditions[i].length;
				}
			}
			
			// add each group n times in results
			for (k = 0; k < numberOfGroups; k++) {
				for (j = 0; j < numberOfSessionsPerGroup; j++) {
					output.push(k);
				}
			}
			// randomise the order between groups (which were added in series)
			output.shuffle().balanceOrder();
			
			// fill the conditions per group
			for (g = 0; g < output.length; g++) {
				// add a group's conditions to output (uses a copy to avoid referencing the original array over and over)
				output[g] = conditions[ output[g] ].slice(0); // slice returns a copy :)
				output[g].shuffle().balanceOrder(); // randomise within group
				
				// add ID number of this condition group
				output[g].unshift(g+1);
				
				// add participant numbers to the front of each row (has to happen after randomisation procedure)
				var participantNumbers;
				if (participantsTogether > 1)
					participantNumbers = (g*participantsTogether+1) + " - " + (g*participantsTogether+participantsTogether);
				else participantNumbers = (g+1);
				output[g].unshift(participantNumbers);
			}
						
			// add header at beginning
			var header = ["Participants","Group"];
	  		for (c = 0; c < longestConditionLength; c++)
				header[c+2] = "Condition " + (c+1);
	  		output.unshift(header);
			
			// generate the table code for display on this page
			this.generateHTMLtable(output);
			// if file output is requested do so
			if (this.outputToFile) {
				// get correct content
				if (this.outputType === 2) {
					this.outputContentType.value = 'application/json';
					this.outputName.value = 'randomised.js';
					this.outputContent.value = this.generateJSON(output);
				} else if (this.outputType === 1) {
					this.outputContentType.value = 'text/csv';
					this.outputName.value = 'randomised.csv';
					this.outputContent.value = this.generateCSV(output);
				} else { // default to html
					this.outputContentType.value = 'text/html';
					this.outputName.value = 'randomised.html';
					this.outputContent.value = this.generateHTMLtable(output);
				}
				// return true and let the browser access the address specified in the form's action property
				return true;
			}
		}
		// scroll to results
		this.randomisedOutput.scrollIntoView()
		// returning false means the inEvent will be cancelled
		if (inEvent && inEvent.preventDefault) inEvent.preventDefault();
		return false;
	},
	
	/**
	 * Function generates a HTML table wraps that in HTML page code
	 * which is returned, to be passed on to a script.
	 * If no file output is requested it is placed in the page and shown.
	 */
	generateHTMLtable: function (myOutput) {
		// init table and generate code
		var htmlTable = Element.make('table', {
				'id': 'output-table',
				'style': 'text-align: center;'
			}),
			htmlCode = [];
		
		// add a nice caption to the table
		htmlTable.appendChild( Element.make('caption', {'innerHTML': 'Random assignment of participants'}) );
		
		// for each row write out the resulting data
		for (r = 0; r < myOutput.length; r++) {
			var row = Element.make('tr');
			for (d = 0; d < myOutput[r].length; d++) {
				if (r===0) { // header
					row.appendChild( Element.make('th', {'innerHTML': myOutput[r][d]}) );
				} else { // normal row cell
					row.appendChild( Element.make('td', {'innerHTML': myOutput[r][d]}) );
				}
			}
			htmlTable.appendChild(row);
		}
				
		// place html in page - after emptying placeholder element
		while (this.randomisedOutput.firstChild) this.randomisedOutput.removeChild(this.randomisedOutput.firstChild);
		this.randomisedOutput.appendChild(htmlTable);
		
		// complete the HTML code with everything, including styles, before sending it out
		var htmlCode = [
			'<!DOCTYPE html>',
			'<html>',
			'<head>',
			'<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />',
			'<title>Random assignment of participants</title>',
			'<style>',
			'table { background: #fff; text-align: center; }',
			'table th, table td { padding: 0 10px; }',
			'table tr { padding: 3px 0; }',
			'table tr:nth-of-type(2n) {	background: #eef; }',
			'</style>',
			'</head>',
			'<body>',
			'<p>www.sinds1984.nl/extra/randomiser</p>',
			this.randomisedOutput.innerHTML,
			'</body>',
			'</html>'
		];
		return htmlCode.join('\n'); // joined with linefeed character for readability
	},
	
	/**
	 * Function generates a Comma Separated Values string,
	 * which is easily imported in spreadsheet software and can easily be parsed by code.
	 */
	generateCSV: function(myOutput) {
		// get separator to use between datapoints
		var separator = this.outputTypeSeparator.value;
		var csvFile = 'Condition randomiser'+separator+'\n';
		// fill in data
		// for each row
		for (r = 0; r < myOutput.length; r++) {
			// for each cell
			for (d = 0; d < myOutput[r].length; d++) {
				csvFile = csvFile + myOutput[r][d] + separator;
			}
			csvFile = csvFile + '\n'; // add linefeed
		}
		// return CSV output
		return csvFile;
	},
	
	/**
	 * Function generates stringified JSON object,
	 * which can be read by Javascript using JSON.parse().
	 * Other languages have other ways to support JSON.
	 */
	generateJSON: function (inOutput) {
		var output = {
			info: 'Randomised conditions',
			data: inOutput
		}
		return JSON.stringify(output);
	}
};

/**
 * A GroupController manages the behaviour and data for one group of conditions.
 * It places a text input field and delete button in the DOM.
 */
var GroupController = function (inNumber, inParent) {
	// init variables
	this.groupNumber = inNumber;
	this.parentForm = inParent;
	this.readyForDisposal = false;
	// create elements
	this.groupWrapper = Element.make('div', {
		'class': 'group-wrapper'
	});
	this.groupInput = Element.make('input', {
		'id': 'group-'+this.groupNumber,
		'name': 'group-'+this.groupNumber,
		'type': 'text',
		'value': 'lather, rinse, repeat',
		'class': 'conditionGroup inputSingle minLength:1'
	});
	this.groupLabel = Element.make('label', {
		'id': 'group-label-'+this.groupNumber,
		'class': 'cms-label',
		'for': this.groupInput.id,
		'innerHTML': 'Conditions within group '+this.groupNumber+' (separate with , comma)'
	});
	this.groupDeleteButton = Element.make('button', {
		'id': 'group-delete-button-'+this.groupNumber,
		'class': 'group-delete',
		'innerHTML': 'Delete group',
		'events': {
			'click': function (inEvent) {
				inEvent.preventDefault(); // prevent click bubbling up and interpretted as form submission
				this.removeGroup(inEvent);
			}.bind(this)
		}
	});
	// finally place this group
	this.placeGroup();
};	
GroupController.prototype = {
	
	/**
	 * Gets called by the owner to remove it
	 * If the group allows this it is removed and returns successfully
	 */
	dispose: function () {
		if (this.readyForDisposal) {
			// dispose elements
			this.groupWrapper.parentNode.removeChild(this.groupWrapper);
			// return succesful removal to caller => daddy
			return true;
		}
		return false; // else
	},
	
	/**
	 * Simply add the elements to the DOM of the page
	 */
	placeGroup: function () {
		document.getElementById('groups').insertBefore(this.groupWrapper, this.parentForm.groupAddButton);
		this.groupWrapper.appendChild(this.groupLabel);
		this.groupWrapper.appendChild(this.groupInput);
		this.groupWrapper.appendChild(this.groupDeleteButton);
	},
	
	/**
	 * Listener for remove button.
	 * Signals owner to remove this group from list.
	 * Because a single group cannot be deleted it has to
	 * be managed from where this single status is known.
	 * Hence, it sets itself up for disposal so when the owner calls dispose() it follows through.
	 */
	removeGroup: function () {
		this.readyForDisposal = true;
		this.parentForm.removeGroup(this.groupNumber);
	},
	
	/**
	 * The 'delete group' button can be disabled, for example when this group is the sole group present.
	 * 
	 * @param {Boolean} inState True if button should be enabled, false otherwise
	 */
	setDeleteButtonState: function (inState) {
		if (inState)
			this.groupDeleteButton.removeAttribute('disabled');
		else
			this.groupDeleteButton.setAttribute('disabled', true);
	},
	
	/**
	 * @returns {Array} with the within-group conditions
	 */
	getConditions: function () {
		var groupConditions = this.groupInput.value;
		groupConditions = groupConditions.replace(/\s/g,""); // remove white-space characters
		// convert to array by splitting after each , character
		return groupConditions.split(",");
	}	
};