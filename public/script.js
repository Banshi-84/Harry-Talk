const socket = io(); // Connect to the signaling server
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallButton = document.getElementById('startCall');
const toggleCameraButton = document.getElementById('toggleCamera');
const toggleMicButton = document.getElementById('toggleMic');

let localStream;
let peerConnection;
let isCameraEnabled = true; // Camera initial state
let isMicEnabled = true; // Microphone initial state
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }; // STUN server configuration

// Get media stream from the user's camera and microphone
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localStream = stream;
        localVideo.srcObject = stream;
    })
    .catch((error) => {
        console.error('Error accessing media devices:', error);
    });

// Start the video call
startCallButton.addEventListener('click', () => {
    peerConnection = new RTCPeerConnection(config);

    // Add local stream tracks to the peer connection
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream tracks
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('message', { type: 'candidate', candidate: event.candidate });
        }
    };

    // Create and send an offer to the other peer
    peerConnection.createOffer()
        .then((offer) => {
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            socket.emit('message', { type: 'offer', offer: peerConnection.localDescription });
        })
        .catch((error) => {
            console.error('Error creating offer:', error);
        });
});

// Toggle camera
toggleCameraButton.addEventListener('click', () => {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            isCameraEnabled = !isCameraEnabled;
            videoTrack.enabled = isCameraEnabled; // Enable or disable the camera
            toggleCameraButton.textContent = isCameraEnabled ? 'Turn Off Camera' : 'Turn On Camera';
        }
    }
});

// Toggle microphone
toggleMicButton.addEventListener('click', () => {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            isMicEnabled = !isMicEnabled;
            audioTrack.enabled = isMicEnabled; // Enable or disable the microphone
            toggleMicButton.textContent = isMicEnabled ? 'Turn Off Mic' : 'Turn On Mic';
        }
    }
});

// Handle signaling messages
socket.on('message', (message) => {
    if (message.type === 'offer') {
        // Handle received offer
        peerConnection = new RTCPeerConnection(config);

        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('message', { type: 'candidate', candidate: event.candidate });
            }
        };

        peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer))
            .then(() => {
                return peerConnection.createAnswer();
            })
            .then((answer) => {
                return peerConnection.setLocalDescription(answer);
            })
            .then(() => {
                socket.emit('message', { type: 'answer', answer: peerConnection.localDescription });
            })
            .catch((error) => {
                console.error('Error handling offer:', error);
            });
    } else if (message.type === 'answer') {
        // Handle received answer
        peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    } else if (message.type === 'candidate') {
        // Add received ICE candidate
        peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
});
