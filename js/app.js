var app = angular.module("app", ["ui.router"]);
var ipAddr_userAgent = "";
var pageUrl="";
var video_Formats;
var serverConsoleOutput="";
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
	var msg = message['msg'];
	var videoFileName = videoId + ".zip";
	//console.log("msg : \n"+msg);
	var consoleElement = document.querySelector('#responseText');
	//if (typeof consoleElement != "undefined" && consoleElement != null){
		//consoleElement.innerHTML += data+"<br/>";
		//consoleElement.scrollTop = consoleElement.scrollHeight;
		serverConsoleOutput += data+"<br/>";
		
		populateCompletionProgress(data);
		
		if(data.indexOf('Video generation complete') != -1){
			showSuccessDialog("Video generation complete");
			var generationElement = document.querySelector('#videoGeneration');
			if (typeof generationElement != undefined){
				generationElement.remove();
			}

			var videoUpload = document.getElementById("videoUpload");
			var dLinkElement = angular.element('<br/><label>Video Link has been generated below</label><br/>');
			angular.element(videoUpload).append(dLinkElement);
			
			//add click listener for videoUpload buttons
			document.getElementById("dLink").href="downloadVideo.php?videoId="+videoId;
			
			document.getElementById("dbLink").addEventListener("click", function(){
				// var msg = "Upload video to dropbox function invoked";
				// console.log(msg);
				// alert(msg);
				
				var isDropboxUploadDialogShown = false;
				var options = {
						files: [],

						// Success is called once all files have been successfully added to the user's
						// Dropbox, although they may not have synced to the user's devices yet.
						success: function () {
							// Indicate to the user that the files have been saved.
							//alert("Success! Files saved to your Dropbox.");
							console.debug("Success! Files saved to your Dropbox.");
							Swal.close();
							isDropboxUploadDialogShown = false;
							Swal.fire({
								  type: 'success',
								  title: "File "+videoFileName+" saved to Dropbox successfully",
								  allowOutsideClick: () => false,
								  showConfirmButton: false,
								  timer: 2000, //dismiss after 2 seconds
							 });
						},

						// Progress is called periodically to update the application on the progress
						// of the user's downloads. The value passed to this callback is a float
						// between 0 and 1. The progress callback is guaranteed to be called at least
						// once with the value 1.
						progress: function (progress) {
							console.debug("Dropbox file upload in progress....");
							if(!isDropboxUploadDialogShown) {
								isDropboxUploadDialogShown = true;
								Swal.fire({
									title: 'Uploading file '+videoFileName+' to Dropbox',
									allowOutsideClick: () => false,
									onOpen: () => {
										Swal.showLoading();
									}
								});
							}
						},

						// Cancel is called if the user presses the Cancel button or closes the Saver.
						cancel: function () {
							//alert("Save to Dropbox cancelled.");
							console.debug("Save to Dropbox cancelled.");
							Swal.fire({
								type: 'info',
								title: 'Save to dropbox cancelled',
								html: "<font size='3' color='black'>You have closed the save window without clicking save</font>",
								allowOutsideClick: () => true,
								showConfirmButton: false,
								timer: 2000, //dismiss after 2 seconds
							});
						},

						// Error is called in the event of an unexpected response from the server
						// hosting the files, such as not being able to find a file. This callback is
						// also called if there is an error on Dropbox or if the user is over quota.
						error: function (errorMessage) {
							//alert("Error! Files not saved to your Dropbox.");
							Swal.close();
							isDropboxUploadDialogShown = false;
							Swal.fire({
								type: 'error',
								allowOutsideClick: () => false,
								title: 'Error in uploading file '+videoFileName,
								text: errorMessage,
								footer: '',
							});
						}
					};
					
				var absoluteFilePath = (window.location.href.split('#')[0]).replace(/\/?$/, '/') + videoFileName;
				console.debug("absoluteFilePath : "+absoluteFilePath);
				Dropbox.save(absoluteFilePath, videoFileName, options);
			});
			
			document.getElementById("gdLink").addEventListener("click", function(){
				if(Cookies.enabled){
					//remove cookies if any from previous session
					Cookies.expire('authCode');
					Cookies.expire('authRedirectUri');
					var popup = window.open("/oauthFetch.php", "AuthFetchWindow", 'width=800, height=600');
					var pollTimer = window.setInterval(function() {
								var authorizationCode = Cookies.get('authCode');
								var authRedirectUri = Cookies.get('authRedirectUri');
								console.log("polling for auth code. authorizationCode : "+authorizationCode+" authRedirectUri : "+authRedirectUri);
								if(authorizationCode!==undefined && authRedirectUri!==undefined) {
									popup.close();
									clearInterval(pollTimer);
									Cookies.expire('authCode');
									Cookies.expire('authRedirectUri');
									Swal.fire({
										title: 'Uploading file '+videoFileName+' to Google Drive',
										allowOutsideClick: () => false,
										onOpen: () => {
											Swal.showLoading();
										}
									});
									$.ajax({
										url: "UploadToGoogleDrive.php",
										type: "POST",
										data: {
											authCode: authorizationCode,
											fileName: videoFileName,
										},
									}).done(function(data) {
										Swal.close();
										console.log("\nsuccess data : ");
										console.log(data);
										Swal({
											  type: 'success',
											  title: "File "+videoFileName+" saved to Google Drive successfully",
											  allowOutsideClick: () => false,
											  showConfirmButton: false,
											  timer: 2000, //dismiss after 2 seconds
										 });
									}).fail(function(data) {
										Swal.close();
										console.log("\error data : ");
										console.log(data);
										Swal.fire({
											type: 'error',
											allowOutsideClick: () => false,
											title: 'Error in uploading file '+videoFileName,
											text: errorMessage,
											footer: '',
										});
									});
								}
					}, 10);	
				}else{
					Swal.fire({
						type: 'error',
						allowOutsideClick: () => false,
						title: 'Upload error',
						text: 'Functionality disabled due to inavailability of cookies',
						footer: 'Enable cookies and try again',
					});
				}
				
			});
			
			document.getElementById("odLink").addEventListener("click", function(){
				Swal.fire({
					type: 'info',
					title: 'Onedrive upload',
					html: "<font size='3' color='black'>Functionality to be added soon</font>",
					allowOutsideClick: () => true,
					showConfirmButton: false,
					timer: 1500, //dismiss after 1.5 seconds
				});
			});
			
			document.getElementById("videoUploadContainer").style.display="block";
			
			
			/* var dbContainer = document.getElementById("dbContainer");
			
			var dLinkElement = angular.element('<br/><label>Video Link has been generated below</label><br/><br/><label><a href="downloadVideo.php?videoId='+videoId+'">Click Here</a> to download</label>');
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
			dbContainer.appendChild(dbSaveBtn); */
		}
	//}			
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
	
	$scope.isEnter = function (event) {
		var keyPressed = event.which || event.keyCode || event.key;
		if(keyPressed == 13 || keyPressed == "Enter") {
			$scope.fetchFormats();
			event.preventDefault();
		}
	}

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
	video_Formats = $stateParams.videoFormats;
	//console.log("stateParams_videoFormats="+video_Formats);
	
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
		//console.log("selected format : "+$scope.selectedFormat);
		//console.log("stream url : "+$stateParams.videoFormats[$scope.selectedFormat]["STREAM-URL"]);
	};
	
	$scope.generateVideo = function(){
				
		var encodedStreamUrl = encodeURIComponent($stateParams.videoFormats[$scope.selectedFormat]["STREAM-URL"]);
		//console.log("encodedStreamUrl : "+encodedStreamUrl);
		
		 $http({
			url: 'generateVideo.php',
			method: "POST",
			data: 'videoUrl=' + $stateParams.url +
			'&streamUrl=' + encodedStreamUrl +
			'&videoMetadata=' + JSON.stringify($stateParams.videoFormats["metadata"]) +
			'&videoId=' + $stateParams.videoId +
			'&videoFormat=' + $scope.selectedFormat +
			'&uniqueId=' + ipAddr_userAgent,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		})
		.then(function(response) {
			console.log("generateVideo request completed successfully "+response.data);
			
			$state.go("route3", {
				videoId: $stateParams.videoId
			}, { location: false });
			
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
		//$scope.consoleVisibility = !$scope.consoleVisibility;
		//$scope.showHideText = $scope.consoleVisibility ? "Hide Console" : "Show Console";
		Swal.fire({
			title: "<i>Console output</i>",
			html: "<div style='width: 465px; height: 800px; background-color: black; color: white; overflow-x: auto; overflow-y: auto; max-width: 640px; max-height: 320px; font-size: 15px;'>"+serverConsoleOutput+"</div>", 
			showConfirmButton: true,
			showCancelButton: true,
			confirmButtonText: "Download log",
			cancelButtonText: "Dismiss",
		}).then((result)=> {
			if(result.value != undefined && result.value==true){
				
				var fileName = "ServerLog_"+$stateParams.videoId+".txt";

				var downloadLogElement = document.createElement('a');
				downloadLogElement.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(serverConsoleOutput.replace(/<br\s?\/>/gi, '')));
				downloadLogElement.setAttribute('download', fileName);
				downloadLogElement.click();
			} 
		});
	};
	
});


function showSuccessDialog(successMessage){
	 Swal.fire({
		  type: 'success',
		  title: successMessage,
		  allowOutsideClick: () => false,
		  showConfirmButton: false,
		  timer: 2000, //dismiss after 2 seconds
	 });
}

function showErrorDialog(errorMessage){
	Swal.fire({
		type: 'error',
		allowOutsideClick: () => false,
		title: 'Error in fetching the video format',
		text: errorMessage,
		footer: 'Try again with valid video URL',
	});
}

function showLoading(){
	Swal.fire({
		title: 'Fetching available video formats',
		allowOutsideClick: () => false,
		onOpen: () => {
			   Swal.showLoading();
		}
	});
}

function stopLoading(){
	Swal.close();
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