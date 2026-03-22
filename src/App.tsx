import React, { useState, useCallback } from 'react';
import LoginEmail from './auth/LoginEmail';
import LoginPassword from './auth/LoginPassword';
import Register from './auth/Register';
import VerifyOtp from './auth/VerifyOtp';
import Dashboard from './dashboard/Dashboard';
import Toast from './components/Toast';
import type { User, Entite, ToastData, ToastType } from './types';
import './App.css';

type Step = 'email' | 'password' | 'register' | 'verify-otp' | 'dashboard';
type OtpSource = 'login' | 'register' | '';

function App(): React.JSX.Element {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [entites, setEntites] = useState<Entite[]>([]);
  const [currentEntite, setCurrentEntite] = useState<Entite | null>(null);
  const [otpSource, setOtpSource] = useState<OtpSource>('');
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success'): void => {
    setToast({ message, type });
  }, []);

  const closeToast = useCallback((): void => {
    setToast(null);
  }, []);

  const handleEmailNext = (emailValue: string): void => {
    setEmail(emailValue);
    setStep('password');
  };

  const isDev: boolean = process.env.NODE_ENV === 'development';

  const handleLoginOtp = (userData: User, otp: string, entitesList?: Entite[]): void => {
    setUser(userData);
    if (entitesList && entitesList.length > 0) {
      setEntites(entitesList);
      setCurrentEntite(entitesList[0]);
    }
    if (isDev) {
      showToast('Connexion réussie.');
      setStep('dashboard');
    } else {
      setOtpCode(otp);
      setOtpSource('login');
      setStep('verify-otp');
    }
  };

  const handleRegistered = (registeredEmail: string, otp: string, userData: User | null): void => {
    setEmail(registeredEmail);
    if (isDev) {
      if (userData) {
        setUser(userData);
        const ent: Entite = {
          id: userData.entite_id,
          nom: userData.entite,
          type_activite: userData.type_activite,
          offre: userData.offre,
          modules: userData.modules || ['compta', 'etats', 'paie'],
        };
        setEntites([ent]);
        setCurrentEntite(ent);
      }
      showToast('Entité et compte créés avec succès.');
      setStep('dashboard');
    } else {
      setOtpCode(otp);
      setOtpSource('register');
      setStep('verify-otp');
      showToast('Entité et compte administrateur créés avec succès.');
    }
  };

  const handleOtpVerified = (): void => {
    if (otpSource === 'login') {
      showToast('Connexion réussie.');
      setStep('dashboard');
    } else {
      showToast('Identité vérifiée avec succès.');
      setStep('password');
    }
  };

  const handleLogout = (): void => {
    setStep('email');
    setEmail('');
    setUser(null);
    setEntites([]);
    setCurrentEntite(null);
    setOtpCode('');
    setOtpSource('');
    showToast('Déconnexion réussie.', 'info');
  };

  const handleSwitchEntite = (entite: Entite): void => {
    setCurrentEntite(entite);
  };

  const handleEntiteCreated = (entite: Entite): void => {
    setEntites(prev => [...prev, entite]);
  };

  const handleEntiteUpdated = (entite: Entite): void => {
    setEntites(prev => prev.map(e => e.id === entite.id ? entite : e));
    if (currentEntite && currentEntite.id === entite.id) {
      setCurrentEntite(entite);
    }
  };

  const handleEntiteDeleted = (id: number): void => {
    setEntites(prev => prev.filter(e => e.id !== id));
    if (currentEntite && currentEntite.id === id) {
      setCurrentEntite(entites.find(e => e.id !== id) || null);
    }
  };

  const isCabinet: boolean = user ? (user.cabinet_nom || '') !== (currentEntite?.nom || '') || entites.length > 1 : false;

  const ent: Entite | null = currentEntite;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      {(() => {
        switch (step) {
          case 'email':
            return <LoginEmail onNext={handleEmailNext} onRegister={() => setStep('register')} />;
          case 'password':
            return <LoginPassword email={email} onNext={handleLoginOtp} onBack={() => setStep('email')} />;
          case 'register':
            return <Register onBack={() => setStep('email')} onRegistered={handleRegistered} />;
          case 'verify-otp':
            return <VerifyOtp email={email} otpCode={otpCode} onVerified={handleOtpVerified} />;
          case 'dashboard':
            return (
              <Dashboard
                userName={user ? `${user.prenom} ${user.nom}` : 'Utilisateur'}
                cabinetName={user ? user.cabinet_nom || '' : ''}
                cabinetId={user ? user.cabinet_id || 0 : 0}
                isCabinet={isCabinet}
                entiteName={ent ? ent.nom : 'Mon Entité'}
                entiteId={ent ? ent.id : 0}
                userId={user ? user.id : 0}
                typeActivite={ent ? ent.type_activite : 'association'}
                offre={ent ? ent.offre || 'comptabilite' : 'comptabilite'}
                modules={ent ? ent.modules || [] : []}
                entiteSigle={ent ? ent.sigle || '' : ''}
                entiteAdresse={ent ? ent.adresse || '' : ''}
                entiteNif={ent ? ent.nif || '' : ''}
                entites={entites}
                onSwitchEntite={handleSwitchEntite}
                onEntiteCreated={handleEntiteCreated}
                onEntiteUpdated={handleEntiteUpdated}
                onEntiteDeleted={handleEntiteDeleted}
                onLogout={handleLogout}
              />
            );
          default:
            return <LoginEmail onNext={handleEmailNext} onRegister={() => setStep('register')} />;
        }
      })()}
    </>
  );
}

export default App;
