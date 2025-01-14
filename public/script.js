const socket = io(); // Connect to the signaling server
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallButton = document.getElementById('startCall');
const toggleCameraButton = document.getElementById('toggleCamera');
const toggleMicButton = document.getElementById('toggleMic');

let localStream;
let peerConnection;
let isCameraEnabled = true;
let isMicEnabled = true;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Get media stream from the user's camera and microphone
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        console.log('Local stream:', stream); // ローカルストリームのログ
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
        console.log('Received remote stream:', event.streams[0]); // リモートストリームのログ
        remoteVideo.srcObject = event.streams[0];
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Sending ICE candidate:', event.candidate); // ICE候補送信ログ
            socket.emit('message', { type: 'candidate', candidate: event.candidate });
        }
    };

    // Create and send an offer
    peerConnection.createOffer()
        .then((offer) => {
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            console.log('Sending offer:', peerConnection.localDescription); // Offer送信ログ
            socket.emit('message', { type: 'offer', offer: peerConnection.localDescription });
        })
        .catch((error) => {
            console.error('Error creating offer:', error);
        });
});

// Handle signaling messages
socket.on('message', (message) => {
    console.log('Received message:', message); // メッセージ受信ログ
    if (message.type === 'offer') {
        console.log('Received offer:', message.offer); // Offer受信ログ
        peerConnection = new RTCPeerConnection(config);

        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
            console.log('Received remote stream:', event.streams[0]); // リモートストリームのログ
            remoteVideo.srcObject = event.streams[0];
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate:', event.candidate); // ICE候補送信ログ
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
                console.log('Sending answer:', peerConnection.localDescription); // Answer送信ログ
                socket.emit('message', { type: 'answer', answer: peerConnection.localDescription });
            })
            .catch((error) => {
                console.error('Error handling offer:', error);
            });
    } else if (message.type === 'answer') {
        console.log('Received answer:', message.answer); // Answer受信ログ
        peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    } else if (message.type === 'candidate') {
        console.log('Received ICE candidate:', message.candidate); // Candidate受信ログ
        peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate))
            .catch((error) => console.error('Error adding received ICE candidate:', error));
    }
});
