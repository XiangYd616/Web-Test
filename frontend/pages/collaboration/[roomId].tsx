/**
 * 协作房间页面
 * 路径: frontend/pages/collaboration/[roomId].tsx
 */

import { useAuth } from '@/contexts/AuthContext';
import Logger from '@/utils/logger';
import { createWebSocketManager } from '@/utils/websocketManager';
import { Badge, Button, Card, Col, Layout, Row, Space, Tooltip, Typography } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

const { Content } = Layout;
const { Title, Text } = Typography;

type CursorSelection = {
  start: { line: number; column: number };
  end: { line: number; column: number };
};

type CursorPosition = {
  line: number;
  column: number;
  selection?: CursorSelection;
};

type Participant = {
  id: string;
  userId: string;
  username: string;
  color?: string;
  cursor?: CursorPosition;
};

type DocumentPayload = {
  documentId: string;
  content: string;
  version: number;
};

type PendingChange = {
  content: string;
};

type CollaborationMessage = {
  type: string;
  data?: Record<string, unknown>;
  participant?: Participant;
  participants?: Participant[];
  document?: DocumentPayload;
};

const buildWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/collaboration`;
};

const parseIndexToPosition = (content: string, index: number) => {
  const safeIndex = Math.max(0, Math.min(index, content.length));
  const before = content.slice(0, safeIndex);
  const lines = before.split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1]?.length ?? 0;
  return { line, column };
};

const CollaborationRoom: React.FC = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'disconnected' | 'reconnecting'
  >('disconnected');
  const [pendingCount, setPendingCount] = useState(0);
  const managerRef = useRef<ReturnType<typeof createWebSocketManager> | null>(null);
  const localParticipantIdRef = useRef<string | null>(null);
  const pendingChangesRef = useRef<PendingChange[]>([]);
  const lastContentRef = useRef('');

  const currentUser = useMemo(() => {
    return {
      userId: user?.id || 'guest',
      username: user?.username || user?.email || '访客',
    };
  }, [user]);

  const flushPendingChanges = useCallback(() => {
    if (!managerRef.current || !managerRef.current.isConnected()) {
      return;
    }
    const queue = [...pendingChangesRef.current];
    pendingChangesRef.current = [];
    setPendingCount(0);

    let baseContent = lastContentRef.current;
    queue.forEach(change => {
      managerRef.current
        ?.send('update_document', {
          documentId: roomId,
          changes: [
            {
              type: 'replace',
              position: 0,
              length: baseContent.length,
              content: change.content,
              userId: currentUser.userId,
            },
          ],
        })
        .catch(error => Logger.error('同步变更失败:', error));
      baseContent = change.content;
    });
    lastContentRef.current = baseContent;
  }, [currentUser.userId, roomId]);

  const sendJoin = useCallback(() => {
    if (!managerRef.current || !roomId) {
      return;
    }
    managerRef.current
      .send('join_room', {
        roomId,
        participantId: localParticipantIdRef.current,
        participant: {
          userId: currentUser.userId,
          username: currentUser.username,
          role: 'editor',
          status: 'online',
          permissions: [{ action: 'write', granted: true }],
        },
      })
      .catch(error => Logger.error('加入房间失败:', error));
  }, [currentUser.userId, currentUser.username, roomId]);

  const requestSync = useCallback(() => {
    if (!managerRef.current || !roomId) {
      return;
    }
    managerRef.current
      .send('sync_document', { roomId })
      .catch(error => Logger.error('同步文档失败:', error));
  }, [roomId]);

  const handleIncomingMessage = useCallback(
    (raw: CollaborationMessage) => {
      switch (raw.type) {
        case 'joined': {
          if (raw.participant?.id) {
            localParticipantIdRef.current = raw.participant.id;
            localStorage.setItem(`collab:${roomId}:participantId`, raw.participant.id);
          }
          if (Array.isArray(raw.participants)) {
            setParticipants(raw.participants);
          }
          if (raw.document?.content !== undefined) {
            lastContentRef.current = raw.document.content;
            setContent(raw.document.content);
          }
          break;
        }
        case 'participant_joined': {
          const data = raw.data as Participant | undefined;
          if (data?.id) {
            setParticipants(prev => {
              if (prev.find(item => item.id === data.id)) {
                return prev;
              }
              return [...prev, data];
            });
          }
          break;
        }
        case 'participant_left': {
          const data = raw.data as { participantId?: string } | undefined;
          if (data?.participantId) {
            setParticipants(prev => prev.filter(item => item.id !== data.participantId));
          }
          break;
        }
        case 'document_sync': {
          const data = raw.data as DocumentPayload | undefined;
          if (!data) return;
          lastContentRef.current = data.content;
          if (pendingChangesRef.current.length === 0) {
            setContent(data.content);
          } else {
            const latest = pendingChangesRef.current[pendingChangesRef.current.length - 1];
            setContent(latest.content);
          }
          flushPendingChanges();
          break;
        }
        case 'document_updated': {
          const data = raw.data as { content?: string; userId?: string } | undefined;
          if (!data?.content) return;
          if (data.userId && data.userId === currentUser.userId) {
            lastContentRef.current = data.content;
            return;
          }
          lastContentRef.current = data.content;
          setContent(data.content);
          break;
        }
        case 'cursor_moved': {
          const data = raw.data as
            | { participantId?: string; cursor?: CursorPosition; color?: string; username?: string }
            | undefined;
          if (!data?.participantId) return;
          setParticipants(prev =>
            prev.map(item =>
              item.id === data.participantId
                ? {
                    ...item,
                    cursor: data.cursor,
                    color: data.color || item.color,
                    username: data.username || item.username,
                  }
                : item
            )
          );
          break;
        }
        default:
          break;
      }
    },
    [currentUser.userId, flushPendingChanges, roomId]
  );

  useEffect(() => {
    if (!roomId) {
      return;
    }
    const manager = createWebSocketManager({
      url: buildWsUrl(),
      reconnectAttempts: 8,
      reconnectIntervalRange: [5000, 15000],
      heartbeatInterval: 15000,
    });

    managerRef.current = manager;
    localParticipantIdRef.current = localStorage.getItem(`collab:${roomId}:participantId`);

    const handleConnected = () => {
      setConnectionStatus('connected');
      sendJoin();
      requestSync();
    };
    const handleConnecting = () => setConnectionStatus('connecting');
    const handleDisconnected = () => setConnectionStatus('disconnected');
    const handleReconnecting = () => setConnectionStatus('reconnecting');
    const handleMessage = (event: unknown) => {
      const message = event as { type?: string; data?: unknown } | undefined;
      if (!message?.type) return;
      handleIncomingMessage(message as CollaborationMessage);
    };

    manager.on('connected', handleConnected);
    manager.on('connecting', handleConnecting);
    manager.on('disconnected', handleDisconnected);
    manager.on('reconnecting', handleReconnecting);
    manager.on('message', handleMessage);

    manager.connect().catch(error => Logger.error('协作连接失败:', error));

    return () => {
      manager.off('connected', handleConnected);
      manager.off('connecting', handleConnecting);
      manager.off('disconnected', handleDisconnected);
      manager.off('reconnecting', handleReconnecting);
      manager.off('message', handleMessage);
      manager.destroy();
    };
  }, [handleIncomingMessage, requestSync, roomId, sendJoin]);

  const handleContentChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = event.target.value;
      setContent(newContent);
      lastContentRef.current = newContent;

      const change: PendingChange = { content: newContent };
      if (!managerRef.current || !managerRef.current.isConnected()) {
        pendingChangesRef.current.push(change);
        setPendingCount(pendingChangesRef.current.length);
        return;
      }

      managerRef.current
        .send('update_document', {
          documentId: roomId,
          changes: [
            {
              type: 'replace',
              position: 0,
              length: newContent.length,
              content: newContent,
              userId: currentUser.userId,
            },
          ],
        })
        .catch(error => {
          Logger.error('发送变更失败:', error);
          pendingChangesRef.current.push(change);
          setPendingCount(pendingChangesRef.current.length);
        });
    },
    [currentUser.userId, roomId]
  );

  const handleSelectionChange = useCallback(
    (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
      if (!managerRef.current || !managerRef.current.isConnected()) {
        return;
      }
      const target = event.target as HTMLTextAreaElement;
      const start = target.selectionStart ?? 0;
      const end = target.selectionEnd ?? start;
      const startPosition = parseIndexToPosition(content, start);
      const endPosition = parseIndexToPosition(content, end);
      const cursor: CursorPosition = {
        line: startPosition.line,
        column: startPosition.column,
        selection: {
          start: startPosition,
          end: endPosition,
        },
      };
      managerRef.current
        .send('update_cursor', { cursor })
        .catch(error => Logger.error('发送光标失败:', error));
    },
    [content]
  );

  const statusBadge = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge status="success" text="已连接" />;
      case 'reconnecting':
        return <Badge status="processing" text="重连中" />;
      case 'connecting':
        return <Badge status="processing" text="连接中" />;
      default:
        return <Badge status="error" text="已断开" />;
    }
  }, [connectionStatus]);

  const remoteParticipants = participants.filter(p => p.userId !== currentUser.userId);

  return (
    <Layout className="min-h-screen bg-slate-950">
      <Content className="px-6 py-6">
        <Row gutter={[16, 16]}>
          <Col span={18}>
            <Card className="bg-slate-900 border border-slate-800">
              <Space direction="vertical" size={12} className="w-full">
                <Space align="center" className="w-full justify-between">
                  <div>
                    <Title level={3} className="!text-slate-100 !mb-1">
                      协作房间 · {roomId}
                    </Title>
                    <Text className="text-slate-400">断线自动恢复，重连后同步最新内容</Text>
                  </div>
                  <Space>
                    {statusBadge}
                    {pendingCount > 0 && <Badge count={pendingCount} title="待同步变更" />}
                    <Button onClick={requestSync}>手动同步</Button>
                  </Space>
                </Space>
                <textarea
                  className="w-full h-[520px] bg-slate-950 text-slate-100 border border-slate-700 rounded-lg p-4 font-mono text-sm focus:outline-none focus:border-blue-500"
                  value={content}
                  onChange={handleContentChange}
                  onSelect={handleSelectionChange}
                  onKeyUp={handleSelectionChange}
                  onMouseUp={handleSelectionChange}
                  placeholder="开始协作编辑..."
                />
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="bg-slate-900 border border-slate-800">
              <Space direction="vertical" size={16} className="w-full">
                <div>
                  <Text className="text-slate-400">参与者</Text>
                  <Title level={4} className="!text-slate-100 !mb-0">
                    {participants.length}
                  </Title>
                </div>
                <Space direction="vertical" size={10} className="w-full">
                  {participants.map(participant => {
                    const isSelf = participant.userId === currentUser.userId;
                    const cursorInfo = participant.cursor
                      ? `L${participant.cursor.line} · C${participant.cursor.column}`
                      : '未定位';
                    return (
                      <Tooltip
                        key={participant.id}
                        title={`${participant.username} · ${cursorInfo}`}
                        placement="left"
                      >
                        <div className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 bg-slate-950">
                          <Space>
                            <span
                              className="inline-flex h-3 w-3 rounded-full"
                              style={{ backgroundColor: participant.color || '#94A3B8' }}
                            />
                            <Text className="text-slate-200">
                              {participant.username}
                              {isSelf ? '（我）' : ''}
                            </Text>
                          </Space>
                          <Text className="text-slate-500 text-xs">{cursorInfo}</Text>
                        </div>
                      </Tooltip>
                    );
                  })}
                  {participants.length === 0 && <Text className="text-slate-500">暂无参与者</Text>}
                </Space>
                <div className="border-t border-slate-800 pt-4">
                  <Text className="text-slate-400">远程光标</Text>
                  <Space direction="vertical" size={8} className="w-full mt-2">
                    {remoteParticipants.map(participant => (
                      <Tooltip
                        key={`cursor-${participant.id}`}
                        title={participant.username}
                        placement="left"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="inline-flex h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: participant.color || '#94A3B8' }}
                          />
                          <Text className="text-slate-400 text-xs">
                            {participant.cursor
                              ? `L${participant.cursor.line} · C${participant.cursor.column}`
                              : '未定位'}
                          </Text>
                        </div>
                      </Tooltip>
                    ))}
                    {remoteParticipants.length === 0 && (
                      <Text className="text-slate-500 text-xs">暂无远程光标</Text>
                    )}
                  </Space>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default CollaborationRoom;
