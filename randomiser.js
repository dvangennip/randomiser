/* Global variables -------------------------------- */

var rf;

/* Helper functions -------------------------------- */

/**
 * Extends Element to simplify creating new elements
 *
 * Events can be added by including an 'events' object.
 *
 * Example:
 * var button = Element.create('button', {'id': 'fancy_button', 'class': 'fancy', 'events': {'click': handlerFn}}); 
 */
Element.create = function (_nodeType, _attributes) { // my own concoction
	var nodeType = (_nodeType !== undefined && typeof _nodeType === 'string') ? _nodeType : 'div',
		attr = (_attributes !== undefined && typeof _attributes === 'object') ? _attributes : {},
		el = document.createElement(nodeType),
		key, skey;
	for (key in attr) {
		if (key === 'innerHTML') el.innerHTML = attr[key];
		else if (key === 'events' && typeof attr[key] === 'object') {
			for (skey in attr[key]) {
				el.addEventListener(skey, attr[key][skey]);
			}
		} else el.setAttribute(key, attr[key]);
	}
	return el;
};

/**
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
	this.outputType = 0;
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
	},
	
	/**
	 * Gets called by a group itself with its number as argument
	 * Because this is the parent object which does the bookkeeping
	 * addition and deletion is initiated from here.
	 * Thus a group delete request takes a roundtrip from the group
	 * to here and then on to its dispose fn.
	 */
	removeGroup: function(inGroupToDelete) {
		// first check total number of groups -> 1 is the minimal amount
		if (this.groups.length > 1) {
			var groupToDelete = inGroupToDelete;
			// find the right group and remove
			this.groups.every(function(it, index) {
				// call dispose method - only returns true if it's ok to delete
				if (it.groupNumber === groupToDelete && it.dispose()) {
					// remove from list; set to NULL
					this.groups[index] = null;
				}
				return true; // always returns true, otherwise every fn might stop
			}, this);
			this.groups.clean(); // does away with null or undefined items
		}
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
		var formIsValid = this.form.checkValidity() || true; // fn is a recent HTML5 addition, not all browsers support it
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
			
			// add n * conditions per group in results
			for (g = 0; g < numberOfGroups; g++) for (j = 0; j < numberOfSessionsPerGroup; j++) {
				// add a group's conditions to output (uses a copy to avoid referencing the original array over and over)
				output.push(conditions[g].slice(0)); // slice returns a copy :)
				output[output.length-1].shuffle(); // randomise within group
				output[output.length-1].unshift(g+1); // add ID number of this condition group
			}
			// randomise the order between groups (which were added in series)
			output.shuffle();
			
			// add participant numbers to the front of each row (has to happen after randomisation procedure)
			for (i = 0; i < output.length; i++) {
				var participantNumbers;
				if (participantsTogether > 1)
					participantNumbers = (i*participantsTogether+1) + " - " + (i*participantsTogether+participantsTogether);
				else participantNumbers = (i+1);
				output[i].unshift(participantNumbers);
			}
						
			// add header at beginning
			var header = ["Participants","Group"];
	  		for (c = 0; c < longestConditionLength; c++) header[c+2] = "Condition " + (c+1);
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
		var htmlTable = Element.create('table', {
				'id': 'output-table',
				'style': 'text-align: center;'
			}),
			tableCode = '<caption>Random assignment of participants</caption>\n',
			htmlCode = [];
		
		// for each row write out the resulting table row
		for (r = 0; r < myOutput.length; r++) {
			tableCode = tableCode + '<tr>';
			// for each cell
			for (d = 0; d < myOutput[r].length; d++) {
				if (r===0) {
					tableCode = tableCode + '<th>'+myOutput[r][d]+'</th>';
				} else {
					tableCode = tableCode + '<td>'+myOutput[r][d]+'</td>';
				}
			}
			tableCode = tableCode + '</tr>\n';
		}
		htmlTable.innerHTML = tableCode;
		
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
	this.groupWrapper = Element.create('div', {
		'class': 'group-wrapper'
	});
	this.groupInput = Element.create('input', {
		'id': 'group-'+this.groupNumber,
		'name': 'group-'+this.groupNumber,
		'type': 'text',
		'value': 'lather, rinse, repeat',
		'class': 'conditionGroup inputSingle minLength:1'
	});
	this.groupLabel = Element.create('label', {
		'id': 'group-label-'+this.groupNumber,
		'class': 'cms-label',
		'for': this.groupInput.id,
		'innerHTML': 'Conditions within group '+this.groupNumber+' (separate with , comma)'
	});
	this.groupDeleteButton = Element.create('button', {
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
	 * @returns {Array} with the within group conditions
	 */
	getConditions: function () {
		var groupConditions = this.groupInput.value;
		groupConditions = groupConditions.replace(/\s/g,""); // remove white-space characters
		// convert to array by splitting after each , character
		return groupConditions.split(",");
	}	
};