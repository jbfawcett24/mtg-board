import { useEffect, useState } from "react";
import { css } from '@emotion/react'
import { colors } from "@mtg/shared";
import { socket } from './socket';


export default function SocketStatusIcon() {
  const [socketStatus, setSocketStatus] = useState('disconnected');

  const statusDotStyle = (connected) => css`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${connected ? colors.success : colors.error};
    display: inline-block;
  `;

  useEffect(() => {
    const handleConnect = () => setSocketStatus('connected');
    const handleDisconnect = () => setSocketStatus('disconnected');

    setSocketStatus(socket.connected ? 'connected' : 'disconnected');
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };

  }, [])

  return (
    <span css={statusDotStyle(socketStatus === 'connected')} />
  )
}
