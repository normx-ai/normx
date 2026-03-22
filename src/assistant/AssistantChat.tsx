import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LuSend, LuMessageSquare, LuPlus, LuTrash2, LuBrain } from 'react-icons/lu';
import { TypeActivite } from '../types';
import './AssistantChat.css';

// ---- Local interfaces ----

interface ArticleRef {
  numero: string;
  titre: string;
}

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  refs: ArticleRef[];
}

interface ConversationItem {
  id: number;
  titre: string;
  updated_at: string;
}

interface MemoryItem {
  id: number;
  cle: string;
  valeur: string;
}

interface ChatApiResponse {
  response: string;
  conversationId: number;
  articles_references: ArticleRef[];
}

interface ChatErrorResponse {
  error: string;
}

interface MessageRow {
  role: 'user' | 'assistant';
  content: string;
  articles_refs: ArticleRef[];
}

interface AssistantChatProps {
  userName: string;
  userId: number;
  typeActivite: TypeActivite;
}

const SUGGESTIONS_SYSCOHADA: string[] = [
  "Comment fonctionne le compte 101 Capital social ?",
  "Quand debiter et crediter le compte 40 Fournisseurs ?",
  "Comment calculer la CAFG pour le TFT ?",
  "Le tableau des flux de tresorerie SYSCOHADA",
  "Les notes annexes obligatoires SYSCOHADA",
  "Comment comptabiliser une subvention d'investissement ?",
];

const SUGGESTIONS_SYCEBNL: string[] = [
  "Qu'est-ce que le SYCEBNL ?",
  "Comment presenter le bilan d'une association ?",
  "Quels sont les etats financiers SYCEBNL ?",
  "Le tableau des flux de tresorerie",
  "Les notes annexes obligatoires",
  "Difference SYSCOHADA et SYCEBNL",
];

const SUGGESTIONS_SMT: string[] = [
  "Qu'est-ce que le Systeme Minimal de Tresorerie ?",
  "Quels sont les seuils du SMT (negoce, artisanal, services) ?",
  "Comment tenir le journal unique de tresorerie ?",
  "Le bilan et le compte de resultat SMT",
  "L'inventaire extra-comptable de fin d'exercice",
  "Comment passer du SMT au systeme normal ?",
];

const SUGGESTIONS_PROJET: string[] = [
  "Comment fonctionne le Tableau Emplois-Ressources ?",
  "Qu'est-ce que la neutralisation des charges via le compte 702 ?",
  "Les fonds affectes aux investissements (comptes 162-164)",
  "Pourquoi pas d'amortissement dans un projet (§2256) ?",
  "Comment presenter l'execution budgetaire d'un projet ?",
  "La reconciliation de tresorerie d'un projet",
];

function AssistantChat({ userName, userId, typeActivite }: AssistantChatProps): React.ReactElement {
  const userInitial: string = userName ? userName.charAt(0).toUpperCase() : 'U';
  const SUGGESTIONS: string[] = typeActivite === 'entreprise' ? SUGGESTIONS_SYSCOHADA
    : typeActivite === 'smt' ? SUGGESTIONS_SMT
    : typeActivite === 'projet_developpement' ? SUGGESTIONS_PROJET
    : SUGGESTIONS_SYCEBNL;

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [memory, setMemory] = useState<MemoryItem[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations list
  const loadConversations = useCallback(async (): Promise<void> => {
    if (!userId) return;
    try {
      const res: Response = await fetch('/api/assistant/conversations/' + userId);
      if (res.ok) {
        const data: ConversationItem[] = await res.json();
        setConversations(data);
      }
    } catch (_err) {
      // network error
    }
  }, [userId]);

  // Load memory
  const loadMemory = useCallback(async (): Promise<void> => {
    if (!userId) return;
    try {
      const res: Response = await fetch('/api/assistant/memory/' + userId);
      if (res.ok) {
        const data: MemoryItem[] = await res.json();
        setMemory(data);
      }
    } catch (_err) {
      // network error
    }
  }, [userId]);

  useEffect(() => {
    loadConversations();
    loadMemory();
  }, [loadConversations, loadMemory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load messages for a conversation
  const openConversation = async (convId: number): Promise<void> => {
    setActiveConvId(convId);
    try {
      const res: Response = await fetch('/api/assistant/conversations/' + convId + '/messages');
      if (res.ok) {
        const data: MessageRow[] = await res.json();
        setMessages(data.map((m: MessageRow) => ({
          role: m.role,
          content: m.content,
          refs: m.articles_refs || [],
        })));
      }
    } catch (_err) {
      // network error
    }
  };

  // New conversation
  const newConversation = (): void => {
    setActiveConvId(null);
    setMessages([]);
  };

  // Delete conversation
  const deleteConversation = async (e: React.MouseEvent<HTMLButtonElement>, convId: number): Promise<void> => {
    e.stopPropagation();
    try {
      await fetch('/api/assistant/conversations/' + convId, { method: 'DELETE' });
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
      loadConversations();
    } catch (_err) {
      // network error
    }
  };

  // Delete memory item
  const deleteMemoryItem = async (id: number): Promise<void> => {
    try {
      await fetch('/api/assistant/memory/' + id, { method: 'DELETE' });
      loadMemory();
    } catch (_err) {
      // network error
    }
  };

  // Send message
  const sendMessage = async (text?: string): Promise<void> => {
    const userMessage: string = text || input.trim();
    if (!userMessage || loading) return;

    const newMessages: DisplayMessage[] = [...messages, { role: 'user', content: userMessage, refs: [] }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }

    try {
      const res: Response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId: activeConvId,
          userId: userId,
          typeActivite: typeActivite,
        }),
      });

      if (!res.ok) {
        const err: ChatErrorResponse = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }

      const data: ChatApiResponse = await res.json();

      // Update active conversation ID (for new conversations)
      if (data.conversationId && !activeConvId) {
        setActiveConvId(data.conversationId);
      }

      setMessages((prev: DisplayMessage[]) => [...prev, {
        role: 'assistant',
        content: data.response,
        refs: data.articles_references || [],
      }]);

      // Refresh conversations list and memory
      loadConversations();
      loadMemory();
    } catch (err) {
      const errorMessage: string = err instanceof Error ? err.message : 'Erreur inconnue';
      setMessages((prev: DisplayMessage[]) => [...prev, {
        role: 'assistant',
        content: 'Erreur : ' + errorMessage,
        refs: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setInput(e.target.value);
    e.target.style.height = '44px';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const formatDate = (dateStr: string): string => {
    const d: Date = new Date(dateStr);
    const now: Date = new Date();
    const diff: number = now.getTime() - d.getTime();
    if (diff < 86400000) return "Aujourd'hui";
    if (diff < 172800000) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="assistant-layout">
      {/* History Panel */}
      <div className="chat-history-panel">
        <div className="chat-history-header">
          <h3>Conversations</h3>
          <button className="new-chat-btn" onClick={newConversation}>
            <LuPlus /> Nouveau
          </button>
        </div>

        <div className="chat-history-list">
          {conversations.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: '#999', textAlign: 'center' }}>
              Aucune conversation
            </div>
          )}
          {conversations.map((conv: ConversationItem) => (
            <div
              key={conv.id}
              className={'chat-history-item' + (activeConvId === conv.id ? ' active' : '')}
              onClick={() => openConversation(conv.id)}
            >
              <span className="chat-history-item-title">{conv.titre}</span>
              <span className="chat-history-item-date">{formatDate(conv.updated_at)}</span>
              <button
                className="chat-history-delete"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => deleteConversation(e, conv.id)}
                title="Supprimer"
              >
                <LuTrash2 />
              </button>
            </div>
          ))}
        </div>

        {/* Memory Section */}
        <div className="chat-memory-section">
          <h4><LuBrain style={{ verticalAlign: 'middle', marginRight: 4 }} /> Memoire</h4>
          {memory.length === 0 ? (
            <div className="memory-empty">Aucune memoire enregistree</div>
          ) : (
            memory.map((m: MemoryItem) => (
              <div key={m.id} className="memory-item">
                <div className="memory-item-text">
                  <span className="memory-item-key">{m.cle}</span> : {m.valeur}
                </div>
                <button className="memory-delete-btn" onClick={() => deleteMemoryItem(m.id)} title="Supprimer">
                  <LuTrash2 />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="assistant-container">
        <div className="assistant-header">
          <h2>Assistant IA {typeActivite === 'entreprise' ? 'SYSCOHADA' : typeActivite === 'smt' ? 'SMT' : typeActivite === 'projet_developpement' ? 'Projets' : 'SYCEBNL'}</h2>
          <p>Posez vos questions sur les normes comptables {typeActivite === 'entreprise' ? 'SYSCOHADA' : typeActivite === 'smt' ? 'SMT' : typeActivite === 'projet_developpement' ? 'des projets de développement' : 'SYCEBNL'}. Dites "retiens que..." pour memoriser des informations.</p>
        </div>

        {messages.length === 0 && !loading ? (
          <div className="chat-welcome">
            <div className="chat-welcome-icon"><LuMessageSquare /></div>
            <h3>Comment puis-je vous aider ?</h3>
            <p>
              Je suis specialise dans le {typeActivite === 'entreprise' ? 'SYSCOHADA' : typeActivite === 'smt' ? 'SMT' : typeActivite === 'projet_developpement' ? 'SYCEBNL (projets)' : 'SYCEBNL'}. Je peux aussi memoriser des informations
              pour vos prochaines conversations.
            </p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s: string, i: number) => (
                <button key={i} className="chat-suggestion-btn" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-messages">
            {messages.map((msg: DisplayMessage, i: number) => (
              <div key={i} className={'chat-message ' + msg.role}>
                <div className={'chat-avatar ' + (msg.role === 'user' ? 'user-avatar-chat' : 'bot-avatar')}>
                  {msg.role === 'user' ? userInitial : <LuMessageSquare />}
                </div>
                <div>
                  <div className="chat-bubble">{msg.content}</div>
                  {msg.refs && msg.refs.length > 0 && (
                    <div className="chat-refs">
                      <div className="chat-refs-title">Articles references</div>
                      {msg.refs.map((ref: ArticleRef, j: number) => (
                        <span key={j} className="chat-ref-tag">
                          {ref.numero} — {ref.titre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message assistant">
                <div className="chat-avatar bot-avatar"><LuMessageSquare /></div>
                <div className="chat-bubble">
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="chat-input-area">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={`Posez votre question sur le ${typeActivite === 'entreprise' ? 'SYSCOHADA' : typeActivite === 'smt' ? 'SMT' : 'SYCEBNL'}...`}
            rows={1}
          />
          <button
            className="chat-send-btn"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            <LuSend /> Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssistantChat;
