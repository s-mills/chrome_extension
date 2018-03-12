/* File: popup.js
 *
 * Handles building a query based on input from the user. Creates a query object, stores it in Chrome's 
 * storage, then creates a new tab that loads the ticketQuery.html page.
 *
 */

function loadOptions() {
	chrome.storage.sync.get({
		project: 'Sunshine',
		user: 'nyx.linden'
	}, function(items) {
		document.getElementById('project').value = items.project;
		document.getElementById('user').value = items.user;
	});
}

function make_request(url, responseType) {
	return new Promise(function(resolve, reject) {
		var req = new XMLHttpRequest();
		req.open('GET', url);
		req.responseType = responseType;

		req.onload = function() {
			var response = responseType ? req.response : req.responseXML;
			if(response && response.errorMessages && response.errorMessages.length > 0){
				reject(response.errorMessages[0]);
				return;
			}
			resolve(response);
		};

		// Handle network errors
		req.onerror = function() {
			reject(Error("Network Error"));
		}
		req.onreadystatechange = function() { 
			if(req.readyState == 4 && req.status == 401) { 
					reject("You must be logged in to JIRA to see this project.");
			}
		}

		// Make the request
		req.send();
	});
}

function checkProjectExists(){
		try {
			return make_request("https://jira.secondlife.com/rest/api/2/project/SUN", "json");
		} catch (errorMessage) {
			document.getElementById('status').innerHTML = 'ERROR. ' + errorMessage;
			document.getElementById('status').hidden = false;
		}
}

// Setup
document.addEventListener('DOMContentLoaded', function() {
	// if logged in, setup listeners
		checkProjectExists().then(function() {
			//load saved options
			loadOptions();

			// query click handler
			document.getElementById("query").onclick = function() {
				var query = { 
					type: 'ticketStatus', 
					project: document.getElementById("project").value,
					status: document.getElementById("statusSelect").value,
					inStatusFor: document.getElementById("daysPast").value
				};
				
				if (query.project === '') {
					document.getElementById('status').innerHTML = 'Please enter a project.';
					document.getElementById('status').hidden = false;
					return;
				}

				if (query.inStatusFor === '') {
					document.getElementById('status').innerHTML = 'Please enter a number of days.';
					document.getElementById('status').hidden = false;
					return;
				}
				
				chrome.storage.sync.set({ query: query }, function() {
					chrome.tabs.create({ url: 'ticketQuery.html' });						
				});
			};

			// activity feed click handler
			document.getElementById("feed").onclick = function(){   
				var query = { 
					type: 'activity',
					user: document.getElementById("user").value 
				};
				
				if (query.user === '') {
					document.getElementById('status').innerHTML = 'Please enter a user.';
					document.getElementById('status').hidden = false;
					return;
				}
					
				chrome.storage.sync.set({ query: query }, function() {
					chrome.tabs.create({ url: 'ticketQuery.html' });						
				});
			};        

		}).catch(function(errorMessage) {
				document.getElementById('status').innerHTML = 'ERROR. ' + errorMessage;
				document.getElementById('status').hidden = false;
		});   
});
