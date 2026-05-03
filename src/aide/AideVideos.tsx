import React, { useState } from 'react';
import { LuPlay, LuExternalLink, LuX } from 'react-icons/lu';
import { CATEGORIES, VIDEOS, type Video } from './aideVideosData';

function AideVideos(): React.JSX.Element {
  const [filtre, setFiltre] = useState('tous');
  const [videoActive, setVideoActive] = useState<Video | null>(null);

  const videosFiltrees = filtre === 'tous' ? VIDEOS : VIDEOS.filter(v => v.categorie === filtre);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 'calc(100vh - 60px)',
      padding: 0,
      overflow: 'auto',
    }}>
      {/* Header pleine largeur */}
      <div style={{
        padding: '28px 32px 20px',
        borderBottom: '1px solid #e5e7eb',
        background: '#fafbfc',
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#1a1a2e' }}>
          Aide & Tutoriels vidéo
        </h1>
        <p style={{ color: '#666', margin: '8px 0 0', fontSize: 14 }}>
          Apprenez la comptabilité SYSCOHADA avec des démos animées commentées
        </p>

        {/* Filtres catégories */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = filtre === cat.id;
            const count = cat.id === 'tous' ? VIDEOS.length : VIDEOS.filter(v => v.categorie === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setFiltre(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: isActive ? '2px solid #2563eb' : '1px solid #d1d5db',
                  background: isActive ? '#eff6ff' : '#fff',
                  color: isActive ? '#2563eb' : '#374151',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={15} />
                {cat.label}
                <span style={{
                  background: isActive ? '#2563eb' : '#e5e7eb',
                  color: isActive ? '#fff' : '#6b7280',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: 11,
                  fontWeight: 600,
                  marginLeft: 2,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu principal */}
      <div style={{ flex: 1, padding: '24px 32px' }}>
        {/* Lecteur vidéo embed pleine largeur */}
        {videoActive && (
          <div style={{
            marginBottom: 28,
            borderRadius: 12,
            overflow: 'hidden',
            background: '#000',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <button
              onClick={() => setVideoActive(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 10,
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <LuX size={18} />
            </button>
            {videoActive.youtubeId ? (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoActive.youtubeId}?autoplay=1`}
                  title={videoActive.titre}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                  }}
                />
              </div>
            ) : (
              <div style={{
                paddingBottom: '56.25%',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  gap: 12,
                }}>
                  <LuPlay size={56} />
                  <span style={{ fontSize: 18, fontWeight: 600 }}>{videoActive.titre}</span>
                  <span style={{ fontSize: 14 }}>Vidéo bientôt disponible</span>
                </div>
              </div>
            )}
            <div style={{
              padding: '14px 20px',
              background: '#111',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{videoActive.titre}</div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{videoActive.description}</div>
              </div>
              <span style={{
                background: '#333',
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 12,
                color: '#ccc',
                whiteSpace: 'nowrap',
              }}>
                {videoActive.duree}
              </span>
            </div>
          </div>
        )}

        {/* Grille vidéos pleine largeur */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20,
        }}>
          {videosFiltrees.map(video => {
            const catInfo = CATEGORIES.find(c => c.id === video.categorie);
            const isPlaying = videoActive?.id === video.id;
            return (
              <div
                key={video.id}
                onClick={() => setVideoActive(video)}
                style={{
                  borderRadius: 12,
                  border: isPlaying ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s, transform 0.15s',
                  background: '#fff',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLDivElement).style.transform = 'none';
                }}
              >
                {/* Miniature */}
                <div style={{
                  height: 170,
                  background: video.categorie === 'sig' ? 'linear-gradient(135deg, #1e40af, #3b82f6)'
                    : video.categorie === 'saisie' ? 'linear-gradient(135deg, #065f46, #10b981)'
                    : video.categorie === 'etats' ? 'linear-gradient(135deg, #7c2d12, #f97316)'
                    : video.categorie === 'fiscalite' ? 'linear-gradient(135deg, #581c87, #a855f7)'
                    : 'linear-gradient(135deg, #374151, #6b7280)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  position: 'relative',
                }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)',
                  }}>
                    <LuPlay size={28} style={{ marginLeft: 3 }} />
                  </div>
                  {isPlaying && (
                    <span style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: '#2563eb',
                      padding: '3px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                    }}>
                      En lecture
                    </span>
                  )}
                  <span style={{
                    position: 'absolute',
                    bottom: 10,
                    right: 10,
                    background: 'rgba(0,0,0,0.75)',
                    padding: '3px 10px',
                    borderRadius: 5,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {video.duree}
                  </span>
                </div>

                {/* Info */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#1a1a2e', marginBottom: 6, lineHeight: 1.3 }}>
                    {video.titre}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                    {video.description}
                  </div>
                  {catInfo && (
                    <div style={{
                      marginTop: 10,
                      display: 'inline-block',
                      padding: '3px 12px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      background: video.categorie === 'sig' ? '#dbeafe'
                        : video.categorie === 'saisie' ? '#d1fae5'
                        : video.categorie === 'etats' ? '#ffedd5'
                        : video.categorie === 'fiscalite' ? '#f3e8ff'
                        : '#f3f4f6',
                      color: video.categorie === 'sig' ? '#1e40af'
                        : video.categorie === 'saisie' ? '#065f46'
                        : video.categorie === 'etats' ? '#9a3412'
                        : video.categorie === 'fiscalite' ? '#6b21a8'
                        : '#374151',
                    }}>
                      {catInfo.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {videosFiltrees.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 60,
            color: '#9ca3af',
            fontSize: 15,
          }}>
            Aucune vidéo dans cette catégorie pour le moment.
          </div>
        )}

        {/* Lien chaîne YouTube — pleine largeur */}
        <div style={{
          marginTop: 36,
          padding: '20px 28px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, #dc2626, #ef4444)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>NORMX Finance — Chaîne YouTube</div>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
              Abonnez-vous pour ne manquer aucun tutoriel comptabilité SYSCOHADA
            </div>
          </div>
          <button
            onClick={() => {/* URL chaîne YouTube à ajouter */}}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 24px',
              borderRadius: 8,
              border: '2px solid #fff',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; }}
          >
            <LuExternalLink size={16} />
            Voir la chaîne
          </button>
        </div>
      </div>
    </div>
  );
}

export default AideVideos;
