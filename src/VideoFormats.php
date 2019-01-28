<?php
	
	class VideoFormats
	{
		private $videoUrl;
		private $playbackUri;
		private $appState;
		private $appStateJson;
		private $headers;
		
		public function __construct($videoUrl) {
			//include all files under helper package
			foreach (glob("src/helper/*.php") as $helperFile) {
				include_once $helperFile;
			}

			$this->videoUrl = $videoUrl;
			$this->playbackUri = null;
			$this->appState = null;
			$this->appStateJson = null;
			$this->headers   = array();
			$this->headers[] = 'Hotstarauth: ' . generateHotstarAuth();
			$this->headers[] = 'X-Country-Code: IN';
			$this->headers[] = 'X-Platform-Code: JIO'; 
		}

		private function isValidHotstarUrl() {
			
			if(preg_match('/(http|https)?:\/\/(www\.)?hotstar.com\/(?:.+?[\/-])+(?P<videoId>\d{10})/', $this->videoUrl, $match)){
				return $match["videoId"];
			}

			return "";
		}

		private function getVideoId() {
			$videoUrlParts = explode("/", $this->videoUrl);
			$videoId = $videoUrlParts[count($videoUrlParts)-1];
			if (is_numeric($videoId)) {
				return $videoId;
			}
			throw new Exception("Invalid video id present in URL");
		}

		private function getKForm($num) {
		    if($num < 1000){
		        return $num;
		    }

		    return intval($num/1000);
		}
		
		private function getVideoMetadata($content) {
		   $metaData = array();
		   foreach ($content as $contentName => $contentValue) {
		      //$contentName = "".$contentName;
		      //echo PHP_EOL."Key : _".$contentName."_";
		      
		      //if($contentName == "playbackUri"){
		      //   echo "inside if";
		      //  $metaData[$contentName]=$contentValue;
		      //}
		      
		      switch($contentName) {
		         case "title":
		                  $metaData[$contentName]=$contentValue;
		                  //$metaData[""]=;
		                  break;
		         case "genre": 
		                  $metaData[$contentName]=$contentValue;
		                  break;
		         case "channelName": 
		                  $metaData["copyright"]=$contentValue;
		                  break;
		         case "description": 
		                  $metaData[$contentName]=$contentValue;
		                  $metaData["synopsis"]=$contentValue;
		                  $metaData["comment"]=$contentValue;
		                  break;
		         case "broadcastDate": 
		                  date_default_timezone_set("Asia/Calcutta");
		                  $metaData["creation_time"]="".date("Y-m-d H:i:s", $contentValue);
		                  $metaData["year"]="".date("d", $contentValue);
		                  break;
		         case "episodeNo": 
		                  $metaData["episode_id"]=$contentValue;
		                  $metaData["track"]=$contentValue;
		                  break;
		         case "drmProtected": 
		                  $metaData[$contentName]=$contentValue;
		                  break;
		         case "showName": 
		                  $metaData["show"]="©copyright ".$contentValue;
		                  break;
		         case "seasonNo": 
		                  $metaData["season_number"]=$contentValue;
		                  break;
		         case "actors": 
		                  $actors = "";
		                  foreach($contentValue as $i => $actor) {
		                     if(strlen($actors) !=0 ) {
		                        $actors .= "; ";
		                     }
		                     $actors .= $actor;
		                  }
		                  $metaData["artist"]=$actors;
		                  $metaData["album_artist"]=$actors;
		                  break;
		         case "playbackUri": 
		                  $metaData[$contentName]=$contentValue;
		                  break;
		         default: 
		                  //do nothing
		                  break;
		         }
		   }
		   
		   //print_r($metaData);
		   return $metaData;
		}

		private function getUrlFormats($playbackUrlresponse) {
			$url_formats = array();
			$infoArray = null;
			foreach ( preg_split("/((\r?\n)|(\r\n?))/", $playbackUrlresponse) as $line ) {
			    if (substr($line, 0, 18) === "#EXT-X-STREAM-INF:") {
			        $m3u8InfoCsv = str_replace("#EXT-X-STREAM-INF:", "", $line);
			        $m3u8InfoArray = preg_split('/,(?=(?:[^"]*"[^"]*")*[^"]*$)/', $m3u8InfoCsv);
			        foreach ($m3u8InfoArray as $m3u8Info) {
			            if($infoArray === null){
			                $infoArray = array();
			            }
			            $info = explode("=", $m3u8Info);
			            $infoArray[ $info[0] ] = $info[1];
			        }
			    }elseif (substr($line, 0, 6) === "master" || substr($line, 0, 4) === "http") {
			        
			        $kFormAverageBandwidthOrBandwidth = $this->getKForm(isset($infoArray["AVERAGE-BANDWIDTH"]) ? $infoArray["AVERAGE-BANDWIDTH"] : $infoArray["BANDWIDTH"]);
			        $formatCode = "hls-".$kFormAverageBandwidthOrBandwidth; //eg hls-281 for 281469
			        $infoArray["STREAM-URL"] = (substr($line, 0, 4) === "http") ? $line : str_replace("master.m3u8", $line, $playbackUrl); //if starts with http then it's direct url

			        $url_formats[$formatCode] = $infoArray;

			        //Reset m3u8InfoArray for next layer
			        $infoArray = null;
			    }else {
			        //do nothing
			    }
			}

			return $url_formats;
		}

		public function getAvailableFormats() {
			
			$url_formats = array();
			$videoMetadata = array();

			try {
				
				//remove extra / at last if present
				if( strrpos($this->videoUrl, "/") == strlen($this->videoUrl)-1 ) {
				    $this->videoUrl = substr($this->videoUrl, 0, strlen($this->videoUrl)-1);
				}
					
				if(!$this->isValidHotstarUrl()) {
					throw new Exception("Invalid Hotstar video URL");
				}
				$videoId = $this->getVideoId();


				$fileContents = file_get_contents($this->videoUrl);

				if (preg_match('%<script>window.APP_STATE=(.*?)</script>%', $fileContents, $match)) {
				    $this->appState = $match[1];
				} else {
					throw new Exception("APP_STATE JSON metadata not present in site");
				}

				if ($this->appState != null) {
				    $this->appStateJson = json_decode($this->appState, true);
				}
				
				foreach ($this->appStateJson as $key => $value) {

				    $keyParts = explode("/", $key);
					
				    if ($keyParts[count($keyParts)-1] == $videoId) {
				    
						$videoMetadata = $this->getVideoMetadata($value["initialState"]["contentData"]["content"]);
				    
						if ($videoMetadata["drmProtected"]) {
							$url_formats["isError"] = true;
							$url_formats["errorMessage"] = "The video is DRM Protected";
							return json_encode($url_formats, true);
						}
						
						
				        $this->playbackUri = $videoMetadata["playbackUri"];
				        break;
				    }

				}
				$url = $this->playbackUri."&tas=10000";
				$playbackUriResponse = request($url, $this->headers);
				$playbackUriResponseJson = json_decode($playbackUriResponse, true);
				if ($playbackUriResponseJson["statusCodeValue"] != 200) {
					throw new Exception("Error processing request for playbackUri");
				}
				$playbackUrl = $playbackUriResponseJson["body"]["results"]["item"]["playbackUrl"];
				$playbackUrlresponse = request($playbackUrl, $this->headers);
				$url_formats = $this->getUrlFormats($playbackUrlresponse);
				$url_formats["metadata"]=$videoMetadata;
				$url_formats["videoId"] = $videoId;
				$url_formats["isError"] = false;

			} catch (Exception $e) {
				$url_formats["isError"] = true;
				$url_formats["errorMessage"] = $e->getMessage();
			}

			return json_encode($url_formats, true);
		}


	}

?>