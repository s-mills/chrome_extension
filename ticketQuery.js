/* File: ticketQuery.js
 *
 * Handles executing a query and displaying the results. Gets a query object from chrome's storage
 * (set up in popup.js) and uses that to query the secondlife jira ticket repository. 
 * Query results are displayed in the ticketQuery.html page in a separate tab in the browser.
 *
 */

function getJIRAFeed(query, callback, errorCallback){
	if (query.user == undefined) {
		errorCallback('Unknown user');
		return;
  }		

	var url = "https://jira.secondlife.com/activity?maxResults=50&streams=user+IS+"+query.user+"&providers=issues";

	make_request(url, "").then(function(response) {
		// empty response type allows the request.responseXML property to be returned in the makeRequest call
		callback(response);
	}, errorCallback);
}

/**
 * @param {string} searchTerm - Search term for JIRA Query.
 * @param {function(string)} callback - Called when the query results have been  
 *   formatted for rendering.
 * @param {function(string)} errorCallback - Called when the query or call fails.
 */
async function getQueryResults(s, callback, errorCallback) {                                                 
	try {
		var response = await make_request(s, "json");
		callback(response);
	} catch (error) {
		errorCallback(error);
	}
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

function buildJQL(query) {
	var callbackBase = "https://jira.secondlife.com/rest/api/2/search?jql=";
	var fullCallbackUrl = callbackBase +`project=${query.project}+and+status=${query.status}+and+status+changed+to+${query.status}+before+-${query.inStatusFor}d&fields=id,status,key,assignee,summary&maxresults=100`;
	return fullCallbackUrl;
}

// utility 
function domify(str){
	var dom = (new DOMParser()).parseFromString('<!doctype html><body>' + str,'text/html');
	return dom.body.textContent;
}

// Load and display the results of the ticket status query
function loadTicketStatus(query) {

	var url = buildJQL(query);
	
	getQueryResults(url, function (results) {
		displayTicketStatus(query, results);
	}, function (errorMessage) {
		document.getElementById('status').innerHTML = 'ERROR. ' + errorMessage;
		document.getElementById('status').hidden = false;
	});
}	

// Display could definitely be improved, but this is a start
function displayTicketStatus(query, results) {
	var numResults = results.total;
	var displayResult = '';
	var ticketStatus = (query.status == 1) ? 'Open' : 'In Progress';

	document.getElementById('status').innerHTML = 'Displaying results for project ' + query.project + 
		' with ticket status of ' + ticketStatus;
	document.getElementById('status').hidden = false;
		
	if (numResults > 0) {
		var issues = results.issues;
		var list = document.createElement('ul');
		
		issues.forEach(function (issue) {
			var id = issue.id;
			var summary = issue.fields.summary;
			var assignee = issue.fields.assignee ? issue.fields.assignee.displayName : "Not assigned";
			
			var item = document.createElement('li');
			item.innerHTML = id + ' | ' + assignee + ' | ' + summary;
			
			list.appendChild(item);
		});
		
		displayResult = list.outerHTML;
	} else {		
		displayResult = '<p>There are no results for project: ' + query.project + '</p>';
	}
	
	document.getElementById('query-result').innerHTML = displayResult;
	document.getElementById('query-result').hidden = false;
}

// Load and display the results of an activity query for a user
function loadActivity(query) {
	getJIRAFeed(query, function(xmlDoc) {
		displayActivity(query, xmlDoc);
	}, function(errorMessage) {
		document.getElementById('status').innerHTML = 'ERROR. ' + errorMessage;
		document.getElementById('status').hidden = false;
	});

	document.getElementById('status').innerHTML = 'Displaying Jira activity for user ' + query.user;
	document.getElementById('status').hidden = false;
}

function displayActivity(query, xmlDoc) {
	// render result
	var feed = xmlDoc.getElementsByTagName('feed');
	var entries = feed[0].getElementsByTagName("entry");
	var list = document.createElement('ul');

	for (var index = 0; index < entries.length; index++) {
		var html = entries[index].getElementsByTagName("title")[0].innerHTML;
		var updated = entries[index].getElementsByTagName("updated")[0].innerHTML;
		var item = document.createElement('li');
		item.innerHTML = new Date(updated).toLocaleString() + " - " + domify(html);
		list.appendChild(item);
	}

	var feedResultDiv = document.getElementById('query-result');
	if(list.childNodes.length > 0){
		feedResultDiv.innerHTML = list.outerHTML;
	} else {
		document.getElementById('status').innerHTML = 'There are no activity results for user ' + query.user + '.';
		document.getElementById('status').hidden = false;
	}
	
	feedResultDiv.hidden = false;
}


document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.sync.get({ query: null }, function(items) {		
		var query = items.query;
		
		if (query && query.type === 'ticketStatus') {
			loadTicketStatus(query);
		} else if (query && query.type === 'activity') {
			loadActivity(query);
		} else {
			document.getElementById('status').innerHTML = 'Error - unable to process query.';
			document.getElementById('status').hidden = false;
		}
	});
});