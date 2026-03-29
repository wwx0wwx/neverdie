import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AgentControlPlaneRecord, AgentNodeView } from '@neverdie/protocol';
import { pollAgent, withPollingFailure } from './lib';

export function useAgentPolling(agents: AgentControlPlaneRecord[], pollIntervalMs: number, staleAfterMs: number) {
  const [nodes, setNodes] = useState<AgentNodeView[]>(() => agents.map((controlPlane) => ({ controlPlane })));
  const [polling, setPolling] = useState(false);
  const nodesRef = useRef<AgentNodeView[]>(nodes);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    setNodes((current) => {
      const next = agents.map((controlPlane) => current.find((item) => item.controlPlane.baseUrl === controlPlane.baseUrl) ?? { controlPlane });
      return next;
    });
  }, [agents]);

  const refreshAll = useCallback(async () => {
    setPolling(true);
    try {
      const results = await Promise.all(
        agents.map(async (controlPlane) => {
          const existingNode = nodesRef.current.find((item) => item.controlPlane.baseUrl === controlPlane.baseUrl) ?? { controlPlane };
          try {
            const bundle = await pollAgent(controlPlane.baseUrl, staleAfterMs);
            return {
              controlPlane,
              ...bundle,
            } satisfies AgentNodeView;
          } catch (error) {
            return withPollingFailure(existingNode, error);
          }
        }),
      );

      setNodes(results);
    } finally {
      setPolling(false);
    }
  }, [agents, staleAfterMs]);

  useEffect(() => {
    void refreshAll();
    const timer = window.setInterval(() => {
      void refreshAll();
    }, pollIntervalMs);

    return () => window.clearInterval(timer);
  }, [pollIntervalMs, refreshAll]);

  return useMemo(
    () => ({
      nodes,
      polling,
      refreshAll,
    }),
    [nodes, polling, refreshAll],
  );
}

