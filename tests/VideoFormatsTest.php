<?php
use PHPUnit\Framework\TestCase;
include "src/VideoFormats.php";

class VideoFormatsTest extends TestCase
{
	private $videoFormats;
	
	protected function setUp() { 
	   $this->initVideoFormats("http://www.hotstar.com/tv/chinnathambi/15301/chinnathambi-yearns-for-nandini/1100003795"); 
 }
	
	private function initVideoFormats($videoUrl) {
		$this->videoFormats = new VideoFormats($videoUrl);
	}
	
    function testGetAvailableFormats_VideoFormats_ProducesCorrectVideoFormats()
    {
        $expectedFormats = array(
			"hls-121" => "320x180",
			"hls-241" => "320x180",
			"hls-461" => "416x234",
			"hls-861" => "640x360",
			"hls-1362" => "720x404",
			"hls-2063" => "1280x720",
			"hls-3192" => "1600x900",
			"hls-4694" => "1920x1080",
		);
		
		$actualFormats = json_decode($this->videoFormats->getAvailableFormats(), true);
		
		$this->assertFalse($actualFormats["isError"]);
		$this->assertEquals($expectedFormats["hls-121"], $actualFormats["hls-121"]["RESOLUTION"]);
		$this->assertEquals($expectedFormats["hls-241"], $actualFormats["hls-241"]["RESOLUTION"]);
		$this->assertEquals($expectedFormats["hls-461"], $actualFormats["hls-461"]["RESOLUTION"]);
		$this->assertEquals($expectedFormats["hls-861"], $actualFormats["hls-861"]["RESOLUTION"]);
		$this->assertEquals($expectedFormats["hls-1362"], $actualFormats["hls-1362"]["RESOLUTION"]);
		$this->assertEquals($expectedFormats["hls-2063"], $actualFormats["hls-2063"]["RESOLUTION"]);
		$this->assertEquals($expectedFormats["hls-3192"], $actualFormats["hls-3192"]["RESOLUTION"]);
		$this->assertEquals($expectedFormats["hls-4694"], $actualFormats["hls-4694"]["RESOLUTION"]);
    }
	
	function testGetAvailableFormats_VideoFormats_Produces404Error()
    {
		$this->initVideoFormats("https://www.hotstar.com/sports/football/arsenal-vs-liverpool/2001707928");
		
		$actualFormats = json_decode($this->videoFormats->getAvailableFormats(), true);
		
		$this->assertTrue($actualFormats["isError"]);
		$this->assertEquals("file_get_contents(https://www.hotstar.com/sports/football/arsenal-vs-liverpool/2001707928): failed to open stream: HTTP request failed! HTTP/1.0 404 Not Found", str_replace(array("\n", "\r"), '', $actualFormats["errorMessage"]));
    }
	
	function testGetAvailableFormats_VideoFormats_ProducesDRMProtectedError()
    {
		$this->initVideoFormats("https://www.hotstar.com/sports/cricket/vivo-ipl-2018/mumbai-indians-vs-chennai-super-kings-m186490/match-clips/2018-match-1-mi-vs-csk/2001705598");
		
		$actualFormats = json_decode($this->videoFormats->getAvailableFormats(), true);
		
		$this->assertTrue($actualFormats["isError"]);
		$this->assertEquals("The video is DRM Protected", str_replace(array("\n", "\r"), '', $actualFormats["errorMessage"]));
    }
	
	function testGetAvailableFormats_VideoFormats_ProducesInvalidUrlError()
    {
		$this->initVideoFormats("https://www.blah.com");
		
		$actualFormats = json_decode($this->videoFormats->getAvailableFormats(), true);
		
		$this->assertTrue($actualFormats["isError"]);
		$this->assertEquals("Invalid Hotstar video URL", str_replace(array("\n", "\r"), '', $actualFormats["errorMessage"]));
    }
	
}