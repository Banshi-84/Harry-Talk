const socket = io('https://harry-talk.onrender.com'); // デプロイ済みURL
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallButton = document.getElementById('startCall');
const toggleCameraButton = document.getElementById('toggleCamera');
const toggleMicButton = document.getElementById('toggleMic');
const chatInput = document.getElementById('chat-input');
const sendMessageButton = document.getElementById('send-message');
const messagesContainer = document.getElementById('messages');

let localStream;
let peerConnection;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

let isCameraEnabled = true;
let isMicEnabled = true;

// Get media stream from the user's camera and microphone
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        console.log('Local stream:', stream); // ローカルストリームのログ
        localStream = stream;
        localVideo.srcObject = stream;
    })
    .catch((error) => {
        console.error('Error accessing media devices:', error); // デバイス取得エラー
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
            console.log('Creating offer:', offer); // オファー作成ログ
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            console.log('Sending offer to server:', peerConnection.localDescription); // オファー送信ログ
            socket.emit('message', { type: 'offer', offer: peerConnection.localDescription });
        })
        .catch((error) => {
            console.error('Error creating offer:', error); // オファー作成エラー
        });
});

// Toggle Camera
toggleCameraButton.addEventListener('click', () => {
    isCameraEnabled = !isCameraEnabled;
    localStream.getVideoTracks()[0].enabled = isCameraEnabled;
    toggleCameraButton.textContent = isCameraEnabled ? 'Turn Off Camera' : 'Turn On Camera';
    console.log('Camera state:', isCameraEnabled);
});

// Toggle Microphone
toggleMicButton.addEventListener('click', () => {
    isMicEnabled = !isMicEnabled;
    localStream.getAudioTracks()[0].enabled = isMicEnabled;
    toggleMicButton.textContent = isMicEnabled ? 'Mute Mic' : 'Unmute Mic';
    console.log('Mic state:', isMicEnabled);
});

// Chat message sending
sendMessageButton.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
        addMessage(`You: ${message}`);
        socket.emit('chat', message); // Send message to the server
        chatInput.value = '';
    }
});

// Display received chat messages
socket.on('chat', (message) => {
    addMessage(`Friend: ${message}`);
});

// Add message to chat UI
function addMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
}

// Handle signaling messages
socket.on('message', (message) => {
    console.log('Received message:', message); // シグナリングメッセージの受信ログ

    if (message.type === 'offer') {
        console.log('Received offer:', message.offer); // オファー受信ログ
        peerConnection = new RTCPeerConnection(config);

        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
            console.log('Received remote stream:', event.streams[0]); // リモートストリーム受信ログ
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
                console.log('Sending answer to server:', answer); // アンサー送信ログ
                return peerConnection.setLocalDescription(answer);
            })
            .then(() => {
                socket.emit('message', { type: 'answer', answer: peerConnection.localDescription });
            })
            .catch((error) => {
                console.error('Error handling offer:', error); // オファー処理エラー
            });
    } else if (message.type === 'answer') {
        console.log('Received answer:', message.answer); // アンサー受信ログ
        peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    } else if (message.type === 'candidate') {
        console.log('Received ICE candidate:', message.candidate); // ICE候補受信ログ
        peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate))
            .catch((error) => console.error('Error adding received ICE candidate:', error));
    }
});
