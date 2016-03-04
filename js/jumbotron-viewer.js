var MAX_CAMERAS = 256;

// PeerJS object
var peer = new Peer(
    VIEWER_ID, {
    key: LICENSE_KEY,
    debug: 3
});
var existingCalls = {};

peer.on('open', function(){
    console.log('jumbotron-viewer.js: my ID is ' + peer.id);
});

// Receiving a call
peer.on('call', function(call){
    // Wait for stream on the call, then set peer video display
    call.answer();
    call.on('stream', function(stream){
        var id = call.peer
        $('<video muted="muted" autoplay="autoplay"></video>')
            .attr({
                id: id,
                src: URL.createObjectURL(stream)
            })
            .appendTo('#videos');

        var video = document.getElementById(id);
	var canvas_id = "canvas-" + id
	$('<canvas hidden></canvas>').attr({ id: canvas_id }).appendTo("#canvases");
	var canvas = document.getElementById(canvas_id);
	var context = canvas.getContext("2d");
	var sending = false;
	var faceData = { "face" : [] };

	var render = function() {
	  requestAnimationFrame(render);
	  var w = video.offsetWidth;
	  var h = video.offsetHeight;
	  canvas.setAttribute("width", w);
	  canvas.setAttribute("height", h);
	  context.drawImage(video, 0, 0, w, h);
	  canvas.lineWidth = 3;
	  canvas.strokStyle = "#f00";
	  
/*
	  // 赤枠表示
	  var i;
	  for (i = 0; i < faceData['face'].length; i++) {
	    var facePos = faceData['face'][i]['position'];
	    var posX = w * 0.01 * facePos['center']['x'];
	    var posY = h * 0.01 * facePos['center']['y'];
	    var width = w * 0.01 * facePos['width'];
	    var height = h * 0.01 * facePos['height'];
	    context.strokeStyle = "rgb(200, 0, 0)";
	    context.lineWidth = 20;
	    context.strokeRect(posX - (width / 2), posY - (height / 2), width, height);
	  }
*/
	  // 人数表示
	  var ninzu = faceData['face'].length;
	  var ninzu_id = "ninzu-" + id
          $('<div></div>').attr({ id: ninzu_id }).appendTo("#ninzu");
	  document.getElementById(ninzu_id).innerHTML = ninzu + "人";

          if (!sending) {
	    sending = true;
	    var can = canvas.toDataURL();
	    var base64Data = can.split(',')[1];
	    var data = window.atob(base64Data);
	    var buff = new ArrayBuffer(data.length);
	    var arr = new Uint8Array(buff);
	    for(var i = 0, dataLen = data.length; i < dataLen; i++){
	      arr[i] = data.charCodeAt(i);
	    }
	    var blob = new Blob([arr], {type: 'image/png'});
	    var url = 'https://apius.faceplusplus.com/detection/detect' + '?api_key=' + API_KEY + '&api_secret=' + API_SECRET;
	    var formData = new FormData();
	    formData.append('img', blob);

	    // 非同期通信
	    $.ajax({
	      url: url, type: 'POST', data: formData, contentType: false, processData: false,
	      success: function(data, dataType) {
	        console.log(data);
		faceData = data;
	        sending = false;
	      },
	      error: function(XMLHttpRequest, textStatus, errorThrown) {
	        console.log('Error : ' + errorThrown);
	        sending = false;
	      }
	    });
          }
	}
        render();
    });


    window.existingCalls[call.peer] = call;
    call.on('close', function() {
        window.existingCalls[call.peer].close();
        delete window.existingCalls[call.peer];
        streamCount();
        $('#' + call.peer).remove();
    });
    streamCount();
});

peer.on('error', function(err){
    alert(err.message);
});

// Click handlers setup
$(document).on('ready', function(){
    var $monitorVideo = $('#monitorVideo');
    $(document).on('click', 'video', function(event) {
        if (event.target.id === 'monitorVideo') {
            $('html').removeClass('monitored');
            $monitorVideo.removeAttr('src');

            $monitorVideo.get(0).muted = true;
            $monitorVideo.get(0).volume = 0.0;

            console.log("Video is now muted: " + $monitorVideo.get(0).muted);
            console.log("Video volume is now: " + $monitorVideo.get(0).volume);

            setTimeout(function() {
                $('#monitorContainer').hide();
            }, 210);
            return;
        }
        $('#monitorContainer').show();
        setTimeout(function() {
            $('html').addClass('monitored');
            $monitorVideo.get(0).muted = false;
            $monitorVideo.get(0).volume = 1.0;

            console.log("Video is now muted: " + $monitorVideo.get(0).muted);
            console.log("Video volume is now: " + $monitorVideo.get(0).volume);
        }, 0);

        var remoteId = $(this).attr('id');
        console.log('jumbotron-viewer.js: remote ID is ' + remoteId);
        var remoteStream = existingCalls[remoteId].remoteStream;
        $monitorVideo.attr('src', URL.createObjectURL(remoteStream));
    });
    var resizeMonitor = function() {
        if ($monitorVideo.get(0).readyState === 0) {
            return;
        }
        var $monitorWrapper = $('#monitorWrapper');
        var wrapperWidth = $monitorWrapper.width();
        var srcWidth = $monitorVideo.get(0).videoWidth;
        var wrapperHeight = $monitorWrapper.height();
        var srcHeight = $monitorVideo.get(0).videoHeight;
        if (srcWidth / srcHeight > wrapperWidth / wrapperHeight) {
            var videoHeight = wrapperWidth * srcHeight / srcWidth;
            $monitorVideo.css({
                width: '100%',
                height: videoHeight + 'px',
                top: (wrapperHeight - videoHeight) / 2 + 'px'
            });

        } else {
            var videoWidth = wrapperHeight * srcWidth / srcHeight;
            $monitorVideo.css({
                width: videoWidth + 'px',
                height: '100%',
                left: (wrapperWidth - videoWidth) / 2 + 'px'
            });
        }
    };
    $monitorVideo.on('loadedmetadata' /* timeupdate はちょっと重い */ , resizeMonitor);
    $(window).on('resize', resizeMonitor);
});

$(window).on('beforeunload', function(){
    if (!peer.destroyed) {
        peer.destroy();
    }
});

function streamCount () {
    var count = Object.keys(existingCalls).length;
    var $html = $('html');
    var classList = $html[0].classList;
    if (classList !== -1) {
        for (var i = 0; i < classList.length; i++) {
            if (classList.item(i).match(/^stream/)) {
                $html.removeClass(classList.item(i));
            }
        }
    }
    $html.addClass('stream-' + (count > MAX_CAMERAS ? 'many' : count));
    $('#count').text((count > MAX_CAMERAS ? 'many' : count));
}

var currentUrl = location.href;
var part = currentUrl.split('#');
var urlText = URL_HOST + URL_PATH + '#' + part[1];
$('#url').text(urlText);
