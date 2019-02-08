<html>
  <head>
	<title>OAuth redirect</title>
	<!-- HTTP 1.1 -->
	<meta http-equiv="Cache-Control" content="no-store"/>
	<!-- HTTP 1.0 -->
	<meta http-equiv="Pragma" content="no-cache"/>
	<!-- Prevents caching at the Proxy Server -->
	<meta http-equiv="Expires" content="0"/>
	
	<script src="js/cookies.min.1.2.3.js"></script>
	<script type="text/javascript">		
		function getQueryStringValue(url, key) {
			return decodeURIComponent(url.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1")); 
		}
		
		var currentPageUrl=window.location.href;
		var isAuthCodeAvailable = (currentPageUrl.indexOf("code=") != -1);
		if(isAuthCodeAvailable){
			var authCode = getQueryStringValue(currentPageUrl, "code");
			if(Cookies.enabled){
				//expire cookie automatically in 1 minute
				Cookies.set('authCode', authCode, { expires: 60 });
				Cookies.set('authRedirectUri', currentPageUrl, { expires: 60 }); 
			}
		}
	</script>
  </head>
  <body>
     This is page will close automatically in 5 seconds.
  </body>
</html>