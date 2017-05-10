var myDisplay = document.getElementById('display');
var video = document.createElement('video');
var audio = document.createElement('audio');
audio.autoplay = true;
var publishStream = document.getElementById('publishStream');
var subscribeStream = document.getElementById('subscribeStream');

var maxVideoChunkSize = 20000;
var frameSpaceMilliseconds = 350;
var audioChunks = [];
var base64String;
var mediaRecorder;
var iAmListener = false;

var pubnub = new PubNub({
  subscribeKey: "sub-c-7e03c2d6-35a3-11e7-a268-0619f8945a4f",
  publishKey: "pub-c-9e732b12-5563-4189-98e2-b6c7d27dba61",
  ssl: true
})

pubnub.addListener({
  message: function(message) {
    message = message.message;
    if (iAmListener) {
      show(message.video, message.resolution);
      play(message.audio);
    }
  }
});

function pnPublish(myChunk) {
  var publishConfig = {
    channel: "audience",
    message: myChunk
  }
  pubnub.publish(publishConfig, function(status, response) {
    // console.log(status, response);
  });
}

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;

function handleMedia(stream) {
  // To Record Video
  video.src = window.URL.createObjectURL(stream);

  // Create a second stream for Audio only
  var aud = new MediaStream(stream.getAudioTracks())
  var options = {
    audioBitsPerSecond: 32000,
    mimeType: 'audio/webm\;codecs=opus'
  };

  // To Record Audio
  mediaRecorder = new MediaRecorder(aud, options);
  mediaRecorder.ondataavailable = onData;
  mediaRecorder.onstop = onStop;

  publish();
}

function mediaError(e) {
  console.log("error", e);
}

var onData = function(e) {
  // push each chunk (blobs) in an array
  audioChunks.push(e.data);
};

var onStop = function(e) {
  var arrayBuffer;
  var fileReader = new FileReader();
  fileReader.onload = function() {
    arrayBuffer = this.result;
    base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));
    audioChunks = [];
  };
  fileReader.readAsArrayBuffer(audioChunks[0]);
};

function getScreenShot(resizeFactor) {
  var canvas = document.createElement("canvas");
  canvas.height = video.videoHeight / resizeFactor;
  canvas.width = video.videoWidth / resizeFactor;
  canvas.getContext("2d").drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, video.videoWidth / resizeFactor, video.videoHeight / resizeFactor);
  var img = canvas.toDataURL("image/jpeg");
  return img;
};

function getResizeFactor() {
  var size = Infinity;
  var resize = 0;
  do {
    resize++;
    var screenshot = getScreenShot(resize);
    size = screenshot.length;
  } while (size > maxVideoChunkSize)
  return resize;
}

function show(imageDataUri, resolution) {
  if (!myDisplay.height) myDisplay.style.height = resolution.height + 'px';
  if (!myDisplay.width) myDisplay.style.width = resolution.width + 'px';
  myDisplay.src = imageDataUri;
}

function play(audioDataUri) {
  if (audioDataUri) {
    audio.src = audioDataUri;
  }
}

function record() {
  if (mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    var uri = 'data:audio/ogg;base64,' + base64String;
    return uri;
  }
  mediaRecorder.start();
}

function chunk(image, sound) {
  return {
    "audio": sound,
    "video": image,
    "resolution": {
      "height": video.videoHeight,
      "width": video.videoWidth
    }
  };
}

function publish() {
  mediaRecorder.start();

  setInterval(function() {
    var resizeFactor = getResizeFactor();
    var image = getScreenShot(resizeFactor);
    show(image, {
      "height": video.videoHeight,
      "width": video.videoWidth
    });
    var myChunk = chunk(image, record());
    pnPublish(myChunk);
  }, frameSpaceMilliseconds)
}

function subscribe() {
  pubnub.subscribe({
    channels: ['audience']
  });
}

publishStream.onclick = function() {
  if (navigator.getUserMedia) {
    navigator.getUserMedia({ video: true, audio: true }, handleMedia, mediaError);
  }
};

subscribeStream.onclick = function() {
  iAmListener = true;
  subscribe();
};
