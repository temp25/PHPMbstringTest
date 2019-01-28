var app = angular.module("app", ["ui.router"]);
var ipAddr_userAgent = "";
var pageUrl="";
var cProgressOptions = {
	line_width: 6,
	color: "#e08833",
	starting_position: 0, // 12.00 o' clock position, 25 stands for 3.00 o'clock (clock-wise)
	percent: 0, // percent starts from
	percentage: true,
	text: "Size : N/A"
};
var totalDurationInMilliSec = 0;
var durationRegex = /Duration: (\d{2}:\d{2}:\d{2}.\d{2})/g;
var timeRegex = /time=(\d{2}:\d{2}:\d{2}\.\d{2})/g;
var sizeRegex = /size=\s*(\d+)kB/g;

// Enable pusher logging - don't include this in production 
Pusher.logToConsole = true; 
var pusher = new Pusher('a44d3a9ebac525080cf1', {
  cluster: 'ap2',
  forceTLS: true
});

function populateCompletionProgress(data){
	var timeMatches = getMatches(data, timeRegex, 1);
	var sizeMatches = getMatches(data, sizeRegex, 1);
	if(data.indexOf("Duration") > -1 ){
		var durationMatches = getMatches(data, durationRegex, 1);
		var totalDuration = durationMatches[0];
		totalDurationInMilliSec = getMilliseconds(totalDuration);
	 }else{
		var matchSize = Math.max(timeMatches.length, sizeMatches.length);
		for(var i=0; i< matchSize; i++){
			cProgressOptions.percent = Math.round(((getMilliseconds(timeMatches[i])/totalDurationInMilliSec).toFixed(2) * 100 ));
			cProgressOptions.text = "Size : "+formatBytes((sizeMatches[i] || 0)*1000);
			jQuery(".my-progress-bar").circularProgress(cProgressOptions);
		}
	 }
}

var pusherEventCallback = function(event){
	var message = event.message;
	var data = message['data'];
	var videoId = message['videoId'];
	var consoleElement = document.querySelector('#responseText');
	if (typeof consoleElement != "undefined" && consoleElement != null){
		consoleElement.innerHTML += data+"<br/>";
		consoleElement.scrollTop = consoleElement.scrollHeight;
		
		populateCompletionProgress(data);
		
		if(data.indexOf('Video generation complete') > -1){
			showSuccessDialog("Video generation complete");
			var generationElement = document.querySelector('#videoGeneration');
			var dbContainer = document.getElementById("dbContainer");
			var dLinkElement = angular.element('<br/><label>Video Link has been generated below</label><br/><br/><label><a href="downloadVideo.php?videoId='+videoId+'">Click Here</a> to download</label>');
			if (typeof generationElement != "undefined" && generationElement != null){
				generationElement.remove();
			}
			angular.element(dbContainer).append(dLinkElement);
			var videoFileName = videoId + ".zip";
			var options = {
				files: [],
				success: function () {
					alert("File saved to your Dropbox successfully");
				},
				progress: function (progress) {
					//console.log("Dropbox file upload progress : "+progress);
				},
				cancel: function () {
					alert("Save to Dropbox cancelled.");
				},
				error: function (errorMessage) {
					alert("Error occurred in saving your file to Dropbox.");
				}
			};
			var dbSaveBtn = Dropbox.createSaveButton(pageUrl+videoFileName, videoFileName, options);
			dbContainer.appendChild(dbSaveBtn);
		}
	}			
};

var request = new XMLHttpRequest();
request.open('GET', 'https://api.ipify.org/?format=json', true);
request.onload = function() {
  if (request.status >= 200 && request.status < 400) {
    var data = JSON.parse(request.responseText);
	var channel = pusher.subscribe('hotstar-video-download-v2'); 
	ipAddr_userAgent = data.ip+"_"+navigator.userAgent;
	channel.bind(ipAddr_userAgent, pusherEventCallback);
  } else {
    console.error("Error occurred in getting response from ipify.org");
  }
};
request.onerror = function() {
  console.log("Error occurred in connecting to ipify.org");
};
request.send();


app.config(function($stateProvider, $urlRouterProvider) {
	
  // For any unmatched url, send to /route1
	$urlRouterProvider.otherwise(function($injector){
		$injector.invoke(['$state', function($state) {
			$state.go('route1', {}, { location: false } );
		}]);
	});
  //$urlRouterProvider.otherwise("/route1", {}, { location: false });
  
  $stateProvider
    .state('route1', {
        url: "/route1",
        templateUrl: "container1.html",
        controller: "Controller1"
    })
    .state('route2', {
        url: "/route2",
        templateUrl: "container2.html",
        controller: "Controller2",
		params: {
			'url': '',
			'videoFormats': {},
			'videoId': ''
		}
    })
	.state('route3', {
        url: "/route3",
        templateUrl: "container3.html",
        controller: "Controller3",
		params: {
			'videoId': ''
		}
    });
});

app.controller("Controller1", function($scope, $state, $http, $timeout) {
	
	pageUrl = window.location.href.replace("index.html", "");
	if(pageUrl[pageUrl.length-1] != "/"){
		pageUrl += "/";
	}
	
	jQuery.getJSON(pageUrl+"getConfigVars.php", function(e) {
		var dbKey = e.dbKey;
		jQuery('head').append('<script type="text/javascript" src="https://www.dropbox.com/static/api/2/dropins.js" id="dropboxjs" data-app-key="'+dbKey+'"></script>');
	});

  $scope.fetchFormats = function() {
	
	var videoUrl = $scope.urlTextBox;
	//console.log("videoUrl : "+videoUrl);
	showLoading();
			
	$http({
		url: 'getAvailableVideoFormats.php',
		method: "POST",
		data: 'url='+videoUrl,
		headers: {'Content-Type': 'application/x-www-form-urlencoded'}
	})
	.then(function(response) {
		//success
		stopLoading();
		//console.log("Success : \n");
		//console.log(response.data);
		if(response.data.isError === false){
			showSuccessDialog("Located video in the playlist for the given url"); 
			$state.go("route2", {
				url: videoUrl,
				videoFormats: response.data,
				videoId: response.data.videoId
			}, { location: false });			
		}else{
			showErrorDialog(response.data.errorMessage);
		}
		
	},
	function(response) { // optional
		//console.log("Error : \n");
		//console.log(response.data);
		showErrorDialog(response.data);
    });
    
    
  };
});


app.controller("Controller2", function($scope, $state, $stateParams, $http, $timeout) {
	$scope.videoFormats = $stateParams.videoFormats;
	//console.log("$stateParams.videoFormats : ");
	//console.log($stateParams.videoFormats);
	
	$scope.filterVideoFormats = function(items) {
    var filteredVideoFormats = {};
	//console.log("items : ");
	//console.log(items);
    angular.forEach(items, function(value, key) {
        if (key.startsWith('hls-')) {
            filteredVideoFormats[key] = value;
        }
    });
    
    return filteredVideoFormats;
}
	
	$scope.onFormatChange = function() {
		var element = document.getElementById("defFormat");
		if (typeof element != "undefined" && element != null)
			element.remove();
		//alert("Format selected : "+$scope.selectedFormat);
	};
	
	$scope.generateVideo = function(){
		
		/*
		console.log("$stateParams.url : ");
		console.log($stateParams.url);
		console.log("$stateParams.videoFormats : ");
		console.log($stateParams.videoFormats);
		console.log("$stateParams.videoId : ");
		console.log($stateParams.videoId);
		console.log("$scope.selectedFormat : ");
		console.log($scope.selectedFormat);
		console.log("ipAddr_userAgent : ");
		console.log(ipAddr_userAgent);
		*/
		
		//alert("before request \n");
		//alert("\nstateParams.url : " + $stateParams.url );
		//alert("\nstateParams.videoFormats : " + $stateParams.videoFormats );
		//alert("\nstateParams.videoId : " + $stateParams.videoId );
		//alert("\nscope.selectedFormat : " + $scope.selectedFormat );
		//alert("\nipAddr_userAgent : " + ipAddr_userAgent );
		
		
		$http({
			url: 'generateVideo.php',
			method: "POST",
			data: 'videoUrl=' + $stateParams.url +
			'&availableFormats=' + $stateParams.videoFormats +
			'&videoId=' + $stateParams.videoId +
			'&videoFormat=' + $scope.selectedFormat +
			'&uniqueId=' + ipAddr_userAgent,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		})
		.then(function(response) {
			console.log("generateVideo request completed successfully "+response.data);
			
			alert(response.data);
			
			//$state.go("route3", {
			//	videoId: $stateParams.videoId
			//}, { location: false });
			
		},
		function(response) { // optional
			console.error("Error occured in generateVideo request completion");
		});
		
		
		//alert("Generate video request invoked");
		
	};
	
	
});


app.controller("Controller3", function($scope, $stateParams, $http, $timeout) {
	
	jQuery(".my-progress-bar").circularProgress(cProgressOptions);
	
	$scope.consoleVisibility = false;
	$scope.showHideText = "Show Console";
	
	$scope.showHideConsole = function(){
		$scope.consoleVisibility = !$scope.consoleVisibility;
		$scope.showHideText = $scope.consoleVisibility ? "Hide Console" : "Show Console";
	};
	
});


function showSuccessDialog(successMessage){
	 swal({
		  type: 'success',
		  title: successMessage,
		  allowOutsideClick: () => false,
		  showConfirmButton: false,
		  timer: 2000, //dismiss after 2 seconds
	 });
}

function showErrorDialog(errorMessage){
	swal({
		type: 'error',
		allowOutsideClick: () => false,
		title: 'Error in fetching the video format',
		text: errorMessage,
		footer: 'Try again with valid video URL',
	});
}

function showLoading(){
	swal({
		title: 'Fetching available video formats',
		allowOutsideClick: () => false,
		onOpen: () => {
			   swal.showLoading();
		}
	});
}

function stopLoading(){
	swal.close();
}


function getMatches(string, regex, index) {
  index || (index = 1); // default to the first capturing group
  var matches = [];
  var match;
  while (match = regex.exec(string)) {
	matches.push(match[index]);
  }
  return matches;
}

function getMilliseconds(timeStr){
	var time = timeStr.split(/\.|:/);
	var hh = time[0];
	var mm = time[1];
	var ss = time[2];
	var milliSec = time[3];
	var total = (hh * 60 * 60 * 1000) + (mm * 60 * 1000) + (ss * 1000) + milliSec;
	return total;
}

function formatBytes(a,b){
	if(0 == a)
		return"0 Bytes";
	var c=1000/*Since base 10 values*/, d=b||2, e=["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"], f= Math.floor(Math.log(a)/Math.log(c)); 
	return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]
}