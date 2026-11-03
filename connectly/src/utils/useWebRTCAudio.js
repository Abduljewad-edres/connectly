import { useState, useRef, useEffect, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const useWebRTCAudio = ({ socket, spaceId, currentUser, role, isMuted, onSpeakerActive }) => {
  const [micAllowed, setMicAllowed] = useState(false);
  const [micError, setMicError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const remoteAudiosRef = useRef(new Map()); // socketId -> HTMLAudioElement

  // 1. Acquire Local Audio when in a speaking role (host, co_host, speaker)
  const initMicrophone = useCallback(async () => {
    if (!['host', 'co_host', 'speaker'].includes(role)) {
      // Listener does not need mic
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setMicAllowed(false);
      return null;
    }

    try {
      if (localStreamRef.current) {
        return localStreamRef.current;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      localStreamRef.current = stream;
      setMicAllowed(true);
      setMicError(null);

      // Set initial mute state on real audio track
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
      }

      // Setup audio level meter for speaking indication
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!analyserRef.current || isMuted) {
              setAudioLevel(0);
            } else {
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            }
            animFrameRef.current = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        }
      } catch (e) {
        // Audio meter optional
      }

      return stream;
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err.message);
      setMicAllowed(false);
      setMicError(err.message || 'Microphone access denied');
      return null;
    }
  }, [role, isMuted]);

  // Handle Mute / Unmute of physical audio track
  useEffect(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
      }
    }
  }, [isMuted]);

  // Clean up single peer
  const closePeer = useCallback((targetSocketId) => {
    const pc = peerConnectionsRef.current.get(targetSocketId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(targetSocketId);
    }
    const audioEl = remoteAudiosRef.current.get(targetSocketId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      remoteAudiosRef.current.delete(targetSocketId);
    }
  }, []);

  // Create Peer Connection
  const createPeerConnection = useCallback((targetSocketId) => {
    if (peerConnectionsRef.current.has(targetSocketId)) {
      return peerConnectionsRef.current.get(targetSocketId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(targetSocketId, pc);

    // Attach local audio track if speaking
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Send ICE candidates to remote peer via socket
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice_candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    // Receive remote audio stream and play genuinely
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      let audioEl = remoteAudiosRef.current.get(targetSocketId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.style.display = 'none';
        document.body.appendChild(audioEl);
        remoteAudiosRef.current.set(targetSocketId, audioEl);
      }
      audioEl.srcObject = remoteStream;
      audioEl.play().catch((e) => console.warn('Autoplay audio blocked:', e));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePeer(targetSocketId);
      }
    };

    return pc;
  }, [socket, closePeer]);

  // 2. Setup Socket Listeners for WebRTC signaling
  useEffect(() => {
    if (!socket || !spaceId) return;

    // Receive room peers list on join
    const handleRoomPeers = async (peers) => {
      if (!Array.isArray(peers)) return;
      const stream = await initMicrophone();

      for (const p of peers) {
        if (!p.socketId) continue;
        const pc = createPeerConnection(p.socketId);
        if (stream && ['host', 'co_host', 'speaker'].includes(role)) {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc:offer', {
              targetSocketId: p.socketId,
              offer,
              senderUser: currentUser,
              role
            });
          } catch (err) {
            console.error('Error creating WebRTC offer:', err);
          }
        }
      }
    };

    // Handle Incoming WebRTC Offer
    const handleIncomingOffer = async ({ senderSocketId, offer, senderUser, role: senderRole }) => {
      if (!senderSocketId || !offer) return;
      await initMicrophone();
      const pc = createPeerConnection(senderSocketId);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc:answer', {
          targetSocketId: senderSocketId,
          answer
        });
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    };

    // Handle Incoming WebRTC Answer
    const handleIncomingAnswer = async ({ senderSocketId, answer }) => {
      if (!senderSocketId || !answer) return;
      const pc = peerConnectionsRef.current.get(senderSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Error setting remote description:', err);
        }
      }
    };

    // Handle Incoming ICE Candidate
    const handleIncomingCandidate = async ({ senderSocketId, candidate }) => {
      if (!senderSocketId || !candidate) return;
      const pc = peerConnectionsRef.current.get(senderSocketId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    };

    // Handle Peer Left
    const handleUserLeft = ({ socketId }) => {
      if (socketId) {
        closePeer(socketId);
      }
    };

    socket.on('space:room_peers', handleRoomPeers);
    socket.on('webrtc:offer', handleIncomingOffer);
    socket.on('webrtc:answer', handleIncomingAnswer);
    socket.on('webrtc:ice_candidate', handleIncomingCandidate);
    socket.on('space:user_left', handleUserLeft);

    return () => {
      socket.off('space:room_peers', handleRoomPeers);
      socket.off('webrtc:offer', handleIncomingOffer);
      socket.off('webrtc:answer', handleIncomingAnswer);
      socket.off('webrtc:ice_candidate', handleIncomingCandidate);
      socket.off('space:user_left', handleUserLeft);
    };
  }, [socket, spaceId, role, currentUser, initMicrophone, createPeerConnection, closePeer]);

  // Cleanup on unmount or space exit
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      remoteAudiosRef.current.forEach((el) => {
        el.pause();
        el.srcObject = null;
        el.remove();
      });
      remoteAudiosRef.current.clear();
    };
  }, []);

  return {
    micAllowed,
    micError,
    audioLevel,
    initMicrophone
  };
};

